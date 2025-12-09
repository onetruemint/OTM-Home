import { MongoClient } from "mongodb";
import { MongoPersistence, MongoDataStorage } from "@otm/storage";

export interface StarterResponse extends MongoDataStorage {
  response: string;
  createdAt: Date;
}

export class StarterStorage extends MongoPersistence<StarterResponse> {
  private static instance: StarterStorage | null = null;
  private static client: MongoClient | null = null;

  private constructor(client: MongoClient) {
    super(client, "otm-home", "council-responses");
  }

  static async getInstance(): Promise<StarterStorage> {
    if (!StarterStorage.instance) {
      const mongoUrl =
        process.env.MONGO_URL ||
        "mongodb://otm-home-user:otm-home-password@otm-home-mongo:27017";

      // Memory optimization: Configure connection pool limits
      StarterStorage.client = new MongoClient(mongoUrl, {
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 2, // Minimum number of connections in the pool
        maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
        waitQueueTimeoutMS: 5000, // Timeout for waiting for a connection
        socketTimeoutMS: 30000, // Socket timeout
        serverSelectionTimeoutMS: 5000, // Server selection timeout
      });

      await StarterStorage.client.connect();

      StarterStorage.instance = new StarterStorage(StarterStorage.client);

      // Create indexes for better query performance
      await StarterStorage.instance.createIndexes();
    }

    return StarterStorage.instance;
  }

  private async createIndexes() {
    await this.collection.createIndex({ createdAt: -1 });
    await this.collection.createIndex({ response: "text" });
  }

  /**
   * Get all prompts with their status (for UI display)
   */
  async GetAllResponses(
    limit: number = 50,
    offset: number = 0,
  ): Promise<StarterResponse[]> {
    const cursor = this.collection
      .find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return (await cursor.toArray()) as unknown as StarterResponse[];
  }

  /**
   * Get a single prompt by ID
   */
  async getResponseById(id: string): Promise<StarterResponse | null> {
    const result = await this.read(id);
    return result as StarterResponse | null;
  }

  async searchResponses(
    query: string,
    limit: number = 10,
  ): Promise<StarterResponse[]> {
    const cursor = this.collection
      .find({ $text: { $search: query } })
      .sort({ createdAt: -1 })
      .limit(limit);

    return (await cursor.toArray()) as unknown as StarterResponse[];
  }

  static async close() {
    if (StarterStorage.client) {
      await StarterStorage.client.close();
      StarterStorage.client = null;
      StarterStorage.instance = null;
    }
  }
}
