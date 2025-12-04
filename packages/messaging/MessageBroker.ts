export interface MessageBroker {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: any, partition?: string): Promise<void>;
  subscribe(
    topic: string,
    handler: (topic: string, message: any, partition?: string) => void,
  ): Promise<void>;
}
