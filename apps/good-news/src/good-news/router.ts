import { Router } from "express";
import {
  getHealth,
  fetchTopStories,
  getHeadlines,
  getHeadlinesBySource,
  getArticle,
} from "./controller";

/**
 * Creates and configures the GoodNews router with all endpoints
 *
 * @returns Configured Express router
 */
export function goodNewsRouter(): Router {
  const router = Router();

  // Health check
  router.get("/health", getHealth);

  // Fetch top stories
  router.post("/fetch-top-stories", fetchTopStories);

  // Get all headlines
  router.get("/headlines", getHeadlines);

  // Get headlines by source
  router.get("/headlines/:source", getHeadlinesBySource);

  // Get article content
  router.post("/article", getArticle);

  return router;
}
