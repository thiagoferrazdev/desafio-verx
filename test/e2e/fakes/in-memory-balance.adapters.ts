import { EntryCreatedEvent } from '../../../libs/contracts/entry-created.event';
import { DailyBalance } from '../../../apps/daily-balance-service/src/domain/daily-balance.entity';
import { DailyBalanceRepositoryPort } from '../../../apps/daily-balance-service/src/application/ports/daily-balance-repository.port';
import { ProcessedMessageRepositoryPort } from '../../../apps/daily-balance-service/src/application/ports/processed-message.repository.port';
import { TransactionContext, TransactionManagerPort } from '../../../apps/daily-balance-service/src/application/ports/transaction-manager.port';

export class InMemoryDailyBalanceRepository implements DailyBalanceRepositoryPort {
  private readonly balances = new Map<string, DailyBalance>();

  async findByMerchantAndDate(merchantId: string, balanceDate: string): Promise<DailyBalance | null> {
    return this.balances.get(`${merchantId}:${balanceDate}`) ?? null;
  }

  async upsert(balance: DailyBalance): Promise<void> {
    this.balances.set(`${balance.merchantId}:${balance.balanceDate}`, balance);
  }
}

export class InMemoryProcessedMessageRepository implements ProcessedMessageRepositoryPort {
  private readonly messages = new Set<string>();

  async exists(messageId: string): Promise<boolean> {
    return this.messages.has(messageId);
  }

  async save(messageId: string): Promise<void> {
    this.messages.add(messageId);
  }
}

export class InMemoryBalanceTransactionManager implements TransactionManagerPort {
  async runInTransaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return work({});
  }
}

export class InMemoryEventInbox {
  private readonly events: EntryCreatedEvent[] = [];

  push(event: EntryCreatedEvent): void {
    this.events.push(event);
  }

  all(): EntryCreatedEvent[] {
    return [...this.events];
  }
}
