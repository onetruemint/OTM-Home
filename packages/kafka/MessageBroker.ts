import type { BrokersFunction } from "kafkajs";

export interface MessageBroker {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: any, partition?: string): Promise<void>;
  subscribe(
    topic: string,
    handler: (topic: string, message: any, partition?: string) => void,
  ): Promise<void>;
}

export interface OtmKafkaConfig {
  brokers?: string[] | BrokersFunction;
  clientId: string;
}
