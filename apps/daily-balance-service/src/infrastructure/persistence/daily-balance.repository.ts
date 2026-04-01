import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PostgresService } from '../../../../../libs/shared-infra/database/postgres.service';
import { DailyBalanceRepositoryPort } from '../../application/ports/daily-balance-repository.port';
import { TransactionContext } from '../../application/ports/transaction-manager.port';
import { DailyBalance } from '../../domain/daily-balance.entity';
import { PgTransactionContext } from './pg-transaction-manager.adapter';

interface DailyBalanceRow {
  merchant_id: string;
  balance_date: string;
  total_credits_cents: number;
  total_debits_cents: number;
  balance_cents: number;
  last_event_id: string;
  last_updated_at: Date;
}

@Injectable()
export class DailyBalanceRepository implements DailyBalanceRepositoryPort {
  constructor(private readonly postgresService: PostgresService) {}

  async findByMerchantAndDate(
    merchantId: string,
    balanceDate: string,
    context?: TransactionContext
  ): Promise<DailyBalance | null> {
    const client = this.extractClient(context);
    const result = await client.query(
      `select merchant_id, balance_date::text, total_credits_cents, total_debits_cents,
              balance_cents, last_event_id, last_updated_at
         from balance.daily_balances
        where merchant_id = $1 and balance_date = $2`,
      [merchantId, balanceDate]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapRow(result.rows[0] as DailyBalanceRow);
  }

  async upsert(balance: DailyBalance, context?: TransactionContext): Promise<void> {
    const client = this.extractClient(context);
    await client.query(
      `insert into balance.daily_balances
        (merchant_id, balance_date, total_credits_cents, total_debits_cents, balance_cents, last_event_id, last_updated_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (merchant_id, balance_date)
       do update set
         total_credits_cents = excluded.total_credits_cents,
         total_debits_cents = excluded.total_debits_cents,
         balance_cents = excluded.balance_cents,
         last_event_id = excluded.last_event_id,
         last_updated_at = excluded.last_updated_at`,
      [
        balance.merchantId,
        balance.balanceDate,
        balance.totalCreditsCents,
        balance.totalDebitsCents,
        balance.balanceCents,
        balance.lastEventId,
        balance.lastUpdatedAt
      ]
    );
  }

  private extractClient(context?: TransactionContext): { query: (text: string, params?: unknown[]) => Promise<any> } {
    if (context && 'client' in context) {
      return (context as PgTransactionContext).client;
    }

    return this.postgresService;
  }

  private mapRow(row: DailyBalanceRow): DailyBalance {
    return DailyBalance.restore({
      merchantId: row.merchant_id,
      balanceDate: row.balance_date,
      totalCreditsCents: row.total_credits_cents,
      totalDebitsCents: row.total_debits_cents,
      balanceCents: row.balance_cents,
      lastEventId: row.last_event_id,
      lastUpdatedAt: row.last_updated_at
    });
  }
}
