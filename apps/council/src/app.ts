import { Express } from "express";
import { councilRouter } from "./council/router";
import { MintExpressProps, MintService } from "@otm/service";
import Council from "./council/Council";
import * as consts from "./consts";
import { getCouncilKafka } from "./messaging/councilKafka";
import { topics } from "@otm/kafka";
import {
  IncomingCouncilMessage,
  ResponseSavedMessage,
  PromptStatusChangedMessage,
} from "./messaging/CouncilTopics";
import { PromptStatus } from "./types/Council";
import { EventEmitter } from "stream";
import { CouncilStorage } from "./storage/CouncilStorage";
import { CouncilEmits } from "./types/Council";
import {
  ONE_SECOND,
  startMemoryMonitoring,
  logMemoryUsage,
  checkMemoryThresholds,
  getMemoryStats,
  bytesToMB
} from "@otm/utils";
import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "council-app" });

export async function createCouncilApp(): Promise<Express> {
  const appProps: MintExpressProps = {
    serviceName: consts.SERVICE_NAME,
  };

  const app = MintService(appProps);

  const council = await Council.createCouncil();

  app.locals.council = council;

  interface QueuedPrompt {
    id: string;
    prompt: string;
    discussionTimeMs?: number;
  }

  let promptQueue: QueuedPrompt[] = [];
  let councilEmitter = new EventEmitter();
  let droppedPrompts = 0;

  async function newPromptHandler(_: string, message: IncomingCouncilMessage) {
    logger.info("Received message", { prompt: message.prompt });

    // Check queue size limit
    if (promptQueue.length >= consts.MAX_QUEUE_SIZE) {
      droppedPrompts++;
      logger.warn("Queue is full, dropping prompt", {
        queueSize: promptQueue.length,
        maxSize: consts.MAX_QUEUE_SIZE,
        totalDropped: droppedPrompts,
      });
      return;
    }

    // Warn if approaching limit
    if (promptQueue.length >= consts.QUEUE_WARNING_THRESHOLD) {
      logger.warn("Queue approaching capacity", {
        queueSize: promptQueue.length,
        maxSize: consts.MAX_QUEUE_SIZE,
        percentFull: Math.round((promptQueue.length / consts.MAX_QUEUE_SIZE) * 100),
      });
    }

    // Save prompt to database with PENDING status
    const storage = await CouncilStorage.getInstance();
    const promptId = await storage.createPrompt(message.prompt, message.discussionTimeMs);

    // Broadcast prompt created status
    const statusMessage: PromptStatusChangedMessage = {
      id: promptId,
      prompt: message.prompt,
      status: PromptStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await councilKafka.publish(topics.council.statusChanged, statusMessage);

    // Add to queue
    promptQueue.push({
      id: promptId,
      prompt: message.prompt,
      discussionTimeMs: message.discussionTimeMs,
    });

    councilEmitter.emit(String(CouncilEmits.NEW_PROMPT));
  }

  const councilKafka = await getCouncilKafka();
  await councilKafka.subscribe(topics.council.queue, newPromptHandler);

  async function voteLoop() {
    const storage = await CouncilStorage.getInstance();
    let errorCount = 0;
    const MAX_ERRORS = 5;

    while (true) {
      try {
        // Memory optimization: Check memory before processing
        const memCheck = checkMemoryThresholds();
        if (!memCheck.withinLimits) {
          logger.warn("Memory limits exceeded, pausing to allow GC", {
            pauseDuration_ms: 30000,
          });
          await new Promise(resolve => setTimeout(resolve, 30000));

          // Force GC if available
          if (global.gc) {
            logger.info("Running garbage collection");
            global.gc();
          }
          continue;
        }

        if (promptQueue.length === 0) {
          await new Promise((resolve) =>
            councilEmitter.once(String(CouncilEmits.NEW_PROMPT), resolve),
          );
        }

        const queuedPrompt = promptQueue.shift()!;
        logger.info("Processing prompt", {
          prompt: queuedPrompt.prompt,
          queueSize: promptQueue.length,
        });

        // Feature 3: Check for cached response first (deduplication)
        const cachedResponse = await storage.findCachedResponse(queuedPrompt.prompt);

        let answer: string;
        let processingTimeMs: number;
        let finalStatus: PromptStatus;

        if (cachedResponse) {
          logger.info("Found cached response for prompt", {
            prompt: queuedPrompt.prompt,
          });
          answer = cachedResponse.answer;
          processingTimeMs = 0; // No processing needed
          finalStatus = PromptStatus.CACHED;

          // Update the current prompt to CACHED status
          await storage.updatePromptStatus(
            queuedPrompt.id,
            PromptStatus.CACHED,
            answer,
            processingTimeMs
          );

          // Broadcast cached status
          const cachedMessage: PromptStatusChangedMessage = {
            id: queuedPrompt.id,
            prompt: queuedPrompt.prompt,
            status: PromptStatus.CACHED,
            answer,
            processingTimeMs,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await councilKafka.publish(topics.council.statusChanged, cachedMessage);

        } else {
          // Update status to PROCESSING
          await storage.updatePromptStatus(queuedPrompt.id, PromptStatus.PROCESSING);

          // Broadcast processing status
          const processingMessage: PromptStatusChangedMessage = {
            id: queuedPrompt.id,
            prompt: queuedPrompt.prompt,
            status: PromptStatus.PROCESSING,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await councilKafka.publish(topics.council.statusChanged, processingMessage);

          // Log memory before voting
          const memBefore = getMemoryStats();
          const startTime = Date.now();

          // Feature 1: Pass discussionTimeMs to vote
          answer = await council.vote(queuedPrompt.prompt, queuedPrompt.discussionTimeMs);
          logger.info("Council has decided", { answer });
          processingTimeMs = Date.now() - startTime;

          // Log memory after voting to track memory usage per vote
          const memAfter = getMemoryStats();
          const heapDelta = bytesToMB(memAfter.heapUsed - memBefore.heapUsed);
          logger.info("Vote processing completed", {
            processingTime_ms: processingTimeMs,
            heapDelta_mb: parseFloat(heapDelta.toFixed(2)),
          });

          finalStatus = PromptStatus.COMPLETED;

          // Update status to COMPLETED
          await storage.updatePromptStatus(
            queuedPrompt.id,
            PromptStatus.COMPLETED,
            answer,
            processingTimeMs
          );

          // Broadcast completed status
          const completedMessage: PromptStatusChangedMessage = {
            id: queuedPrompt.id,
            prompt: queuedPrompt.prompt,
            status: PromptStatus.COMPLETED,
            answer,
            processingTimeMs,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await councilKafka.publish(topics.council.statusChanged, completedMessage);
        }

        // Publish saved message (backward compatibility)
        const savedMessage: ResponseSavedMessage = {
          id: queuedPrompt.id,
          prompt: queuedPrompt.prompt,
          answer,
          createdAt: new Date(),
        };

        logger.info("Publishing answer");
        await councilKafka.publish(topics.council.saved, savedMessage);

        // Reset error count on successful processing
        errorCount = 0;

      } catch (error) {
        errorCount++;
        logger.error("Error in vote loop", error as Error, {
          errorCount,
          maxErrors: MAX_ERRORS,
        });

        if (errorCount >= MAX_ERRORS) {
          logger.error("Max errors reached, pausing", {
            pauseDuration_ms: 60000,
          });
          await new Promise(resolve => setTimeout(resolve, 60000));
          errorCount = 0; // Reset after pause
        } else {
          // Exponential backoff
          const backoffMs = Math.min(1000 * Math.pow(2, errorCount), 30000);
          logger.warn("Backing off before retry", {
            backoff_ms: backoffMs,
          });
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  voteLoop();

  if (app.keycloak) {
    // app.use("/council", app.keycloak.protect(), councilRouter);
    app.use("/council", councilRouter);
  } else {
    app.use("/council", councilRouter);
  }

  // Memory optimization: Start periodic memory monitoring
  startMemoryMonitoring(60000); // Check every minute
  logMemoryUsage("Council App Initialized");

  return app;
}
