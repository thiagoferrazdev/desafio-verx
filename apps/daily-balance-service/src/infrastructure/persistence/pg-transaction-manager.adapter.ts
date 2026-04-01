import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PostgresService } from '../../../../../libs/shared-infra/database/postgres.service';
import { TransactionContext, TransactionManagerPort } from '../../application/ports/transaction-manager.port';

export interface PgTransactionContext extends TransactionContext {
  client: PoolClient;
}

@Injectable()
export class PgTransactionManagerAdapter implements TransactionManagerPort {
  constructor(private readonly postgresService: PostgresService) {}

  runInTransaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return this.postgresService.transaction(async (client) => work({ client } satisfies PgTransactionContext));
  }
}
