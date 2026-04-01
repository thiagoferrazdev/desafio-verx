import { Inject, Injectable } from '@nestjs/common';
import { EntryCreatedEvent } from '../../../../../libs/contracts/entry-created.event';
import { DailyBalance } from '../../domain/daily-balance.entity';
import { DailyBalanceRepositoryPort } from '../ports/daily-balance-repository.port';
import { ProcessedMessageRepositoryPort } from '../ports/processed-message.repository.port';
import { TransactionManagerPort } from '../ports/transaction-manager.port';

@Injectable()
export class ApplyEntryToDailyBalanceUseCase {
  constructor(
    @Inject('DailyBalanceRepositoryPort')
    private readonly dailyBalanceRepository: DailyBalanceRepositoryPort,
    @Inject('ProcessedMessageRepositoryPort')
    private readonly processedMessageRepository: ProcessedMessageRepositoryPort,
    @Inject('TransactionManagerPort')
    private readonly transactionManager: TransactionManagerPort
  ) {}

  async execute(messageId: string, event: EntryCreatedEvent): Promise<void> {
    await this.transactionManager.runInTransaction(async (context) => {
      const alreadyProcessed = await this.processedMessageRepository.exists(messageId, context);
      if (alreadyProcessed) {
        return;
      }

      const balanceDate = event.occurredAt.slice(0, 10);
      const currentBalance =
        (await this.dailyBalanceRepository.findByMerchantAndDate(event.merchantId, balanceDate, context)) ??
        DailyBalance.initialize({
          merchantId: event.merchantId,
          balanceDate,
          lastEventId: event.eventId
        });

      const nextBalance =
        event.type === 'CREDIT'
          ? currentBalance.applyCredit(event.amountCents, event.eventId)
          : currentBalance.applyDebit(event.amountCents, event.eventId);

      await this.dailyBalanceRepository.upsert(nextBalance, context);
      await this.processedMessageRepository.save(messageId, context);
    });
  }
}
