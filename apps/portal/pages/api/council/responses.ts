import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";
import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "portal-council-responses" });

interface CouncilResponse {
  _id: string;
  prompt: string;
  answer: string;
  createdAt: Date;
  processingTimeMs?: number;
  votes?: number;
}

interface PaginatedResponse {
  responses: CouncilResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  res: NextApiResponse<PaginatedResponse | { error: string }>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const offset = (page - 1) * pageSize;

    const client = await getMongoClient();
    const db = client.db("otm-home");
    const collection = db.collection("council-responses");

    // Get total count
    const total = await collection.countDocuments();

    // Get paginated responses
    const responses = await collection
      .find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(pageSize)
      .toArray();

    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json({
      responses: responses.map((r) => ({
        _id: r._id.toString(),
        prompt: r.prompt,
        answer: r.answer,
        createdAt: r.createdAt,
        processingTimeMs: r.processingTimeMs,
        votes: r.votes,
      })),
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    logger.error("Error fetching council responses", error as Error);
    res.status(500).json({ error: "Failed to fetch responses" });
  }
}
