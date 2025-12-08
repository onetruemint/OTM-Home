import type { NextApiRequest, NextApiResponse } from "next";
import { KafkaBroker, topics, useKafkaConfig } from "@otm/kafka";
import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "portal-kafka-api" });
let kafkaProducer: KafkaBroker | null = null;

async function getKafkaProducer() {
  if (!kafkaProducer) {
    const config = useKafkaConfig({ clientId: "portal-client" });
    kafkaProducer = new KafkaBroker(config);
    await kafkaProducer.connect();
  }

  return kafkaProducer;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const producer = await getKafkaProducer();
    await producer.publish(topics.council.queue, req.body);

    res
      .status(200)
      .json({ success: true, message: `Published to ${topics.council.queue}` });
  } catch (error) {
    logger.error("Error publishing to Kafka", error as Error);
    res.status(500).json({ error: "Failed to publish message" });
  }
}
