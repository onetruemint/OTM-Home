import { StatusCodes } from "http-status-codes";

export interface MintExceptionOptions
  extends ErrorOptions,
    Record<string, unknown> {
  target?: string;
  details?: Error[];
}

interface ErrorResponse {
  error: ErrorDetail;
}

export interface ErrorDetail extends Record<string, unknown> {
  code: string;
  message: string;
  target?: string;
  details: ErrorDetail[];
  innererror?: InnerError;
}

export interface InnerError extends Record<string, unknown> {
  code?: string;
  innererror?: InnerError;
}

export abstract class MintException extends Error {
  public abstract readonly httpStatus: StatusCodes;
  public readonly code: string;
  public readonly target?: string;
  public readonly details: ErrorDetail[];
  public readonly innererror?: InnerError;

  constructor(message: string, options?: MintExceptionOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = this.constructor.name;
    this.target = options?.target;
    this.details = options?.details?.map((err) => ({
      code: err.name,
      message: err.message,
      details: [],
    })) || [];
    this.innererror = options?.cause
      ? this.buildInnerError(options.cause as Error)
      : undefined;

    Error.captureStackTrace(this, this.constructor);
  }

  private buildInnerError(error: Error): InnerError {
    return {
      code: error.name,
      message: error.message,
      innererror: error.cause ? this.buildInnerError(error.cause as Error) : undefined,
    };
  }

  public toErrorResponse(): ErrorResponse {
    return {
      error: this.toJSON()
    };
  }

  public toJSON(): ErrorDetail {
    return {
      code: this.code,
      message: this.message,
      target: this.target,
      details: this.details,
      innererror: this.innererror,
    };
  }
}
