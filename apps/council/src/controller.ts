import { Request, Response, NextFunction } from "express";
import Council from "./Council";
import * as utils from "@otm/utils";
import * as fs from "fs";

export async function getHealth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.status(200).json({
      status: "healthy",
      service: "council",
    });
  } catch (error) {
    next(error);
  }
}

export function vote() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        res.status(400).json({
          error: "Missing required field: prompt",
        });
      }

      const council = await Council.createCouncil();
      const result = await council.vote(prompt);

      res.status(200).json({
        prompt,
        result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function getMembers() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const councilJson = `${__dirname}/members.json`;
      const data = fs.readFileSync(councilJson, "utf8");
      const councilData = JSON.parse(data);

      res.status(200).json({
        members: councilData.members,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function getElites() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const councilJson = `${__dirname}/members.json`;
      const data = fs.readFileSync(councilJson, "utf8");
      const councilData = JSON.parse(data);

      res.status(200).json({
        elites: councilData.elites,
      });
    } catch (error) {
      next(error);
    }
  };
}
