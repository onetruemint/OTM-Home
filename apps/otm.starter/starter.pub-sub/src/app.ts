import { KafkaBroker } from "@otm/kafka";
import { useKafkaConfig } from "@otm/kafka/kafka";
import { MintExpressApp, MintExpressProps, MintService } from "@otm/service";
import { mintRouter } from "./otm.app/otm.router";

export async function main(): Promise<MintExpressApp> {
  const SERVICE_NAME = "MintStarter";

  const appProps: MintExpressProps = {
    serviceName: SERVICE_NAME,
  };

  const app = MintService(appProps);

  const config = useKafkaConfig({ clientId: SERVICE_NAME });

  const MintApplicationKafka = new KafkaBroker(config);

  app.locals.kafka = MintApplicationKafka;

  if (app.keycloak) {
    app.use("/starter", app.keycloak.protect(), mintRouter);
  } else {
    app.use("/starter", mintRouter);
  }

  return app;
}
