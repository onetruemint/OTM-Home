import { Publisher, PublisherConfig } from "../Publisher";
import { Consumer, ITopicConfig, Kafka, Producer } from "kafkajs";
import * as messagingConsts from "./consts";
import { Subscriber, SubscriberConfig } from "../Subscriber";

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = "operation"
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxRetries) {
        throw new Error(
          `${context} failed after ${config.maxRetries} retries: ${lastError.message}`
        );
      }

      console.warn(
        `${context} attempt ${attempt + 1}/${config.maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError;
}

function safeStringify(data: Object): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to serialize data to JSON: ${errorMsg}`);
  }
}

function safeParse<T = any>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON data: ${errorMsg}`);
  }
}

export class KafkaPublisher implements Publisher {
  topic: string;
  private producer: Producer;
  private retryConfig: RetryConfig;

  private constructor(
    topic: string,
    producer: Producer,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.topic = topic;
    this.producer = producer;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  static async create(
    config: PublisherConfig,
    retryConfig?: Partial<RetryConfig>
  ) {
    const kafka = new Kafka({
      clientId: config.client,
      brokers: messagingConsts.BROKERS,
    });

    const producer = kafka.producer({
      retry: {
        retries: 5,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
      idempotent: true,
    });

    await retryWithBackoff(
      () => producer.connect(),
      { ...DEFAULT_RETRY_CONFIG, ...retryConfig },
      "Producer connection"
    );

    await retryWithBackoff(
      () => registerKafka([config.topic], kafka),
      { ...DEFAULT_RETRY_CONFIG, ...retryConfig },
      "Topic registration"
    );

    return new KafkaPublisher(config.topic, producer, retryConfig);
  }

  async publish(name: string, data: Object): Promise<void> {
    if (!name || typeof name !== "string") {
      throw new Error("Message name must be a non-empty string");
    }

    if (!data || typeof data !== "object") {
      throw new Error("Message data must be a valid object");
    }

    const messagePayload = {
      name,
      data,
      timestamp: Date.now(),
    };

    const serializedData = safeStringify(messagePayload);

    await retryWithBackoff(
      () =>
        this.producer.send({
          topic: this.topic,
          messages: [
            {
              key: name,
              value: serializedData,
              timestamp: Date.now().toString(),
            },
          ],
        }),
      this.retryConfig,
      `Publishing message "${name}" to topic "${this.topic}"`
    );
  }

  async shutdown(): Promise<void> {
    try {
      await this.producer.disconnect();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error during producer shutdown: ${errorMsg}`);
      throw error;
    }
  }
}

export class KafkaSubscriber implements Subscriber {
  consumer: Consumer;

  private constructor(consumer: Consumer) {
    this.consumer = consumer;
  }

  static async create(
    config: SubscriberConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<KafkaSubscriber> {
    if (!config.topics || config.topics.length === 0) {
      throw new Error("Subscriber config must specify at least one topic");
    }

    if (!config.callback || typeof config.callback !== "function") {
      throw new Error(
        "Subscriber config must specify a valid callback function"
      );
    }

    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: messagingConsts.BROKERS,
    });

    const consumer = kafka.consumer({
      groupId: config.groupId,
      retry: {
        retries: 5,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
    });

    await retryWithBackoff(
      () => consumer.connect(),
      { ...DEFAULT_RETRY_CONFIG, ...retryConfig },
      "Consumer connection"
    );

    await retryWithBackoff(
      () =>
        consumer.subscribe({
          topics: config.topics,
          fromBeginning: true,
        }),
      { ...DEFAULT_RETRY_CONFIG, ...retryConfig },
      "Topic subscription"
    );

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) {
            console.warn(
              `Received empty message from topic ${topic}, partition ${partition}`
            );
            return;
          }

          const messageValue = message.value.toString();
          let parsedData;

          try {
            parsedData = safeParse(messageValue);
          } catch (parseError) {
            console.error(
              `Failed to parse message from topic ${topic}, partition ${partition}:`,
              parseError
            );
            return;
          }

          await config.callback(topic, partition, parsedData);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(
            `Error processing message from topic ${topic}, partition ${partition}: ${errorMsg}`
          );
        }
      },
    });

    return new KafkaSubscriber(consumer);
  }

  async shutdown(): Promise<void> {
    try {
      await this.consumer.disconnect();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error during consumer shutdown: ${errorMsg}`);
      throw error;
    }
  }
}

async function registerKafka(topics: string[], kafka: Kafka) {
  const admin = kafka.admin();

  try {
    await admin.connect();

    const iTopics: ITopicConfig[] = topics.map((topic) => {
      return {
        topic,
        numPartitions: 3,
        replicationFactor: 3,
      };
    });

    await admin.createTopics({
      topics: iTopics,
      waitForLeaders: true,
      timeout: 30000,
    });
  } finally {
    await admin.disconnect();
  }
}
