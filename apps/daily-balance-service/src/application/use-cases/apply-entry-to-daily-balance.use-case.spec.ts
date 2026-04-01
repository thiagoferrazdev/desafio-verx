import { EntryCreatedEvent } from '../../../../../libs/contracts/entry-created.event';
import { DailyBalance } from '../../domain/daily-balance.entity';
import { DailyBalanceRepositoryPort } from '../ports/daily-balance-repository.port';
import { ProcessedMessageRepositoryPort } from '../ports/processed-message.repository.port';
import { TransactionContext, TransactionManagerPort } from '../ports/transaction-manager.port';
import { ApplyEntryToDailyBalanceUseCase } from './apply-entry-to-daily-balance.use-case';

describe('ApplyEntryToDailyBalanceUseCase', () => {
  it('applies a credit event to daily balance', async () => {
    let storedBalance: DailyBalance | null = null;

    const dailyBalanceRepository: jest.Mocked<DailyBalanceRepositoryPort> = {
      findByMerchantAndDate: jest.fn().mockImplementation(() => Promise.resolve(storedBalance)),
      upsert: jest.fn().mockImplementation(async (balance) => {
        storedBalance = balance;
      })
    };
    const processedMessageRepository: jest.Mocked<ProcessedMessageRepositoryPort> = {
      exists: jest.fn().mockResolvedValue(false),
      save: jest.fn()
    };
    const transactionManager: TransactionManagerPort = {
      runInTransaction: async <T>(work: (context: TransactionContext) => Promise<T>): Promise<T> => work({})
    };

    const useCase = new ApplyEntryToDailyBalanceUseCase(
      dailyBalanceRepository,
      processedMessageRepository,
      transactionManager
    );

    const event: EntryCreatedEvent = {
      eventId: 'event-1',
      entryId: 'entry-1',
      merchantId: 'merchant-1',
      type: 'CREDIT',
      amountCents: 1500,
      description: 'sale',
      occurredAt: '2026-03-31T10:00:00.000Z',
      createdAt: '2026-03-31T10:00:00.000Z'
    };

    await useCase.execute('msg-1', event);

    expect(dailyBalanceRepository.upsert).toHaveBeenCalledTimes(1);
    expect(dailyBalanceRepository.upsert).toHaveBeenCalledWith(expect.objectContaining({ balanceCents: 1500 }), {});
    expect(processedMessageRepository.save).toHaveBeenCalledWith('msg-1', {});
  });

  it('ignores duplicated messages', async () => {
    const dailyBalanceRepository: jest.Mocked<DailyBalanceRepositoryPort> = {
      findByMerchantAndDate: jest.fn(),
      upsert: jest.fn()
    };
    const processedMessageRepository: jest.Mocked<ProcessedMessageRepositoryPort> = {
      exists: jest.fn().mockResolvedValue(true),
      save: jest.fn()
    };
    const transactionManager: TransactionManagerPort = {
      runInTransaction: async <T>(work: (context: TransactionContext) => Promise<T>): Promise<T> => work({})
    };

    const useCase = new ApplyEntryToDailyBalanceUseCase(
      dailyBalanceRepository,
      processedMessageRepository,
      transactionManager
    );

    await useCase.execute('msg-1', {
      eventId: 'event-1',
      entryId: 'entry-1',
      merchantId: 'merchant-1',
      type: 'DEBIT',
      amountCents: 500,
      occurredAt: '2026-03-31T10:00:00.000Z',
      createdAt: '2026-03-31T10:00:00.000Z'
    });

    expect(dailyBalanceRepository.upsert).not.toHaveBeenCalled();
    expect(processedMessageRepository.save).not.toHaveBeenCalled();
  });
});
