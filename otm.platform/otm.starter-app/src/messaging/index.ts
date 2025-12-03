import {
  generatePublisher,
  generateSubscriber,
  Publisher,
  Subscriber,
} from "@platform/messaging";

/**
 * Microservice Boilerplate
 * This file demonstrates how to initialize Kafka publisher and subscriber
 * for a new microservice using the platform/messaging package.
 */

// Configuration
const SERVICE_NAME = "council-service";
const PUBLISHER_TOPIC = "council-events";
const SUBSCRIBER_TOPICS = ["member-events", "council-commands"];
const CONSUMER_GROUP = "council-consumer-group";

let publisher: Publisher | null = null;
let subscriber: Subscriber | null = null;

/**
 * Initialize the Kafka Publisher
 * Use this to publish events from your microservice
 */
async function initializePublisher(): Promise<Publisher> {
  console.log(
    `[${SERVICE_NAME}] Initializing publisher for topic: ${PUBLISHER_TOPIC}`,
  );

  try {
    publisher = await generatePublisher(PUBLISHER_TOPIC, SERVICE_NAME);
    console.log(`[${SERVICE_NAME}] Publisher initialized successfully`);
    return publisher;
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to initialize publisher:`, error);
    throw error;
  }
}

/**
 * Message handler callback for the subscriber
 * This function is called whenever a message is received from subscribed topics
 *
 * @param topic - The Kafka topic the message came from
 * @param partition - The partition number
 * @param message - The parsed message data
 */
async function handleMessage(
  topic: string,
  partition: number,
  message: any,
): Promise<void> {
  console.log(
    `[${SERVICE_NAME}] Received message from topic: ${topic}, partition: ${partition}`,
  );

  try {
    // Extract message metadata
    const { name, data, timestamp } = message;

    console.log(
      `[${SERVICE_NAME}] Message name: ${name}, timestamp: ${timestamp}`,
    );

    // Route messages based on topic and message name
    switch (topic) {
      case "member-events":
        await handleMemberEvent(name, data);
        break;

      case "council-commands":
        await handleCouncilCommand(name, data);
        break;

      default:
        console.warn(`[${SERVICE_NAME}] Unknown topic: ${topic}`);
    }
  } catch (error) {
    console.error(
      `[${SERVICE_NAME}] Error handling message from topic ${topic}:`,
      error,
    );
  }
}

/**
 * Handle member-related events
 */
async function handleMemberEvent(name: string, data: any): Promise<void> {
  switch (name) {
    case "member.created":
      console.log(`[${SERVICE_NAME}] Member created:`, data);
      // TODO: Implement your business logic here
      break;

    case "member.updated":
      console.log(`[${SERVICE_NAME}] Member updated:`, data);
      // TODO: Implement your business logic here
      break;

    case "member.deleted":
      console.log(`[${SERVICE_NAME}] Member deleted:`, data);
      // TODO: Implement your business logic here
      break;

    default:
      console.warn(`[${SERVICE_NAME}] Unknown member event: ${name}`);
  }
}

/**
 * Handle council command messages
 */
async function handleCouncilCommand(name: string, data: any): Promise<void> {
  switch (name) {
    case "council.convene":
      console.log(`[${SERVICE_NAME}] Council convened:`, data);
      // TODO: Implement your business logic here
      break;

    case "council.vote":
      console.log(`[${SERVICE_NAME}] Council vote:`, data);
      // TODO: Implement your business logic here
      break;

    default:
      console.warn(`[${SERVICE_NAME}] Unknown council command: ${name}`);
  }
}

/**
 * Initialize the Kafka Subscriber
 * Use this to listen for events from other microservices
 */
async function initializeSubscriber(): Promise<Subscriber> {
  console.log(
    `[${SERVICE_NAME}] Initializing subscriber for topics: ${SUBSCRIBER_TOPICS.join(", ")}`,
  );

  try {
    subscriber = await generateSubscriber(
      SERVICE_NAME,
      CONSUMER_GROUP,
      SUBSCRIBER_TOPICS,
      handleMessage,
    );

    console.log(`[${SERVICE_NAME}] Subscriber initialized successfully`);
    return subscriber;
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to initialize subscriber:`, error);
    throw error;
  }
}

/**
 * Example: Publish an event
 * Call this function to publish events to Kafka
 */
async function publishEvent(
  eventName: string,
  eventData: object,
): Promise<void> {
  if (!publisher) {
    throw new Error(
      "Publisher not initialized. Call initializePublisher() first.",
    );
  }

  try {
    console.log(`[${SERVICE_NAME}] Publishing event: ${eventName}`);
    await publisher.publish(eventName, eventData);
    console.log(`[${SERVICE_NAME}] Event published successfully`);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to publish event:`, error);
    throw error;
  }
}

/**
 * Graceful shutdown handler
 * This ensures all Kafka connections are properly closed
 */
async function shutdown(): Promise<void> {
  console.log(`[${SERVICE_NAME}] Shutting down gracefully...`);

  const shutdownPromises: Promise<void>[] = [];

  if (publisher) {
    console.log(`[${SERVICE_NAME}] Disconnecting publisher...`);
    shutdownPromises.push(publisher.shutdown());
  }

  if (subscriber) {
    console.log(`[${SERVICE_NAME}] Disconnecting subscriber...`);
    shutdownPromises.push(subscriber.shutdown());
  }

  try {
    await Promise.all(shutdownPromises);
    console.log(`[${SERVICE_NAME}] Shutdown complete`);
    process.exit(0);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error during shutdown:`, error);
    process.exit(1);
  }
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  console.log(`[${SERVICE_NAME}] Starting microservice...`);

  try {
    // Initialize publisher and subscriber
    await initializePublisher();
    await initializeSubscriber();

    console.log(`[${SERVICE_NAME}] Microservice started successfully`);

    // Example: Publish a test event after initialization
    // Uncomment to test publishing
    // await publishEvent("council.initialized", {
    //   timestamp: Date.now(),
    //   status: "ready",
    // });

    // Register shutdown handlers
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    console.log(`[${SERVICE_NAME}] Listening for messages...`);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start microservice:`, error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error(`[${SERVICE_NAME}] Unhandled error:`, error);
    process.exit(1);
  });
}

// Export functions for testing or programmatic use
export {
  initializePublisher,
  initializeSubscriber,
  publishEvent,
  handleMessage,
  shutdown,
};
