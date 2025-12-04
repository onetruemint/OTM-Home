import { MintExpressProps, MintService } from "@otm/platform";
import { Express } from "express";
import { mintRouter } from "./otm.app/otm.router";

export async function main(): Promise<Express> {
  const appProps: MintExpressProps = {
    serviceName: "MintStarter",
  };

  const app = MintService(appProps);

  if (app.keycloak) {
    app.use("/starter", app.keycloak.protect(), mintRouter());
  } else {
    app.use("/starter", mintRouter());
  }

  return app;
}
