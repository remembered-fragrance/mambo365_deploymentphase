import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '../domain/errors';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? 'unknown';

    if (exception instanceof AppError) {
      res.status(exception.status).json({
        requestId,
        code: exception.hideExistence ? 'PERMISSION_DENIED' : exception.code,
        message: exception.message,
        fieldErrors: exception.fieldErrors,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const obj = typeof body === 'object' && body ? (body as Record<string, unknown>) : {};
      res.status(exception.getStatus()).json({
        requestId,
        code: obj.code ?? (exception.getStatus() === 401 ? 'UNAUTHENTICATED' : 'VALIDATION_FAILED'),
        message: obj.message ?? exception.message,
        fieldErrors: obj.fieldErrors ?? [],
      });
      return;
    }

    const error = exception as { name?: string; code?: string };
    this.log.error({ requestId, error: error?.name ?? 'UnknownError', code: error?.code });
    res.status(500).json({
      requestId,
      code: 'INTERNAL_ERROR',
      message: 'Lỗi hệ thống.',
      fieldErrors: [],
    });
  }
}
