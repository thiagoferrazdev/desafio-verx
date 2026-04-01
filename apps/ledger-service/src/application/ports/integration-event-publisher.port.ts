import { EntryCreatedEvent } from '../../../../../libs/contracts/entry-created.event';

export interface IntegrationEventPublisherPort {
  publishEntryCreated(event: EntryCreatedEvent): Promise<void>;
}
