import {
  Kafka,
  Producer,
  Consumer,
  EachMessagePayload,
  KafkaConfig,
  ITopicConfig,
} from "kafkajs";
import { brokers } from "./brokers";
import { MessageBroker, OtmKafkaConfig } from "./MessageBroker";
import { topics as topicsCollection } from "./topics";
import { createLogger } from "@otm/logger";

// Memory optimization: Kafka message size limits
const MAX_MESSAGE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_BYTES_PER_PARTITION = 5 * 1024 * 1024; // 5MB
const WARNING_MESSAGE_SIZE = 512 * 1024; // 512KB

const logger = createLogger({ serviceName: "kafka-broker" });

export function useKafkaConfig(config?: OtmKafkaConfig): KafkaConfig {
  return {
    brokers,
    ssl: false,
    ...config,
  };
}

export class KafkaBroker implements MessageBroker {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private connected: boolean = false;

  constructor(config: KafkaConfig) {
    this.kafka = new Kafka(config);

    // Memory optimization: Configure producer with message size limits
    this.producer = this.kafka.producer({
      maxInFlightRequests: 5,
      idempotent: false,
    });

    // Memory optimization: Configure consumer with memory limits
    this.consumer = this.kafka.consumer({
      groupId: config?.clientId || "my-group",
      maxBytesPerPartition: MAX_BYTES_PER_PARTITION,
      maxWaitTimeInMs: 5000,
    });
  }

  async setTopics(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();

    const topics: ITopicConfig[] = [];

    for (const serviceTopicCollection of Object.values(topicsCollection)) {
      const serviceTopics = Object.values(serviceTopicCollection).map(
        (topic) => {
          return {
            topic,
          };
        },
      );

      topics.push(...serviceTopics);
    }

    await admin.createTopics({
      topics,
    });

    await admin.disconnect();
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.setTopics();
    await this.producer.connect();
    await this.consumer.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.producer.disconnect();
    await this.consumer.disconnect();
    this.connected = false;
  }

  async publish(
    topic: string,
    message: any,
    partition?: string,
  ): Promise<void> {
    const messageString = JSON.stringify(message);
    const messageSize = Buffer.byteLength(messageString, 'utf8');

    // Memory optimization: Validate outgoing message size
    if (messageSize > MAX_MESSAGE_SIZE) {
      throw new Error(
        `Cannot publish message: size (${messageSize} bytes) exceeds maximum (${MAX_MESSAGE_SIZE} bytes)`
      );
    }

    if (messageSize > WARNING_MESSAGE_SIZE) {
      logger.warn("Publishing large message", {
        messageSize_bytes: messageSize,
        topic,
        warningThreshold_bytes: WARNING_MESSAGE_SIZE,
      });
    }

    await this.producer.send({
      topic,
      messages: [
        {
          value: messageString,
          partition: partition ? parseInt(partition) : undefined,
        },
      ],
    });
  }

  async subscribe(
    topic: string,
    handler: (topic: string, message: any, partition?: string) => void,
  ): Promise<void> {
    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    } catch (error) {
      logger.error("Error subscribing to topic", error as Error, { topic });
    }
    await this.consumer.run({
      eachMessage: async ({
        topic,
        partition,
        message,
      }: EachMessagePayload) => {
        // Memory optimization: Validate message size
        const messageSize = message.value?.length || 0;

        if (messageSize > MAX_MESSAGE_SIZE) {
          logger.error("Message size exceeds maximum, dropping message", {
            messageSize_bytes: messageSize,
            maxSize_bytes: MAX_MESSAGE_SIZE,
            topic,
          });
          return; // Drop oversized messages
        }

        if (messageSize > WARNING_MESSAGE_SIZE) {
          logger.warn("Large message detected", {
            messageSize_bytes: messageSize,
            topic,
            warningThreshold_bytes: WARNING_MESSAGE_SIZE,
          });
        }

        const value = message.value?.toString();
        const parsedMessage = value ? JSON.parse(value) : null;
        handler(topic, parsedMessage, partition.toString());
      },
    });
  }
}
