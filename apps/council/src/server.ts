import { createExpressHttpsServer } from "@otm/service";
import { fetchEnvVar } from "@otm/utils";
import { createCouncilApp } from "./app";
import { Server } from "http";
import * as consts from "./consts";
import { createLogger } from "@otm/logger";

const HTTPS_PORT = parseInt(fetchEnvVar("OTM_HOME_COUNCIL_PORT"));
const logger = createLogger({ serviceName: "council-server" });

createCouncilApp().then((app) => {
  let httpsServer: Server;
  if (fetchEnvVar("NODE_ENV") === "production") {
    httpsServer = createExpressHttpsServer(app, {
      serviceName: consts.SERVICE_NAME,
      httpsPort: HTTPS_PORT,
    });
  } else {
    httpsServer = createExpressHttpsServer(app, {
      serviceName: consts.SERVICE_NAME,
      httpsPort: HTTPS_PORT,
      certPath: `${__dirname}/../../../.devcontainer/certs/server.crt`,
      keyPath: `${__dirname}/../../../.devcontainer/certs/server.key`,
    });
  }

  // Start HTTPS server
  httpsServer.listen(HTTPS_PORT, () => {
    logger.info("HTTPS Server is running", { port: HTTPS_PORT });
    logger.info("Health check available", {
      url: `https://localhost:${HTTPS_PORT}/health`,
    });
    logger.info("Home page available", {
      url: `https://localhost:${HTTPS_PORT}/`,
    });
    logger.info("SSL/TLS enabled");
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    httpsServer.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down gracefully");
    httpsServer.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
});
