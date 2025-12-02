export interface Publisher {
  topic: string;

  publish(name: string, data: Object): Promise<void>;
  shutdown(): Promise<void>;
}

export interface PublisherConfig {
  topic: string;
  client: string;
}
