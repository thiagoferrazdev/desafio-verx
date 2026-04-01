import { randomUUID } from 'crypto';

export class OutboxEvent {
  private constructor(
    readonly id: string,
    readonly aggregateId: string,
    readonly eventType: string,
    readonly payload: Record<string, unknown>,
    readonly status: 'PENDING' | 'PUBLISHED',
    readonly createdAt: Date
  ) {}

  static pending(aggregateId: string, eventType: string, payload: Record<string, unknown>): OutboxEvent {
    return new OutboxEvent(randomUUID(), aggregateId, eventType, payload, 'PENDING', new Date());
  }

  static restore(params: {
    id: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: 'PENDING' | 'PUBLISHED';
    createdAt: Date;
  }): OutboxEvent {
    return new OutboxEvent(
      params.id,
      params.aggregateId,
      params.eventType,
      params.payload,
      params.status,
      params.createdAt
    );
  }
}
