import { Router } from "express";
import { getMint, healthCheck } from "./otm.controller";

export function mintRouter(): Router {
  const router = Router();

  router.get("/", getMint());

  // Health check route
  router.get("/health", healthCheck());

  return router;
}
