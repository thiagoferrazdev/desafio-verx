import { Entry } from '../../../apps/ledger-service/src/domain/entry.entity';
import { OutboxEvent } from '../../../apps/ledger-service/src/domain/outbox-event.entity';
import { EntryRepositoryPort } from '../../../apps/ledger-service/src/application/ports/entry-repository.port';
import { OutboxRepositoryPort } from '../../../apps/ledger-service/src/application/ports/outbox-repository.port';
import { RequestIdempotencyRepositoryPort } from '../../../apps/ledger-service/src/application/ports/request-idempotency-repository.port';
import { TransactionContext, TransactionManagerPort } from '../../../apps/ledger-service/src/application/ports/transaction-manager.port';

export class InMemoryLedgerEntryRepository implements EntryRepositoryPort {
  private readonly entries = new Map<string, Entry>();

  async save(entry: Entry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async findById(id: string): Promise<Entry | null> {
    return this.entries.get(id) ?? null;
  }

  async listByMerchant(merchantId?: string): Promise<Entry[]> {
    const values = Array.from(this.entries.values());
    return merchantId ? values.filter((entry) => entry.merchantId === merchantId) : values;
  }
}

export class InMemoryRequestIdempotencyRepository implements RequestIdempotencyRepositoryPort {
  private readonly data = new Map<string, string>();

  async findEntryIdByRequestId(requestId: string): Promise<string | null> {
    return this.data.get(requestId) ?? null;
  }

  async save(requestId: string, entryId: string): Promise<void> {
    this.data.set(requestId, entryId);
  }
}

export class InMemoryOutboxRepository implements OutboxRepositoryPort {
  private readonly events = new Map<string, OutboxEvent>();

  async save(event: OutboxEvent): Promise<void> {
    this.events.set(event.id, event);
  }

  async listPending(limit: number): Promise<OutboxEvent[]> {
    return Array.from(this.events.values())
      .filter((event) => event.status === 'PENDING')
      .slice(0, limit);
  }

  async markPublished(id: string): Promise<void> {
    const current = this.events.get(id);
    if (!current) {
      return;
    }

    this.events.set(
      id,
      OutboxEvent.restore({
        id: current.id,
        aggregateId: current.aggregateId,
        eventType: current.eventType,
        payload: current.payload,
        status: 'PUBLISHED',
        createdAt: current.createdAt
      })
    );
  }
}

export class InMemoryTransactionManager implements TransactionManagerPort {
  async runInTransaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return work({});
  }
}
