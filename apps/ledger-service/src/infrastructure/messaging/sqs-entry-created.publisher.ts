import { Injectable } from '@nestjs/common';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { EntryCreatedEvent } from '../../../../../libs/contracts/entry-created.event';
import { IntegrationEventPublisherPort } from '../../application/ports/integration-event-publisher.port';

@Injectable()
export class SqsEntryCreatedPublisher implements IntegrationEventPublisherPort {
  constructor(
    private readonly sqsClient: SQSClient,
    private readonly queueUrl: string
  ) {}

  async publishEntryCreated(event: EntryCreatedEvent): Promise<void> {
    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(event)
      })
    );
  }
}
