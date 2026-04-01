import { Inject, Injectable } from '@nestjs/common';
import { EntryCreatedEvent } from '../../../../../libs/contracts/entry-created.event';
import { IntegrationEventPublisherPort } from '../ports/integration-event-publisher.port';
import { OutboxRepositoryPort } from '../ports/outbox-repository.port';

@Injectable()
export class PublishPendingOutboxUseCase {
  constructor(
    @Inject('OutboxRepositoryPort')
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject('IntegrationEventPublisherPort')
    private readonly publisher: IntegrationEventPublisherPort
  ) {}

  async execute(): Promise<number> {
    const pendingEvents = await this.outboxRepository.listPending(20);

    for (const event of pendingEvents) {
      await this.publisher.publishEntryCreated(event.payload as unknown as EntryCreatedEvent);
      await this.outboxRepository.markPublished(event.id);
    }

    return pendingEvents.length;
  }
}
