import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { CorrelationIdMiddleware } from '../../../libs/observability/correlation-id.middleware';
import { HealthController } from '../../../libs/observability/health.controller';
import { SimpleLoggerService } from '../../../libs/observability/simple-logger.service';
import { PostgresService } from '../../../libs/shared-infra/database/postgres.service';
import { ApiKeyGuard } from '../../../libs/shared-infra/security/api-key.guard';
import { CreateEntryUseCase } from './application/use-cases/create-entry.use-case';
import { ListEntriesUseCase } from './application/use-cases/list-entries.use-case';
import { PublishPendingOutboxUseCase } from './application/use-cases/publish-pending-outbox.use-case';
import { OutboxPublisherService } from './infrastructure/messaging/outbox-publisher.service';
import { SqsEntryCreatedPublisher } from './infrastructure/messaging/sqs-entry-created.publisher';
import { LedgerEntryRepository } from './infrastructure/persistence/ledger-entry.repository';
import { OutboxRepository } from './infrastructure/persistence/outbox.repository';
import { PgTransactionManagerAdapter } from './infrastructure/persistence/pg-transaction-manager.adapter';
import { RequestIdempotencyRepository } from './infrastructure/persistence/request-idempotency.repository';
import { EntriesController } from './presentation/http/entries.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [EntriesController, HealthController],
  providers: [
    SimpleLoggerService,
    CreateEntryUseCase,
    ListEntriesUseCase,
    PublishPendingOutboxUseCase,
    OutboxPublisherService,
    {
      provide: PostgresService,
      useFactory: () =>
        new PostgresService({
          host: process.env.DB_HOST ?? 'localhost',
          port: Number(process.env.DB_PORT ?? 5432),
          database: process.env.DB_NAME ?? 'cashflow',
          user: process.env.DB_USER ?? 'cashflow',
          password: process.env.DB_PASSWORD ?? 'cashflow'
        })
    },
    {
      provide: SQSClient,
      useFactory: () =>
        new SQSClient({
          region: process.env.SQS_REGION ?? 'us-east-1',
          endpoint: process.env.SQS_ENDPOINT || undefined,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test'
          }
        })
    },
    {
      provide: 'API_KEY',
      useValue: process.env.API_KEY
    },
    {
      provide: ApiKeyGuard,
      useClass: ApiKeyGuard
    },
    LedgerEntryRepository,
    RequestIdempotencyRepository,
    OutboxRepository,
    PgTransactionManagerAdapter,
    {
      provide: 'EntryRepositoryPort',
      useExisting: LedgerEntryRepository
    },
    {
      provide: 'RequestIdempotencyRepositoryPort',
      useExisting: RequestIdempotencyRepository
    },
    {
      provide: 'OutboxRepositoryPort',
      useExisting: OutboxRepository
    },
    {
      provide: 'TransactionManagerPort',
      useExisting: PgTransactionManagerAdapter
    },
    {
      provide: 'IntegrationEventPublisherPort',
      inject: [SQSClient],
      useFactory: (sqsClient: SQSClient) =>
        new SqsEntryCreatedPublisher(
          sqsClient,
          process.env.SQS_QUEUE_URL ?? 'http://localhost:9324/000000000000/entry-created'
        )
    }
  ]
})
export class LedgerAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
