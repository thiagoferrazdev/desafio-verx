import { OutboxEvent } from '../../domain/outbox-event.entity';
import { TransactionContext } from './transaction-manager.port';

export interface OutboxRepositoryPort {
  save(event: OutboxEvent, context?: TransactionContext): Promise<void>;
  listPending(limit: number): Promise<OutboxEvent[]>;
  markPublished(id: string): Promise<void>;
}
