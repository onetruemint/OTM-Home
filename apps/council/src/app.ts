import express, { Express } from "express";
import { councilRouter } from "./router";

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/council", councilRouter());

  app.get("/", (req, res) => {
    res.json({
      message: "Council API",
      version: "1.0.0",
    });
  });

  return app;
}
