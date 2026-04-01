import { EntryRepositoryPort } from '../ports/entry-repository.port';
import { OutboxRepositoryPort } from '../ports/outbox-repository.port';
import { RequestIdempotencyRepositoryPort } from '../ports/request-idempotency-repository.port';
import { TransactionContext, TransactionManagerPort } from '../ports/transaction-manager.port';
import { EntryType } from '../../domain/entry-type.enum';
import { CreateEntryUseCase } from './create-entry.use-case';

describe('CreateEntryUseCase', () => {
  it('creates an entry and persists outbox and idempotency data', async () => {
    const entryRepository: jest.Mocked<EntryRepositoryPort> = {
      save: jest.fn(),
      findById: jest.fn(),
      listByMerchant: jest.fn()
    };
    const idempotencyRepository: jest.Mocked<RequestIdempotencyRepositoryPort> = {
      findEntryIdByRequestId: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const outboxRepository: jest.Mocked<OutboxRepositoryPort> = {
      save: jest.fn(),
      listPending: jest.fn(),
      markPublished: jest.fn()
    };
    const transactionManager: TransactionManagerPort = {
      runInTransaction: async <T>(work: (context: TransactionContext) => Promise<T>): Promise<T> => work({})
    };

    const useCase = new CreateEntryUseCase(
      entryRepository,
      idempotencyRepository,
      outboxRepository,
      transactionManager
    );

    const result = await useCase.execute({
      merchantId: 'merchant-1',
      type: EntryType.CREDIT,
      amount: 10.5,
      description: 'sale',
      occurredAt: '2026-03-31T10:00:00.000Z',
      requestId: 'req-1'
    });

    expect(result.merchantId).toBe('merchant-1');
    expect(result.amount.cents).toBe(1050);
    expect(entryRepository.save).toHaveBeenCalledTimes(1);
    expect(idempotencyRepository.save).toHaveBeenCalledWith('req-1', result.id, {});
    expect(outboxRepository.save).toHaveBeenCalledTimes(1);
  });

  it('returns the existing entry when requestId is repeated', async () => {
    const existingEntry = {
      id: 'entry-1',
      merchantId: 'merchant-1',
      type: 'DEBIT',
      amount: { cents: 500, toDecimal: () => 5 },
      description: null,
      occurredAt: new Date('2026-03-31T10:00:00.000Z'),
      createdAt: new Date('2026-03-31T10:00:00.000Z')
    } as any;

    const entryRepository: jest.Mocked<EntryRepositoryPort> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(existingEntry),
      listByMerchant: jest.fn()
    };
    const idempotencyRepository: jest.Mocked<RequestIdempotencyRepositoryPort> = {
      findEntryIdByRequestId: jest.fn().mockResolvedValue('entry-1'),
      save: jest.fn()
    };
    const outboxRepository: jest.Mocked<OutboxRepositoryPort> = {
      save: jest.fn(),
      listPending: jest.fn(),
      markPublished: jest.fn()
    };
    const transactionManager: TransactionManagerPort = {
      runInTransaction: async <T>(work: (context: TransactionContext) => Promise<T>): Promise<T> => work({})
    };

    const useCase = new CreateEntryUseCase(
      entryRepository,
      idempotencyRepository,
      outboxRepository,
      transactionManager
    );

    const result = await useCase.execute({
      merchantId: 'merchant-1',
      type: EntryType.DEBIT,
      amount: 5,
      occurredAt: '2026-03-31T10:00:00.000Z',
      requestId: 'req-1'
    });

    expect(result.id).toBe('entry-1');
    expect(entryRepository.save).not.toHaveBeenCalled();
    expect(outboxRepository.save).not.toHaveBeenCalled();
  });
});
