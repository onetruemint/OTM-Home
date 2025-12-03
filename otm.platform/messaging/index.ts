import { KafkaConfig } from "kafkajs";
import { KafkaMessageBroker } from "./kafka";

export class MessageBrokerFactory {
  static create(config: unknown) {
    return new KafkaMessageBroker(config as KafkaConfig);
  }
}
