import { MintService, createExpressHttpsServer } from "@otm/service";
import { LogLevel, createLogger } from "@otm/logger";
import { fetchEnvVar } from "@otm/utils";

const logger = createLogger({ serviceName: "starter-express-server" });
const HTTPS_PORT = parseInt(fetchEnvVar("EXAMPLE_PORT"));

// Create MintService app with middleware
const app = MintService({
  serviceName: "starter-app",
  useKeycloak: fetchEnvVar("KEYCLOAK_URL") ? true : false,
  logger: {
    serviceName: "starter-app",
    minLevel: LogLevel.INFO,
  },
});

// Register routes
// app.use("/", mintRouter());

// 404 handler
// app.use("*", (req: Request, res: Response) => {
//   res.status(StatusCodes.NOT_FOUND).json({
//     error: "Route not found",
//     path: req.originalUrl,
//   });
// });

// Create HTTPS server
const httpsServer = createExpressHttpsServer(app, {
  serviceName: "starter-app",
  httpsPort: HTTPS_PORT,
});

// Start HTTPS server
httpsServer.listen(HTTPS_PORT, () => {
  logger.info(`HTTPS Server is running on port ${HTTPS_PORT}`, { port: HTTPS_PORT });
  logger.info(`Health check available at https://localhost:${HTTPS_PORT}/health`);
  logger.info(`Home page at https://localhost:${HTTPS_PORT}/`);
  logger.info(`SSL/TLS enabled`);
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
