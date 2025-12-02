import express, { Express } from "express";
import { goodNewsRouter } from "./good-news/router";

/**
 * Creates and configures the Express application for GoodNews
 *
 * @returns Configured Express app
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use("/api/good-news", goodNewsRouter());

  // Root endpoint
  app.get("/", (req, res) => {
    res.json({
      message: "Good News API",
      version: "1.0.0",
    });
  });

  return app;
}
