import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PostgresService } from '../../../../../libs/shared-infra/database/postgres.service';
import { RequestIdempotencyRepositoryPort } from '../../application/ports/request-idempotency-repository.port';
import { TransactionContext } from '../../application/ports/transaction-manager.port';
import { PgTransactionContext } from './pg-transaction-manager.adapter';

@Injectable()
export class RequestIdempotencyRepository implements RequestIdempotencyRepositoryPort {
  constructor(private readonly postgresService: PostgresService) {}

  async findEntryIdByRequestId(requestId: string, context?: TransactionContext): Promise<string | null> {
    const client = this.extractClient(context);
    const result = await client.query(
      `select entry_id from ledger.request_idempotency where request_id = $1`,
      [requestId]
    );

    return result.rowCount ? (result.rows[0] as { entry_id: string }).entry_id : null;
  }

  async save(requestId: string, entryId: string, context?: TransactionContext): Promise<void> {
    const client = this.extractClient(context);
    await client.query(
      `insert into ledger.request_idempotency (request_id, entry_id) values ($1, $2)`,
      [requestId, entryId]
    );
  }

  private extractClient(context?: TransactionContext): { query: (text: string, params?: unknown[]) => Promise<any> } {
    if (context && 'client' in context) {
      return (context as PgTransactionContext).client;
    }

    return this.postgresService;
  }
}
