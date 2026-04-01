import { DailyBalance } from '../../domain/daily-balance.entity';
import { TransactionContext } from './transaction-manager.port';

export interface DailyBalanceRepositoryPort {
  findByMerchantAndDate(merchantId: string, balanceDate: string, context?: TransactionContext): Promise<DailyBalance | null>;
  upsert(balance: DailyBalance, context?: TransactionContext): Promise<void>;
}
