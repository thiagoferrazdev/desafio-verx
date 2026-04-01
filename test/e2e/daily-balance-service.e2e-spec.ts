import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ApiKeyGuard } from '../../libs/shared-infra/security/api-key.guard';
import { DailyBalanceController } from '../../apps/daily-balance-service/src/presentation/http/daily-balance.controller';
import { ApplyEntryToDailyBalanceUseCase } from '../../apps/daily-balance-service/src/application/use-cases/apply-entry-to-daily-balance.use-case';
import { GetDailyBalanceUseCase } from '../../apps/daily-balance-service/src/application/use-cases/get-daily-balance.use-case';
import {
  InMemoryBalanceTransactionManager,
  InMemoryDailyBalanceRepository,
  InMemoryProcessedMessageRepository
} from './fakes/in-memory-balance.adapters';

describe('Daily Balance API (e2e)', () => {
  let controller: DailyBalanceController;
  let applyEntryToDailyBalanceUseCase: ApplyEntryToDailyBalanceUseCase;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DailyBalanceController],
      providers: [
        ApplyEntryToDailyBalanceUseCase,
        GetDailyBalanceUseCase,
        InMemoryDailyBalanceRepository,
        InMemoryProcessedMessageRepository,
        InMemoryBalanceTransactionManager,
        {
          provide: 'DailyBalanceRepositoryPort',
          useExisting: InMemoryDailyBalanceRepository
        },
        {
          provide: 'ProcessedMessageRepositoryPort',
          useExisting: InMemoryProcessedMessageRepository
        },
        {
          provide: 'TransactionManagerPort',
          useExisting: InMemoryBalanceTransactionManager
        },
        {
          provide: ApiKeyGuard,
          useValue: { canActivate: () => true }
        },
        {
          provide: 'API_KEY',
          useValue: undefined
        }
      ]
    }).compile();

    controller = moduleRef.get(DailyBalanceController);
    applyEntryToDailyBalanceUseCase = moduleRef.get(ApplyEntryToDailyBalanceUseCase);
  });

  it('returns the consolidated daily balance after processing events', async () => {
    await applyEntryToDailyBalanceUseCase.execute('msg-1', {
      eventId: 'event-1',
      entryId: 'entry-1',
      merchantId: 'merchant-1',
      type: 'CREDIT',
      amountCents: 2000,
      description: 'Venda',
      occurredAt: '2026-03-31T10:00:00.000Z',
      createdAt: '2026-03-31T10:00:00.000Z'
    });

    await applyEntryToDailyBalanceUseCase.execute('msg-2', {
      eventId: 'event-2',
      entryId: 'entry-2',
      merchantId: 'merchant-1',
      type: 'DEBIT',
      amountCents: 500,
      description: 'Taxa',
      occurredAt: '2026-03-31T11:00:00.000Z',
      createdAt: '2026-03-31T11:00:00.000Z'
    });

    const response = await controller.getDailyBalance('merchant-1', '2026-03-31');

    expect(response).toMatchObject({
      merchantId: 'merchant-1',
      date: '2026-03-31',
      totalCredits: 20,
      totalDebits: 5,
      balance: 15
    });
  });

  it('throws 404 when there is no balance for the requested day', async () => {
    await expect(controller.getDailyBalance('merchant-unknown', '2026-03-31')).rejects.toMatchObject({
      statusCode: 404,
      code: 'DAILY_BALANCE_NOT_FOUND'
    });
  });
});
