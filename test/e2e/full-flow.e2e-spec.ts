import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiKeyGuard } from '../../libs/shared-infra/security/api-key.guard';
import { EntriesController } from '../../apps/ledger-service/src/presentation/http/entries.controller';
import { CreateEntryRequest } from '../../apps/ledger-service/src/presentation/http/dto/create-entry.request';
import { DailyBalanceController } from '../../apps/daily-balance-service/src/presentation/http/daily-balance.controller';
import { CreateEntryUseCase } from '../../apps/ledger-service/src/application/use-cases/create-entry.use-case';
import { ListEntriesUseCase } from '../../apps/ledger-service/src/application/use-cases/list-entries.use-case';
import { PublishPendingOutboxUseCase } from '../../apps/ledger-service/src/application/use-cases/publish-pending-outbox.use-case';
import { ApplyEntryToDailyBalanceUseCase } from '../../apps/daily-balance-service/src/application/use-cases/apply-entry-to-daily-balance.use-case';
import { GetDailyBalanceUseCase } from '../../apps/daily-balance-service/src/application/use-cases/get-daily-balance.use-case';
import { IntegrationEventPublisherPort } from '../../apps/ledger-service/src/application/ports/integration-event-publisher.port';
import {
  InMemoryLedgerEntryRepository,
  InMemoryOutboxRepository,
  InMemoryRequestIdempotencyRepository,
  InMemoryTransactionManager
} from './fakes/in-memory-ledger.adapters';
import {
  InMemoryBalanceTransactionManager,
  InMemoryDailyBalanceRepository,
  InMemoryEventInbox,
  InMemoryProcessedMessageRepository
} from './fakes/in-memory-balance.adapters';
import { EntryCreatedEvent } from '../../libs/contracts/entry-created.event';

class InMemoryIntegrationPublisher implements IntegrationEventPublisherPort {
  constructor(private readonly inbox: InMemoryEventInbox) {}

  async publishEntryCreated(event: EntryCreatedEvent): Promise<void> {
    this.inbox.push(event);
  }
}

describe('Full flow APIs (e2e)', () => {
  let ledgerController: EntriesController;
  let balanceController: DailyBalanceController;
  let publishPendingOutboxUseCase: PublishPendingOutboxUseCase;
  let applyEntryToDailyBalanceUseCase: ApplyEntryToDailyBalanceUseCase;
  let inbox: InMemoryEventInbox;

  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true
  });

  beforeEach(async () => {
    inbox = new InMemoryEventInbox();

    const ledgerModule = await Test.createTestingModule({
      controllers: [EntriesController],
      providers: [
        CreateEntryUseCase,
        ListEntriesUseCase,
        PublishPendingOutboxUseCase,
        InMemoryLedgerEntryRepository,
        InMemoryRequestIdempotencyRepository,
        InMemoryOutboxRepository,
        InMemoryTransactionManager,
        {
          provide: 'EntryRepositoryPort',
          useExisting: InMemoryLedgerEntryRepository
        },
        {
          provide: 'RequestIdempotencyRepositoryPort',
          useExisting: InMemoryRequestIdempotencyRepository
        },
        {
          provide: 'OutboxRepositoryPort',
          useExisting: InMemoryOutboxRepository
        },
        {
          provide: 'TransactionManagerPort',
          useExisting: InMemoryTransactionManager
        },
        {
          provide: 'IntegrationEventPublisherPort',
          useFactory: () => new InMemoryIntegrationPublisher(inbox)
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

    ledgerController = ledgerModule.get(EntriesController);
    publishPendingOutboxUseCase = ledgerModule.get(PublishPendingOutboxUseCase);

    const balanceModule = await Test.createTestingModule({
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

    balanceController = balanceModule.get(DailyBalanceController);
    applyEntryToDailyBalanceUseCase = balanceModule.get(ApplyEntryToDailyBalanceUseCase);
  });

  it('creates entries in ledger and exposes the final daily balance through the balance API', async () => {
    const credit = (await validationPipe.transform(
      {
        merchantId: 'merchant-1',
        type: 'CREDIT',
        amount: 30,
        description: 'Venda',
        occurredAt: '2026-03-31T10:00:00.000Z',
        requestId: 'req-100'
      },
      { type: 'body', metatype: CreateEntryRequest, data: '' }
    )) as CreateEntryRequest;

    const debit = (await validationPipe.transform(
      {
        merchantId: 'merchant-1',
        type: 'DEBIT',
        amount: 12,
        description: 'Saque',
        occurredAt: '2026-03-31T12:00:00.000Z',
        requestId: 'req-101'
      },
      { type: 'body', metatype: CreateEntryRequest, data: '' }
    )) as CreateEntryRequest;

    await ledgerController.create(credit);
    await ledgerController.create(debit);

    await publishPendingOutboxUseCase.execute();

    const events = inbox.all();
    for (let index = 0; index < events.length; index += 1) {
      await applyEntryToDailyBalanceUseCase.execute(`msg-${index + 1}`, events[index]);
    }

    const response = await balanceController.getDailyBalance('merchant-1', '2026-03-31');

    expect(response.totalCredits).toBe(30);
    expect(response.totalDebits).toBe(12);
    expect(response.balance).toBe(18);
  });
});
