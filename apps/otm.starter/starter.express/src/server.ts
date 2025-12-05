import { MintService, createExpressHttpsServer } from "@otm/service";
import { LogLevel } from "@otm/logger";
import { fetchEnvVar } from "@otm/utils";

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

export default app;
