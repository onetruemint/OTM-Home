import { MongoClient } from "mongodb";
import { AppStorage } from "./AppStorage";
import { AppMongoStore } from "./AppMongo";
import { fetchEnvVar } from "@platform/utils";

let mongoClient: MongoClient;

function createMongoClient(): MongoClient {
  if (!mongoClient) {
    const mongoDbConnectionUri = fetchEnvVar("OTM_HOME_MONGO_URI");
    mongoClient = new MongoClient(mongoDbConnectionUri);
  }

  return mongoClient;
}

export async function createApplicationStorage(
  serviceName: string,
): Promise<AppStorage> {
  return new AppMongoStore(createMongoClient(), serviceName, "application");
}
