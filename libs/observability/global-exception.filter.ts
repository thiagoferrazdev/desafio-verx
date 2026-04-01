import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../shared-kernel/app-exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof AppException) {
      response.status(exception.statusCode).json({
        message: exception.message,
        code: exception.code,
        path: request.url,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        message: exception.message,
        code: 'HTTP_EXCEPTION',
        path: request.url,
        timestamp: new Date().toISOString()
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }
}
