import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID_HEADER, ensureCorrelationId } from '../shared-kernel/correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const correlationId = ensureCorrelationId(request.header(CORRELATION_ID_HEADER));

    request.headers[CORRELATION_ID_HEADER] = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}
