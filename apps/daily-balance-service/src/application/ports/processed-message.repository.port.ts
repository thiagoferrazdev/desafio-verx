import { TransactionContext } from './transaction-manager.port';

export interface ProcessedMessageRepositoryPort {
  exists(messageId: string, context?: TransactionContext): Promise<boolean>;
  save(messageId: string, context?: TransactionContext): Promise<void>;
}
