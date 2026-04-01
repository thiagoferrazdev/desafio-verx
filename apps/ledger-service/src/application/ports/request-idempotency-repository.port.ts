import { TransactionContext } from './transaction-manager.port';

export interface RequestIdempotencyRepositoryPort {
  findEntryIdByRequestId(requestId: string, context?: TransactionContext): Promise<string | null>;
  save(requestId: string, entryId: string, context?: TransactionContext): Promise<void>;
}
