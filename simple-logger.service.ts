import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class SimpleLoggerService implements LoggerService {
  log(message: string, context?: string): void {
    console.log(JSON.stringify({ level: 'info', context, message, timestamp: new Date().toISOString() }));
  }

  error(message: string, trace?: string, context?: string): void {
    console.error(JSON.stringify({ level: 'error', context, message, trace, timestamp: new Date().toISOString() }));
  }

  warn(message: string, context?: string): void {
    console.warn(JSON.stringify({ level: 'warn', context, message, timestamp: new Date().toISOString() }));
  }

  debug(message: string, context?: string): void {
    console.debug(JSON.stringify({ level: 'debug', context, message, timestamp: new Date().toISOString() }));
  }
}
