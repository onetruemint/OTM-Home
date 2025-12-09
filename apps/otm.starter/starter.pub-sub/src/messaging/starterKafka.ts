import * as consts from "../consts";
import { KafkaBroker, useKafkaConfig } from "@otm/kafka";

export async function getStarterKafka() {
  const config = useKafkaConfig({ clientId: consts.SERVICE_NAME });
  const broker = new KafkaBroker(config);
  await broker.connect();

  return broker;
}
