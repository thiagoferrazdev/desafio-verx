import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SimpleLoggerService } from '../../../../../libs/observability/simple-logger.service';
import { PublishPendingOutboxUseCase } from '../../application/use-cases/publish-pending-outbox.use-case';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly publishPendingOutboxUseCase: PublishPendingOutboxUseCase,
    private readonly logger: SimpleLoggerService
  ) {}

  onModuleInit(): void {
    const interval = Number(process.env.OUTBOX_PUBLISH_INTERVAL_MS ?? 2000);

    this.timer = setInterval(async () => {
      try {
        const published = await this.publishPendingOutboxUseCase.execute();
        if (published > 0) {
          this.logger.log(`Published ${published} outbox event(s)`, OutboxPublisherService.name);
        }
      } catch (error) {
        this.logger.error('Failed to publish pending outbox events', String(error), OutboxPublisherService.name);
      }
    }, interval);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
