import { Router } from "express";
import { getHealth, vote, getMembers, getElites } from "./controller";

export function councilRouter(): Router {
  const router = Router();

  router.get("/health", getHealth);

  router.post("/vote", vote);

  router.get("/members", getMembers);

  router.get("/elites", getElites);

  return router;
}
