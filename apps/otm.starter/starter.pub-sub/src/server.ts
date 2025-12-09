import { MintService, createExpressHttpsServer } from "@otm/service";
import { LogLevel, createLogger } from "@otm/logger";
import { fetchEnvVar } from "@otm/utils";

const logger = createLogger({ serviceName: "starter-pub-sub-server" });
const HTTPS_PORT = parseInt(fetchEnvVar("EXAMPLE_PORT"));
const CERT_PATH = `${__dirname}/../../../.devcontainer/certs`;

// Create MintService app with middleware
const app = MintService({
  serviceName: "starter-app",
  useKeycloak: fetchEnvVar("KEYCLOAK_URL") ? true : false,
  logger: {
    serviceName: "starter-app",
    minLevel: LogLevel.INFO,
  },
});

// Create HTTPS server
const httpsServer = createExpressHttpsServer(app, {
  serviceName: "starter-app",
  httpsPort: HTTPS_PORT,
  certPath: `${CERT_PATH}/server.crt`,
  keyPath: `${CERT_PATH}/server.key`,
});

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

export default app;
