import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";
import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "portal-council-prompts" });

enum PromptStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  CACHED = "CACHED",
}

interface CouncilPrompt {
  _id: string;
  prompt: string;
  answer: string;
  status: PromptStatus;
  createdAt: Date;
  updatedAt: Date;
  processingTimeMs?: number;
  discussionTimeMs?: number;
  votes?: number;
}

interface PromptsResponse {
  prompts: CouncilPrompt[];
  limit: number;
  offset: number;
}

let mongoClient: MongoClient | null = null;

async function getMongoClient() {
  if (!mongoClient) {
    const mongoUrl =
      process.env.MONGO_URL || "mongodb://otm-home-user:otm-home-password@otm-home-mongo:27017";
    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
  }
  return mongoClient;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PromptsResponse | { error: string }>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const client = await getMongoClient();
    const db = client.db("otm-home");
    const collection = db.collection("council-responses");

    // Get all prompts sorted by creation date (newest first)
    const prompts = await collection
      .find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    res.status(200).json({
      prompts: prompts.map((p) => ({
        _id: p._id.toString(),
        prompt: p.prompt,
        answer: p.answer || "",
        status: p.status as PromptStatus,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        processingTimeMs: p.processingTimeMs,
        discussionTimeMs: p.discussionTimeMs,
        votes: p.votes,
      })),
      limit,
      offset,
    });
  } catch (error) {
    logger.error("Error fetching council prompts", error as Error);
    res.status(500).json({ error: "Failed to fetch prompts" });
  }
}
