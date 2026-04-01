import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PostgresService } from '../../../../../libs/shared-infra/database/postgres.service';
import { ProcessedMessageRepositoryPort } from '../../application/ports/processed-message.repository.port';
import { TransactionContext } from '../../application/ports/transaction-manager.port';
import { PgTransactionContext } from './pg-transaction-manager.adapter';

@Injectable()
export class ProcessedMessageRepository implements ProcessedMessageRepositoryPort {
  constructor(private readonly postgresService: PostgresService) {}

  async exists(messageId: string, context?: TransactionContext): Promise<boolean> {
    const client = this.extractClient(context);
    const result = await client.query(`select 1 from balance.processed_messages where message_id = $1`, [messageId]);
    return result.rowCount > 0;
  }

  async save(messageId: string, context?: TransactionContext): Promise<void> {
    const client = this.extractClient(context);
    await client.query(`insert into balance.processed_messages (message_id) values ($1)`, [messageId]);
  }

  private extractClient(context?: TransactionContext): { query: (text: string, params?: unknown[]) => Promise<any> } {
    if (context && 'client' in context) {
      return (context as PgTransactionContext).client;
    }

    return this.postgresService;
  }
}
