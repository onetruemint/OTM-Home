import { KafkaPublisher, KafkaSubscriber } from "./kafka";
import { Publisher } from "./Publisher";
import { Subscriber } from "./Subscriber";

export { Publisher, Subscriber };

export async function generatePublisher(
  topic: string,
  client: string,
): Promise<Publisher> {
  return await KafkaPublisher.create({
    topic,
    client,
  });
}

export async function generateSubscriber(
  clientId: string,
  groupId: string,
  topics: string[],
  callback: Function,
): Promise<Subscriber> {
  return await KafkaSubscriber.create({
    clientId,
    groupId,
    topics,
    callback,
  });
}
