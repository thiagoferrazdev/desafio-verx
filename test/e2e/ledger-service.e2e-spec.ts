import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiKeyGuard } from '../../libs/shared-infra/security/api-key.guard';
import { EntriesController } from '../../apps/ledger-service/src/presentation/http/entries.controller';
import { CreateEntryRequest } from '../../apps/ledger-service/src/presentation/http/dto/create-entry.request';
import { CreateEntryUseCase } from '../../apps/ledger-service/src/application/use-cases/create-entry.use-case';
import { ListEntriesUseCase } from '../../apps/ledger-service/src/application/use-cases/list-entries.use-case';
import {
  InMemoryLedgerEntryRepository,
  InMemoryOutboxRepository,
  InMemoryRequestIdempotencyRepository,
  InMemoryTransactionManager
} from './fakes/in-memory-ledger.adapters';

describe('Ledger API (e2e)', () => {
  let controller: EntriesController;
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EntriesController],
      providers: [
        CreateEntryUseCase,
        ListEntriesUseCase,
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
          provide: ApiKeyGuard,
          useValue: { canActivate: () => true }
        },
        {
          provide: 'API_KEY',
          useValue: undefined
        }
      ]
    }).compile();

    controller = moduleRef.get(EntriesController);
  });

  it('creates an entry and lists it', async () => {
    const payload = (await validationPipe.transform(
      {
        merchantId: 'merchant-1',
        type: 'CREDIT',
        amount: 10.5,
        description: 'Venda',
        occurredAt: '2026-03-31T10:00:00.000Z',
        requestId: 'req-1'
      },
      { type: 'body', metatype: CreateEntryRequest, data: '' }
    )) as CreateEntryRequest;

    const created = await controller.create(payload);

    expect(created.merchantId).toBe('merchant-1');
    expect(created.amount).toBe(10.5);

    const list = await controller.list('merchant-1');

    expect(list).toHaveLength(1);
    expect(list[0].entryId).toBe(created.entryId);
  });

  it('honors request idempotency on repeated POST', async () => {
    const payload = (await validationPipe.transform(
      {
        merchantId: 'merchant-1',
        type: 'DEBIT',
        amount: 5,
        description: 'Compra',
        occurredAt: '2026-03-31T11:00:00.000Z',
        requestId: 'req-2'
      },
      { type: 'body', metatype: CreateEntryRequest, data: '' }
    )) as CreateEntryRequest;

    const first = await controller.create(payload);
    const second = await controller.create(payload);

    expect(second.entryId).toBe(first.entryId);

    const list = await controller.list('merchant-1');
    expect(list).toHaveLength(1);
  });
});
