import { NextFunction, Request, Response } from "express";

export function getHomeInventory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(200).json({
    message: "Hello World",
  });
}
