import { createApp } from "./app";
import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "good-news-server" });
const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT, () => {
  logger.info(`Good News API server is running on port ${PORT}`, { port: PORT });
});
