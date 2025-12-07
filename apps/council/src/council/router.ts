import { Router } from "express";
import {
  getHealth,
  getMembers,
  getElites,
  getStatus,
  getAllPrompts,
  getPromptsByStatus,
  getPromptById,
} from "./controller";

export function councilRouter(): Router {
  const router = Router();

  router.get("/health", getHealth);

  router.get("/status", getStatus);
  router.get("/members", getMembers);

  router.get("/elites", getElites);

  // Prompt status endpoints
  router.get("/prompts", getAllPrompts);
  router.get("/prompts/status/:status", getPromptsByStatus);
  router.get("/prompts/:id", getPromptById);

  return router;
}
