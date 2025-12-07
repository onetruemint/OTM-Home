import { MongoClient } from "mongodb";
import { MongoPersistence, MongoDataStorage } from "@otm/storage";
import { PromptStatus } from "../types/Council";

export interface CouncilResponse extends MongoDataStorage {
  prompt: string;
  answer: string;
  status: PromptStatus;
  createdAt: Date;
  updatedAt: Date;
  votes?: number;
  processingTimeMs?: number;
  discussionTimeMs?: number; // Configurable discussion time
}

export class CouncilStorage extends MongoPersistence<CouncilResponse> {
  private static instance: CouncilStorage | null = null;
  private static client: MongoClient | null = null;

  private constructor(client: MongoClient) {
    super(client, "otm-home", "council-responses");
  }

  static async getInstance(): Promise<CouncilStorage> {
    if (!CouncilStorage.instance) {
      const mongoUrl =
        process.env.MONGO_URL || "mongodb://otm-home-user:otm-home-password@otm-home-mongo:27017";

      // Memory optimization: Configure connection pool limits
      CouncilStorage.client = new MongoClient(mongoUrl, {
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 2, // Minimum number of connections in the pool
        maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
        waitQueueTimeoutMS: 5000, // Timeout for waiting for a connection
        socketTimeoutMS: 30000, // Socket timeout
        serverSelectionTimeoutMS: 5000, // Server selection timeout
      });

      await CouncilStorage.client.connect();

      CouncilStorage.instance = new CouncilStorage(CouncilStorage.client);

      // Create indexes for better query performance
      await CouncilStorage.instance.createIndexes();
    }

    return CouncilStorage.instance;
  }

  private async createIndexes() {
    await this.collection.createIndex({ createdAt: -1 });
    await this.collection.createIndex({ prompt: "text", answer: "text" });
    await this.collection.createIndex({ status: 1 });
    await this.collection.createIndex({ prompt: 1 }); // For deduplication lookup
  }

  /**
   * Create a new prompt in pending status
   */
  async createPrompt(prompt: string, discussionTimeMs?: number): Promise<string> {
    const now = new Date();
    const response: CouncilResponse = {
      prompt,
      answer: "",
      status: PromptStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      discussionTimeMs,
    };

    const id = await this.create(response);
    return id.toString();
  }

  /**
   * Update prompt status
   */
  async updatePromptStatus(
    id: string,
    status: PromptStatus,
    answer?: string,
    processingTimeMs?: number,
    votes?: number
  ): Promise<void> {
    const update: Partial<CouncilResponse> = {
      status,
      updatedAt: new Date(),
    };

    if (answer !== undefined) update.answer = answer;
    if (processingTimeMs !== undefined) update.processingTimeMs = processingTimeMs;
    if (votes !== undefined) update.votes = votes;

    await this.update(id, update);
  }

  /**
   * Find existing response for a prompt (for deduplication)
   */
  async findCachedResponse(prompt: string): Promise<CouncilResponse | null> {
    const result = await this.collection.findOne({
      prompt: { $eq: prompt },
      status: PromptStatus.COMPLETED,
    });

    return result as unknown as CouncilResponse | null;
  }

  /**
   * Legacy method for backward compatibility
   */
  async saveResponse(prompt: string, answer: string, processingTimeMs?: number, votes?: number): Promise<string> {
    const now = new Date();
    const response: CouncilResponse = {
      prompt,
      answer,
      status: PromptStatus.COMPLETED,
      createdAt: now,
      updatedAt: now,
      processingTimeMs,
      votes,
    };

    const id = await this.create(response);
    return id.toString();
  }

  async getResponses(limit: number = 10, offset: number = 0): Promise<CouncilResponse[]> {
    const cursor = this.collection
      .find({ status: PromptStatus.COMPLETED })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return (await cursor.toArray()) as unknown as CouncilResponse[];
  }

  /**
   * Get all prompts with their status (for UI display)
   */
  async getAllPrompts(limit: number = 50, offset: number = 0): Promise<CouncilResponse[]> {
    const cursor = this.collection
      .find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return (await cursor.toArray()) as unknown as CouncilResponse[];
  }

  /**
   * Get prompts by status
   */
  async getPromptsByStatus(status: PromptStatus, limit: number = 50): Promise<CouncilResponse[]> {
    const cursor = this.collection
      .find({ status })
      .sort({ createdAt: -1 })
      .limit(limit);

    return (await cursor.toArray()) as unknown as CouncilResponse[];
  }

  /**
   * Get a single prompt by ID
   */
  async getPromptById(id: string): Promise<CouncilResponse | null> {
    const result = await this.read(id);
    return result as CouncilResponse | null;
  }

  async searchResponses(query: string, limit: number = 10): Promise<CouncilResponse[]> {
    const cursor = this.collection
      .find({ $text: { $search: query } })
      .sort({ createdAt: -1 })
      .limit(limit);

    return (await cursor.toArray()) as unknown as CouncilResponse[];
  }

  static async close() {
    if (CouncilStorage.client) {
      await CouncilStorage.client.close();
      CouncilStorage.client = null;
      CouncilStorage.instance = null;
    }
  }
}
