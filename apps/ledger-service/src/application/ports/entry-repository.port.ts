import { Entry } from '../../domain/entry.entity';
import { TransactionContext } from './transaction-manager.port';

export interface EntryRepositoryPort {
  save(entry: Entry, context?: TransactionContext): Promise<void>;
  findById(id: string): Promise<Entry | null>;
  listByMerchant(merchantId?: string): Promise<Entry[]>;
}
