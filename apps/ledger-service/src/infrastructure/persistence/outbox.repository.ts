import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PostgresService } from '../../../../../libs/shared-infra/database/postgres.service';
import { OutboxRepositoryPort } from '../../application/ports/outbox-repository.port';
import { TransactionContext } from '../../application/ports/transaction-manager.port';
import { OutboxEvent } from '../../domain/outbox-event.entity';
import { PgTransactionContext } from './pg-transaction-manager.adapter';

interface OutboxRow {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED';
  created_at: Date;
}

@Injectable()
export class OutboxRepository implements OutboxRepositoryPort {
  constructor(private readonly postgresService: PostgresService) {}

  async save(event: OutboxEvent, context?: TransactionContext): Promise<void> {
    const client = this.extractClient(context);
    await client.query(
      `insert into ledger.outbox_events
        (id, aggregate_id, event_type, payload, status, created_at)
       values ($1, $2, $3, $4::jsonb, $5, $6)`,
      [event.id, event.aggregateId, event.eventType, JSON.stringify(event.payload), event.status, event.createdAt]
    );
  }

  async listPending(limit: number): Promise<OutboxEvent[]> {
    const result = await this.postgresService.query<OutboxRow>(
      `select id, aggregate_id, event_type, payload, status, created_at
         from ledger.outbox_events
        where status = 'PENDING'
        order by created_at asc
        limit $1`,
      [limit]
    );

    return result.rows.map((row) =>
      OutboxEvent.restore({
        id: row.id,
        aggregateId: row.aggregate_id,
        eventType: row.event_type,
        payload: row.payload,
        status: row.status,
        createdAt: row.created_at
      })
    );
  }

  async markPublished(id: string): Promise<void> {
    await this.postgresService.query(
      `update ledger.outbox_events
          set status = 'PUBLISHED',
              published_at = now()
        where id = $1`,
      [id]
    );
  }

  private extractClient(context?: TransactionContext): { query: (text: string, params?: unknown[]) => Promise<any> } {
    if (context && 'client' in context) {
      return (context as PgTransactionContext).client;
    }

    return this.postgresService;
  }
}
