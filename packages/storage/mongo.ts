import { Collection, Db, MongoClient } from "mongodb";
import { Persistence } from "./persistence";

export interface MongoDataStorage {
  id?: string | number;
}

export class MongoPersistence<T extends MongoDataStorage>
  implements Persistence<T>
{
  private db: Db;
  protected collection: Collection;

  constructor(
    client: MongoClient,
    databaseName: string,
    private collectionName: string,
  ) {
    this.db = client.db(databaseName);
    this.collection = this.db.collection(this.collectionName);
  }

  async create(data: T): Promise<string | number> {
    const result = await this.collection.insertOne(data as any);
    return result.insertedId.toString();
  }

  async read(id: string | number): Promise<T | null> {
    const result = await this.collection.findOne({ _id: id } as any);
    return result as T | null;
  }

  async update(id: string | number, data: Partial<T>): Promise<T | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id } as any,
      { $set: data },
      { returnDocument: "after" },
    );
    return result as T | null;
  }

  async upsert(data: T): Promise<string | number> {
    const { id, ...rest } = data;
    if (id) {
      await this.collection.updateOne(
        { _id: id } as any,
        { $set: rest },
        { upsert: true },
      );
      return id;
    }
    return this.create(data);
  }

  async delete(id: string | number): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id } as any);
    return result.deletedCount > 0;
  }

  async list(limit?: number, offset?: number): Promise<T[]> {
    let cursor = this.collection.find();
    if (offset) cursor = cursor.skip(offset);
    if (limit) cursor = cursor.limit(limit);
    return (await cursor.toArray()) as unknown as T[];
  }

  async count(): Promise<number> {
    return await this.collection.countDocuments();
  }
}
