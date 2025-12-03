# Platform Logger with ELK Stack

A simple, powerful logging system with optional ELK (Elasticsearch, Logstash, Kibana) integration for centralized log management.

## Features

- Standard log levels: DEBUG, INFO, WARN, ERROR
- Colored console output (development)
- Optional ELK stack integration (production)
- Child loggers with inherited context
- Structured metadata support
- Environment-aware configuration

## Quick Start

### Basic Usage (Console Only)

```typescript
import { createLogger } from "@platform/logger";

const logger = createLogger({ serviceName: "my-service" });

logger.info("Server starting");
logger.warn("High memory usage", { memory: "85%" });
logger.error("Database connection failed", new Error("Timeout"));
```

### With ELK Stack

```typescript
import { createLogger } from "@platform/logger";

const logger = createLogger({
  serviceName: "my-service",
  logstash: {
    host: "otm-home-logstash",
    port: 5000,
  },
});

logger.info("User logged in", { userId: "123", ip: "192.168.1.1" });
```

### Child Loggers

```typescript
const logger = createLogger({ serviceName: "api" });
const requestLogger = logger.child({ requestId: "abc-123" });

requestLogger.info("Processing request"); // Includes requestId automatically
requestLogger.error("Request failed", { statusCode: 500 });
```

## ELK Stack Setup

### 1. Start the ELK Stack

The ELK stack is configured in `.devcontainer/docker-compose.backend.yml`:

```bash
docker-compose -f .devcontainer/docker-compose.backend.yml up -d
```

This starts:
- **Elasticsearch** (port 9200) - Log storage and indexing
- **Logstash** (port 5000) - Log ingestion
- **Kibana** (port 5601) - Log visualization and dashboards

### 2. Access Kibana

Open your browser to: `http://localhost:5601`

### 3. Create Index Pattern

1. Go to Kibana → Management → Stack Management → Index Patterns
2. Create index pattern: `logs-*`
3. Select `@timestamp` as the time field
4. Click "Create index pattern"

### 4. View Logs

1. Go to Kibana → Discover
2. Select your `logs-*` index pattern
3. View and search your logs in real-time

## Configuration

### LoggerConfig Options

```typescript
interface LoggerConfig {
  serviceName?: string; // Service identifier (default: "app")
  minLevel?: LogLevel; // Minimum log level (default: DEBUG in dev, INFO in prod)
  enableColors?: boolean; // Console colors (default: true in dev, false in prod)
  logstash?: {
    host: string; // Logstash host
    port: number; // Logstash port (default: 5000)
  };
}
```

### Environment Variables

The logger automatically adjusts based on `NODE_ENV`:

- **Development**: DEBUG level, colored output, console only
- **Production**: INFO level, no colors, sends to Logstash if configured

## Log Levels

```typescript
LogLevel.DEBUG = 0; // Detailed debugging information
LogLevel.INFO = 1; // General informational messages
LogLevel.WARN = 2; // Warning messages
LogLevel.ERROR = 3; // Error messages
```

## Logstash Pipeline

Logs are sent to Logstash via TCP (port 5000) in JSON format. The pipeline configuration is in `platform/logger/logstash.conf`:

- Parses JSON logs
- Extracts timestamps
- Creates daily indices: `logs-{service}-YYYY.MM.dd`
- Stores in Elasticsearch

## Best Practices

1. **Use child loggers for context**: Create request-scoped loggers with request IDs
2. **Include metadata**: Add relevant context to help with debugging
3. **Use appropriate levels**: DEBUG for development, INFO/WARN/ERROR for production
4. **Structure your logs**: Use consistent metadata keys across services
5. **Service naming**: Use descriptive service names to identify log sources

## Example: Production Setup

```typescript
import { createLogger, LogLevel } from "@platform/logger";

const logger = createLogger({
  serviceName: process.env.SERVICE_NAME || "api",
  minLevel: LogLevel.INFO,
  logstash: {
    host: process.env.LOGSTASH_HOST || "otm-home-logstash",
    port: parseInt(process.env.LOGSTASH_PORT || "5000"),
  },
});

export default logger;
```

## Troubleshooting

### Logs not appearing in Kibana

1. Check Logstash is running: `docker ps | grep logstash`
2. Check Logstash logs: `docker logs otm-home-logstash`
3. Verify connection: Logger outputs connection status on startup
4. Check Elasticsearch health: `curl http://localhost:9200/_cluster/health`

### Connection errors

If you see "Logstash connection error", ensure:
- Logstash container is running
- Port 5000 is not blocked
- Your app container is on the `otm-home-elk` network

## Architecture

```
Application
    ↓ (TCP/JSON)
Logstash:5000
    ↓
Elasticsearch:9200
    ↓
Kibana:5601 (Web UI)
```

All services run in the `otm-home-elk` Docker network for secure communication.
