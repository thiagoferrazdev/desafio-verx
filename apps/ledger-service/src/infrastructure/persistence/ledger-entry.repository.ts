import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PostgresService } from '../../../../../libs/shared-infra/database/postgres.service';
import { EntryRepositoryPort } from '../../application/ports/entry-repository.port';
import { TransactionContext } from '../../application/ports/transaction-manager.port';
import { Entry } from '../../domain/entry.entity';
import { EntryType } from '../../domain/entry-type.enum';
import { PgTransactionContext } from './pg-transaction-manager.adapter';

interface EntryRow {
  id: string;
  merchant_id: string;
  type: EntryType;
  amount_cents: number;
  description: string | null;
  occurred_at: Date;
  created_at: Date;
}

@Injectable()
export class LedgerEntryRepository implements EntryRepositoryPort {
  constructor(private readonly postgresService: PostgresService) {}

  async save(entry: Entry, context?: TransactionContext): Promise<void> {
    const client = this.extractClient(context);
    await client.query(
      `insert into ledger.entries
        (id, merchant_id, type, amount_cents, description, occurred_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [entry.id, entry.merchantId, entry.type, entry.amount.cents, entry.description, entry.occurredAt, entry.createdAt]
    );
  }

  async findById(id: string): Promise<Entry | null> {
    const result = await this.postgresService.query<EntryRow>(
      `select id, merchant_id, type, amount_cents, description, occurred_at, created_at
         from ledger.entries
        where id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async listByMerchant(merchantId?: string): Promise<Entry[]> {
    const result = merchantId
      ? await this.postgresService.query<EntryRow>(
          `select id, merchant_id, type, amount_cents, description, occurred_at, created_at
             from ledger.entries
            where merchant_id = $1
            order by occurred_at desc, created_at desc`,
          [merchantId]
        )
      : await this.postgresService.query<EntryRow>(
          `select id, merchant_id, type, amount_cents, description, occurred_at, created_at
             from ledger.entries
            order by occurred_at desc, created_at desc`
        );

    return result.rows.map((row) => this.mapRow(row));
  }

  private extractClient(context?: TransactionContext): { query: (text: string, params?: unknown[]) => Promise<any> } {
    if (context && 'client' in context) {
      return (context as PgTransactionContext).client;
    }

    return this.postgresService;
  }

  private mapRow(row: EntryRow): Entry {
    return Entry.restore({
      id: row.id,
      merchantId: row.merchant_id,
      type: row.type,
      amountCents: row.amount_cents,
      description: row.description,
      occurredAt: row.occurred_at,
      createdAt: row.created_at
    });
  }
}
