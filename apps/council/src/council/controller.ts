import { Request, Response, NextFunction } from "express";

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

export function addToQueue() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const council = req.app.locals.council;
    try {
      const { prompt } = req.body;

      if (!prompt) {
        res.status(400).json({
          error: "Missing required field: prompt",
        });
      }

      const result = await council.addToQueue(prompt);

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
    const council = req.app.locals.council;
    try {
      res.status(200).json({
        members: council.members,
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
      res.status(200).json({
        status: council.status,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function getElites() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const council = req.app.locals.council;
    try {
      res.status(200).json({
        elites: council.elites,
      });
    } catch (error) {
      next(error);
    }
  };
}
