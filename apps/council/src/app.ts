import { Express } from "express";
import { councilRouter } from "./council/router";
import { MintExpressProps, MintService } from "@otm/service";
import Council from "./council/Council";
import { createLogger } from "@otm/logger";
import { fetchEnvVar } from "@otm/utils";
import { KafkaBroker, useKafkaConfig } from "@otm/kafka";

export async function createCouncilApp(): Promise<Express> {
  const logger = createLogger();

  const appProps: MintExpressProps = {
    serviceName: "MintStarter",
  };

  const app = MintService(appProps);

  // const council = await Council.createCouncil(logger);
  // council.runCouncil();

  // app.locals.council = council;
  const config = useKafkaConfig();
  const councilKafka = new KafkaBroker(config);
  await councilKafka.connect();
  await councilKafka.subscribe("test-topic", (topic: string, message: any) => {
    console.log(message);
  });

  if (app.keycloak) {
    app.use("/council", app.keycloak.protect(), councilRouter);
  } else {
    app.use("/council", councilRouter);
  }

  return app;
}
