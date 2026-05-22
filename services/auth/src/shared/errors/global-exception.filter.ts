import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

type ErrorResponseBody = {
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
};

type PrismaLikeError = {
  name?: string;
  code?: string;
  stack?: string;
};

const GENERIC_INTERNAL_ERROR_MESSAGE = 'Se ha producido un error interno. Intentalo de nuevo mas tarde.';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = this.resolveRequestId(request);
    response.setHeader('x-request-id', requestId);
    const requestPath = this.resolveRequestPath(request);

    const details = this.resolveExceptionDetails(exception);
    const body: ErrorResponseBody = {
      statusCode: details.statusCode,
      errorCode: details.errorCode,
      message: details.message,
      timestamp: new Date().toISOString(),
      path: requestPath,
      requestId,
    };

    this.logException(
      exception,
      request,
      requestPath,
      requestId,
      body.statusCode,
      body.errorCode,
      body.message,
    );

    response.status(body.statusCode).json(body);
  }

  private resolveExceptionDetails(exception: unknown): {
    statusCode: number;
    errorCode: string;
    message: string;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();
      const fallbackMessage = this.defaultMessageForStatus(statusCode);

      return {
        statusCode,
        errorCode: this.errorCodeForStatus(statusCode),
        message: statusCode >= 500
          ? GENERIC_INTERNAL_ERROR_MESSAGE
          : this.normalizeHttpMessage(responseBody, fallbackMessage),
      };
    }

    const prismaDetails = this.resolvePrismaLikeDetails(exception);
    if (prismaDetails) {
      return prismaDetails;
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_ERROR',
      message: GENERIC_INTERNAL_ERROR_MESSAGE,
    };
  }

  private resolvePrismaLikeDetails(exception: unknown):
    | { statusCode: number; errorCode: string; message: string }
    | null {
    if (!this.isPrismaLikeError(exception)) {
      return null;
    }

    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'CONFLICT',
          message: 'Ya existe un recurso con los mismos datos.',
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'NOT_FOUND',
          message: 'No se encontro el recurso solicitado.',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorCode: 'INTERNAL_ERROR',
          message: GENERIC_INTERNAL_ERROR_MESSAGE,
        };
    }
  }

  private normalizeHttpMessage(responseBody: string | object, fallbackMessage: string): string {
    if (typeof responseBody === 'string') {
      return responseBody;
    }

    if (typeof responseBody !== 'object' || responseBody === null) {
      return fallbackMessage;
    }

    const maybeMessage = (responseBody as { message?: unknown }).message;

    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }

    if (Array.isArray(maybeMessage)) {
      const textParts = maybeMessage.filter((item): item is string => typeof item === 'string');
      return textParts.length > 0 ? textParts.join(' ') : fallbackMessage;
    }

    return fallbackMessage;
  }

  private resolveRequestId(request: Request): string {
    if (request.requestId && request.requestId.trim().length > 0) {
      return request.requestId;
    }

    const headerRequestId = request.headers['x-request-id'];

    if (typeof headerRequestId === 'string' && headerRequestId.trim().length > 0) {
      return headerRequestId;
    }

    if (Array.isArray(headerRequestId) && headerRequestId[0]?.trim()) {
      return headerRequestId[0];
    }

    const generatedRequestId = randomUUID();
    request.requestId = generatedRequestId;
    return generatedRequestId;
  }

  private logException(
    exception: unknown,
    request: Request,
    requestPath: string,
    requestId: string,
    statusCode: number,
    errorCode: string,
    sanitizedMessage: string,
  ): void {
    let rawMessage: string
    if (exception instanceof Error) {
      rawMessage = exception.message
    } else if (typeof exception === 'string') {
      rawMessage = exception
    } else {
      rawMessage = JSON.stringify(exception)
    }
    const stack = exception instanceof Error ? exception.stack : undefined;

    const metadata = {
      requestId,
      method: request.method,
      path: requestPath,
      statusCode,
      errorCode,
      message: sanitizedMessage,
      technicalMessage: rawMessage,
    };

    this.logger.error(JSON.stringify(metadata), stack);
  }

  private errorCodeForStatus(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return statusCode >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR';
    }
  }

  private defaultMessageForStatus(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'La solicitud no es valida.';
      case HttpStatus.UNAUTHORIZED:
        return 'No autorizado.';
      case HttpStatus.FORBIDDEN:
        return 'No tienes permisos para realizar esta accion.';
      case HttpStatus.NOT_FOUND:
        return 'No se encontro el recurso solicitado.';
      case HttpStatus.CONFLICT:
        return 'La solicitud entra en conflicto con el estado actual.';
      default:
        return statusCode >= 500
          ? GENERIC_INTERNAL_ERROR_MESSAGE
          : 'Se ha producido un error al procesar la solicitud.';
    }
  }

  private isPrismaLikeError(exception: unknown): exception is PrismaLikeError {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }

    const candidate = exception as PrismaLikeError;
    return candidate.name === 'PrismaClientKnownRequestError' && typeof candidate.code === 'string';
  }

  private resolveRequestPath(request: Request): string {
    if (typeof request.path === 'string' && request.path.length > 0) {
      return request.path;
    }

    return request.url;
  }
}

export { AllExceptionsFilter as GlobalExceptionFilter };
