export interface Subscriber {
  shutdown(): Promise<void>;
}

export interface SubscriberConfig {
  clientId: string;
  groupId: string;
  topics: string[];
  callback: Function;
}
