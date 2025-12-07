import { Request, Response, NextFunction } from "express";
import { CouncilStorage } from "../storage/CouncilStorage";
import { PromptStatus } from "../types/Council";
import {StatusCodes} from 'http-status-codes'
import type Council from "./Council";

export async function getHealth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.status(StatusCodes.OK).json({
      status: "healthy",
      service: "council",
    });
  } catch (error) {
    next(error);
  }
}

export function getMembers() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const council: Council = req.app.locals.council;
    try {
      res.status(StatusCodes.OK).json({
        members: council.members.map((member) => member.model),
      });
    } catch (error) {
      next(error);
    }
  };
}

export function getStatus() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const council = req.app.locals.council;
    try {
      res.status(StatusCodes.OK).json({
        status: council.status,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function getElites() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const council: Council = req.app.locals.council;
    try {
      res.status(StatusCodes.OK).json({
        elites: council.elites.map((member) => member.model),
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Get all prompts with their status (pending, processing, completed, cached)
 */
export async function getAllPrompts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const storage = await CouncilStorage.getInstance();
    const prompts = await storage.getAllPrompts(limit, offset);

    res.status(StatusCodes.OK).json({
      prompts,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get prompts by status
 */
export async function getPromptsByStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const status = req.params.status as PromptStatus;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!Object.values(PromptStatus).includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Invalid status",
        validStatuses: Object.values(PromptStatus),
      });
    }

    const storage = await CouncilStorage.getInstance();
    const prompts = await storage.getPromptsByStatus(status, limit);

    res.status(StatusCodes.OK).json({
      prompts,
      status,
      limit,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single prompt by ID
 */
export async function getPromptById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "ID is required"
      })
    }

    const storage = await CouncilStorage.getInstance();
    const prompt = await storage.getPromptById(id);

    if (!prompt) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: "Prompt not found",
      });
    }

    res.status(StatusCodes.OK).json(prompt);
  } catch (error) {
    next(error);
  }
}
