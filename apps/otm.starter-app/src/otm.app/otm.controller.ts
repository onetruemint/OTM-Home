import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export function getMint() {
  return (req: Request, res: Response) => {
    res.json({
      id: req.params.id,
      timestamp: new Date(),
      message: "hello world",
    });
  };
}

export function healthCheck() {
  return (req: Request, res: Response) => {
    res.status(StatusCodes.OK).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  };
}
