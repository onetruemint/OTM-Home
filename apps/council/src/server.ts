import {
  createExpressHttpsServer,
  createExpressHttpServer,
} from "@otm/service";
import { fetchEnvVar } from "@otm/utils";
import { createCouncilApp } from "./app";
import { Server } from "http";

const HTTPS_PORT = parseInt(fetchEnvVar("OTM_HOME_COUNCIL_PORT"));
const SERVICE_NAME = "OTM Home Council";

createCouncilApp().then((app) => {
  let httpsServer: Server;
  if (fetchEnvVar("NODE_ENV") === "production") {
    httpsServer = createExpressHttpServer(app, {
      serviceName: SERVICE_NAME,
      httpsPort: HTTPS_PORT,
    });
  } else {
    httpsServer = createExpressHttpServer(app, {
      serviceName: SERVICE_NAME,
      httpsPort: HTTPS_PORT,
      certPath: `${__dirname}/../../../.devcontainer/certs/server.crt`,
      keyPath: `${__dirname}/../../../.devcontainer/certs/server.key`,
    });
  }

  // Start HTTPS server
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🚀 HTTPS Server is running on port ${HTTPS_PORT}`);
    console.log(
      `📱 Health check available at https://localhost:${HTTPS_PORT}/health`,
    );
    console.log(`🏠 Home page at https://localhost:${HTTPS_PORT}/`);
    console.log(`🔒 SSL/TLS enabled`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    httpsServer.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully");
    httpsServer.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});
