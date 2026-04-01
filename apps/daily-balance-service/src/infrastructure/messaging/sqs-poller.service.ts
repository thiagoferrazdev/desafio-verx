import { DeleteMessageCommand, Message, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EntryCreatedEvent } from '../../../../../libs/contracts/entry-created.event';
import { SimpleLoggerService } from '../../../../../libs/observability/simple-logger.service';
import { ApplyEntryToDailyBalanceUseCase } from '../../application/use-cases/apply-entry-to-daily-balance.use-case';

@Injectable()
export class SqsPollerService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly sqsClient: SQSClient,
    private readonly applyEntryToDailyBalanceUseCase: ApplyEntryToDailyBalanceUseCase,
    private readonly logger: SimpleLoggerService,
    private readonly queueUrl: string
  ) {}

  onModuleInit(): void {
    const interval = Number(process.env.SQS_POLL_INTERVAL_MS ?? 2000);
    this.timer = setInterval(() => {
      void this.poll();
    }, interval);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async poll(): Promise<void> {
    try {
      const response = await this.sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 1
        })
      );

      const messages = response.Messages ?? [];
      for (const message of messages) {
        await this.processMessage(message);
      }
    } catch (error) {
      this.logger.error('Failed to poll SQS messages', String(error), SqsPollerService.name);
    }
  }

  private async processMessage(message: Message): Promise<void> {
    if (!message.Body || !message.MessageId || !message.ReceiptHandle) {
      return;
    }

    try {
      const event = JSON.parse(message.Body) as EntryCreatedEvent;
      await this.applyEntryToDailyBalanceUseCase.execute(message.MessageId, event);

      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle
        })
      );
    } catch (error) {
      this.logger.error(`Failed to process message ${message.MessageId}`, String(error), SqsPollerService.name);
    }
  }
}
