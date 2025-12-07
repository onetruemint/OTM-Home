import type { NextApiRequest, NextApiResponse } from "next";
import { KafkaBroker, topics, useKafkaConfig } from "@otm/kafka";
import { EventEmitter } from "events";
import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "portal-notifications" });

// Disable Next.js body parsing and response size limits for SSE
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

let kafkaConsumer: KafkaBroker | null = null;
let notificationEmitter: EventEmitter | null = null;
let consumerInitialized = false;
let activeConnections = 0;

// Memory optimization: Limit concurrent SSE connections
const MAX_SSE_CONNECTIONS = 100;
const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

async function initializeKafkaConsumer() {
  if (consumerInitialized) {
    logger.debug("Kafka consumer already initialized, skipping");
    return;
  }

  logger.info("Initializing Kafka consumer for notifications");
  const config = useKafkaConfig({
    clientId: "portal-notifications",
  });
  kafkaConsumer = new KafkaBroker(config);
  notificationEmitter = new EventEmitter();

  // Memory optimization: Set max listeners to prevent memory leaks
  notificationEmitter.setMaxListeners(MAX_SSE_CONNECTIONS);

  logger.info("Connecting to Kafka");
  await kafkaConsumer.connect();
  logger.info("Connected to Kafka successfully");

  // Subscribe to both saved responses and status changes
  logger.info("Subscribing to topic", { topic: topics.council.saved });
  await kafkaConsumer.subscribe(topics.council.saved, (_topic: string, message: any) => {
    logger.debug("Received saved notification from Kafka", { message });
    const listenerCount = notificationEmitter?.listenerCount("notification") || 0;
    logger.debug("Broadcasting to SSE clients", { clientCount: listenerCount });
    notificationEmitter?.emit("notification", { type: "saved", data: message });
  });

  logger.info("Subscribing to topic", { topic: topics.council.statusChanged });
  await kafkaConsumer.subscribe(topics.council.statusChanged, (_topic: string, message: any) => {
    logger.debug("Received status change from Kafka", { message });
    const listenerCount = notificationEmitter?.listenerCount("notification") || 0;
    logger.debug("Broadcasting status change to SSE clients", { clientCount: listenerCount });
    notificationEmitter?.emit("notification", { type: "statusChanged", data: message });
  });

  consumerInitialized = true;
  logger.info("Kafka consumer initialized and subscribed", {
    topics: [topics.council.saved, topics.council.statusChanged],
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Memory optimization: Check connection limit
    if (activeConnections >= MAX_SSE_CONNECTIONS) {
      logger.warn("Max SSE connections reached", {
        activeConnections,
        maxConnections: MAX_SSE_CONNECTIONS,
      });
      return res.status(503).json({
        error: "Server too busy. Maximum concurrent connections reached.",
        maxConnections: MAX_SSE_CONNECTIONS,
        activeConnections,
      });
    }

    // Initialize Kafka consumer once
    await initializeKafkaConsumer();

    // Increment active connection count
    activeConnections++;
    logger.info("Active SSE connections", {
      activeConnections,
      maxConnections: MAX_SSE_CONNECTIONS,
    });

    // Set up SSE headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Explicitly set status code
    res.status(200);

    // Send initial connection message and flush
    res.write(":ok\n\n");

    // Type assertion to access flush if available
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }

    // Listen for notifications from Kafka and forward to this SSE client
    const messageHandler = (message: any) => {
      logger.debug("Sending notification to SSE client", { message });
      try {
        res.write(`data: ${JSON.stringify(message)}\n\n`);

        // Flush the response to ensure it's sent immediately
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }

        logger.debug("Successfully wrote to SSE client");
      } catch (error) {
        logger.error("Error writing to SSE client", error as Error);
      }
    };

    notificationEmitter?.on("notification", messageHandler);
    logger.debug("SSE client listening for notifications", {
      totalListeners: notificationEmitter?.listenerCount("notification"),
    });

    // Memory optimization: Connection timeout to prevent zombie connections
    const connectionTimeout = setTimeout(() => {
      logger.debug("SSE connection timeout reached, closing connection");
      cleanup();
      res.end();
    }, CONNECTION_TIMEOUT);

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(":heartbeat\n\n");

        // Flush the heartbeat
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      } catch (error) {
        logger.error("Error sending heartbeat", error as Error);
        cleanup();
      }
    }, 30000); // Send heartbeat every 30 seconds

    // Cleanup function to prevent resource leaks
    const cleanup = () => {
      clearInterval(heartbeat);
      clearTimeout(connectionTimeout);
      notificationEmitter?.off("notification", messageHandler);
      activeConnections--;
      logger.info("SSE client disconnected", {
        activeConnections,
        maxConnections: MAX_SSE_CONNECTIONS,
      });
    };

    // Clean up when client disconnects
    req.on("close", () => {
      cleanup();
      res.end();
    });
  } catch (error) {
    logger.error("Error setting up notifications", error as Error);
    // Memory optimization: Decrement counter on error
    if (activeConnections > 0) {
      activeConnections--;
    }
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to set up notifications" });
    }
  }
}
