import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export function ensureCorrelationId(value?: string): string {
  return value && value.trim().length > 0 ? value : randomUUID();
}
