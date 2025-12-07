import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { MintException } from "./otm.exception";
import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "error-handler" });

/**
 * Global error handler middleware for Express applications
 * Handles MintException instances and other errors
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof MintException) {
    return res.status(error.httpStatus).json(error.toErrorResponse());
  }

  logger.error("Unhandled error", error, {
    method: req.method,
    url: req.url,
    path: req.path,
  });

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: {
      code: "InternalServerError",
      message: "An unexpected error occurred",
      details: [],
    },
  });
}
