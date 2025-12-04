import {
  Kafka,
  Producer,
  Consumer,
  EachMessagePayload,
  KafkaConfig,
} from "kafkajs";
import { MessageBroker } from "./MessageBroker";

export class KafkaMessageBroker implements MessageBroker {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private connected: boolean = false;

  constructor(config: KafkaConfig) {
    this.kafka = new Kafka(config);
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: config?.clientId || "my-group",
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
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
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(message),
          partition: partition ? parseInt(partition) : undefined,
        },
      ],
    });
  }

  async subscribe(
    topic: string,
    handler: (topic: string, message: any, partition?: string) => void,
  ): Promise<void> {
    await this.consumer.subscribe({ topic, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({
        topic,
        partition,
        message,
      }: EachMessagePayload) => {
        const value = message.value?.toString();
        const parsedMessage = value ? JSON.parse(value) : null;
        handler(topic, parsedMessage, partition.toString());
      },
    });
  }
}
