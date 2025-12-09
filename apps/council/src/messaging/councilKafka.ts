import { type EventEmitter } from "stream";
import * as consts from "../council/consts";
import { KafkaBroker, topics, useKafkaConfig } from "@otm/kafka";
import {
  type IncomingCouncilMessage,
  type PromptStatusChangedMessage,
} from "./CouncilTopics";
import { CouncilStorage } from "../storage/CouncilStorage";
import { CouncilEmits, PromptStatus, QueuedPrompt } from "../types/Council";
import { type Logger } from "@otm/logger";

export async function getCouncilKafka() {
  const config = useKafkaConfig({ clientId: consts.SERVICE_NAME });
  const broker = new KafkaBroker(config);
  await broker.connect();

  return broker;
}

export function getHandler(
  kafkaRef: KafkaBroker,
  emitter: EventEmitter,
  promptQueue: QueuedPrompt[],
  droppedPrompts: number,
  logger: Logger,
) {
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
        percentFull: Math.round(
          (promptQueue.length / consts.MAX_QUEUE_SIZE) * 100,
        ),
      });
    }

    // Save prompt to database with PENDING status
    const storage = await CouncilStorage.getInstance();
    const promptId = await storage.createPrompt(
      message.prompt,
      message.discussionTimeMs,
    );

    // Broadcast prompt created status
    const statusMessage: PromptStatusChangedMessage = {
      id: promptId,
      prompt: message.prompt,
      status: PromptStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await kafkaRef.publish(topics.council.statusChanged, statusMessage);

    // Add to queue
    promptQueue.push({
      id: promptId,
      prompt: message.prompt,
      discussionTimeMs: message.discussionTimeMs,
    });

    emitter.emit(String(CouncilEmits.NEW_PROMPT));
  }

  return newPromptHandler;
}
