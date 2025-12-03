import { MongoClient } from "mongodb";
import { AppStorage } from "./AppStorage";
import { MongoPersistence } from "@platform/persistence";
import { Application } from "../application/Application";

export class AppMongoStore
  extends MongoPersistence<Application>
  implements AppStorage
{
  constructor(client: MongoClient, serviceName: string, databaseName: string) {
    super(client, databaseName, serviceName);
  }

  async getApplications(): Promise<Application[]> {
    return await this.collection
      .aggregate<Application>([
        {
          $addFields: {
            id: { $toString: "$_id" },
          },
        },
        { $project: { _id: 0 } },
      ])
      .toArray();
  }
}
