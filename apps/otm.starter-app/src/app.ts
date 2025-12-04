import { MintExpressApp, MintExpressProps, MintService } from "@otm/service";
import { mintRouter } from "./otm.app/otm.router";
import Express, { Router } from "express";

export async function main(): Promise<MintExpressApp> {
  const appProps: MintExpressProps = {
    serviceName: "MintStarter",
  };

  const app = MintService(appProps);

  if (app.keycloak) {
    app.use("/starter", app.keycloak.protect(), mintRouter);
  } else {
    app.use("/starter", mintRouter);
  }

  return app;
}
