import { Router } from "express";
import {
  getHealth,
  getMembers,
  getElites,
  addToQueue,
  getStatus,
} from "./controller";

export function councilRouter(): Router {
  const router = Router();

  router.get("/health", getHealth);

  router.post("/vote", addToQueue);

  router.get("/status", getStatus);
  router.get("/members", getMembers);

  router.get("/elites", getElites);

  return router;
}
