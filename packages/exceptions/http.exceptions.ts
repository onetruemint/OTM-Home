import { StatusCodes } from "http-status-codes";
import { MintException, MintExceptionOptions } from "./otm.exception";

export class BadRequestException extends MintException {
  public readonly httpStatus = StatusCodes.BAD_REQUEST;

  constructor(message = "Bad Request", options?: MintExceptionOptions) {
    super(message, options);
  }
}

export class UnauthorizedException extends MintException {
  public readonly httpStatus = StatusCodes.UNAUTHORIZED;

  constructor(message = "Unauthorized", options?: MintExceptionOptions) {
    super(message, options);
  }
}

export class ForbiddenException extends MintException {
  public readonly httpStatus = StatusCodes.FORBIDDEN;

  constructor(message = "Forbidden", options?: MintExceptionOptions) {
    super(message, options);
  }
}

export class NotFoundException extends MintException {
  public readonly httpStatus = StatusCodes.NOT_FOUND;

  constructor(message = "Not Found", options?: MintExceptionOptions) {
    super(message, options);
  }
}

export class ConflictException extends MintException {
  public readonly httpStatus = StatusCodes.CONFLICT;

  constructor(message = "Conflict", options?: MintExceptionOptions) {
    super(message, options);
  }
}

export class InternalServerException extends MintException {
  public readonly httpStatus = StatusCodes.INTERNAL_SERVER_ERROR;

  constructor(message = "Internal Server Error", options?: MintExceptionOptions) {
    super(message, options);
  }
}

export class NotImplementedException extends MintException {
  public readonly httpStatus = StatusCodes.NOT_IMPLEMENTED;

  constructor(message = "Not Implemented", options?: MintExceptionOptions) {
    super(message, options);
  }
}

export class ServiceUnavailableException extends MintException {
  public readonly httpStatus = StatusCodes.SERVICE_UNAVAILABLE;

  constructor(message = "Service Unavailable", options?: MintExceptionOptions) {
    super(message, options);
  }
}
