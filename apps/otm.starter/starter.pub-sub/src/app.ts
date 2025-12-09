import { KafkaBroker } from "@otm/kafka";
import { useKafkaConfig } from "@otm/kafka/kafka";
import { MintExpressApp, MintExpressProps, MintService } from "@otm/service";
import { mintRouter } from "./otm.app/otm.router";
import { StarterStorage } from "./storage/StarterStorage";
import { logMemoryUsage, startMemoryMonitoring } from "@otm/utils";

export async function main(): Promise<MintExpressApp> {
  const SERVICE_NAME = "MintStarter";

  const appProps: MintExpressProps = {
    serviceName: SERVICE_NAME,
  };

  const app = MintService(appProps);

  const config = useKafkaConfig({ clientId: SERVICE_NAME });

  const MintApplicationKafka = new KafkaBroker(config);
  const MintApplicationStorage = await StarterStorage.getInstance();

  app.locals.kafka = MintApplicationKafka;
  app.locals.db = MintApplicationStorage;

  if (app.keycloak) {
    app.use("/starter", app.keycloak.protect(), mintRouter);
  } else {
    app.use("/starter", mintRouter);
  }

  // Memory optimization: Start periodic memory monitoring
  startMemoryMonitoring(60000); // Check every minute
  logMemoryUsage("Council App Initialized");

  return app;
}
