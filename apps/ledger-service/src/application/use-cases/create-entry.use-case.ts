import { Inject, Injectable } from '@nestjs/common';
import { EntryCreatedEvent } from '../../../../../libs/contracts/entry-created.event';
import { AppException } from '../../../../../libs/shared-kernel/app-exception';
import { Money } from '../../../../../libs/shared-kernel/money';
import { Entry } from '../../domain/entry.entity';
import { EntryType } from '../../domain/entry-type.enum';
import { OutboxEvent } from '../../domain/outbox-event.entity';
import { CreateEntryCommand } from '../dto/create-entry.command';
import { EntryRepositoryPort } from '../ports/entry-repository.port';
import { OutboxRepositoryPort } from '../ports/outbox-repository.port';
import { RequestIdempotencyRepositoryPort } from '../ports/request-idempotency-repository.port';
import { TransactionManagerPort } from '../ports/transaction-manager.port';

@Injectable()
export class CreateEntryUseCase {
  constructor(
    @Inject('EntryRepositoryPort')
    private readonly entryRepository: EntryRepositoryPort,
    @Inject('RequestIdempotencyRepositoryPort')
    private readonly idempotencyRepository: RequestIdempotencyRepositoryPort,
    @Inject('OutboxRepositoryPort')
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject('TransactionManagerPort')
    private readonly transactionManager: TransactionManagerPort
  ) {}

  async execute(command: CreateEntryCommand): Promise<Entry> {
    if (!Object.values(EntryType).includes(command.type)) {
      throw new AppException('Unsupported entry type', 400, 'INVALID_ENTRY_TYPE');
    }

    const existingEntryId = await this.idempotencyRepository.findEntryIdByRequestId(command.requestId);
    if (existingEntryId) {
      const existingEntry = await this.entryRepository.findById(existingEntryId);
      if (!existingEntry) {
        throw new AppException('Idempotent entry not found', 500, 'IDEMPOTENCY_INCONSISTENCY');
      }
      return existingEntry;
    }

    const entry = Entry.create({
      merchantId: command.merchantId,
      type: command.type,
      amount: Money.fromDecimal(command.amount),
      description: command.description,
      occurredAt: new Date(command.occurredAt)
    });

    const integrationEvent: EntryCreatedEvent = {
      eventId: entry.id,
      entryId: entry.id,
      merchantId: entry.merchantId,
      type: entry.type,
      amountCents: entry.amount.cents,
      description: entry.description,
      occurredAt: entry.occurredAt.toISOString(),
      createdAt: entry.createdAt.toISOString()
    };

    const outboxEvent = OutboxEvent.pending(
      entry.id,
      'ledger.entry.created',
      integrationEvent as unknown as Record<string, unknown>
    );

    await this.transactionManager.runInTransaction(async (context) => {
      await this.entryRepository.save(entry, context);
      await this.idempotencyRepository.save(command.requestId, entry.id, context);
      await this.outboxRepository.save(outboxEvent, context);
    });

    return entry;
  }
}
