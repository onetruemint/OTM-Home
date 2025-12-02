import { createLogger, LogLevel } from "./Logger";

// Example 1: Basic console logging
console.log("\n=== Example 1: Basic Console Logging ===\n");
const basicLogger = createLogger({ serviceName: "example-app" });

basicLogger.debug("This is a debug message");
basicLogger.info("Application started successfully");
basicLogger.warn("Memory usage is high", { memoryUsage: "85%" });
basicLogger.error("Failed to connect to database", new Error("Connection timeout"));

// Example 2: With metadata
console.log("\n=== Example 2: Structured Logging with Metadata ===\n");
const apiLogger = createLogger({ serviceName: "api" });

apiLogger.info("User logged in", {
  userId: "user-123",
  email: "user@example.com",
  ip: "192.168.1.100",
});

apiLogger.warn("Rate limit approaching", {
  userId: "user-456",
  requests: 95,
  limit: 100,
});

// Example 3: Child loggers with inherited context
console.log("\n=== Example 3: Child Loggers ===\n");
const parentLogger = createLogger({ serviceName: "auth" });
const requestLogger = parentLogger.child({
  requestId: "req-abc-123",
  correlationId: "corr-xyz-789",
});

requestLogger.info("Processing authentication request");
requestLogger.info("Validating credentials");
requestLogger.error("Authentication failed", { reason: "Invalid password" });

// Example 4: With ELK Stack (requires ELK services running)
console.log("\n=== Example 4: Logger with ELK Stack ===\n");
const elkLogger = createLogger({
  serviceName: "production-app",
  minLevel: LogLevel.INFO,
  logstash: {
    host: "otm-home-logstash",
    port: 5000,
  },
});

elkLogger.info("Application deployed", {
  version: "1.2.3",
  environment: "production",
});

elkLogger.warn("High traffic detected", {
  requestsPerSecond: 1000,
  threshold: 800,
});

elkLogger.error("Payment processing failed", {
  orderId: "order-12345",
  amount: 99.99,
  error: "Gateway timeout",
});

// Example 5: Different log levels
console.log("\n=== Example 5: Log Level Filtering ===\n");
const prodLogger = createLogger({
  serviceName: "prod-service",
  minLevel: LogLevel.WARN, // Only WARN and ERROR will be logged
});

prodLogger.debug("This won't be logged"); // Filtered out
prodLogger.info("This won't be logged either"); // Filtered out
prodLogger.warn("This will be logged"); // Logged
prodLogger.error("This will be logged too"); // Logged

console.log("\n=== Examples Complete ===\n");
