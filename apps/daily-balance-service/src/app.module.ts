import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { CorrelationIdMiddleware } from '../../../libs/observability/correlation-id.middleware';
import { HealthController } from '../../../libs/observability/health.controller';
import { SimpleLoggerService } from '../../../libs/observability/simple-logger.service';
import { PostgresService } from '../../../libs/shared-infra/database/postgres.service';
import { ApiKeyGuard } from '../../../libs/shared-infra/security/api-key.guard';
import { ApplyEntryToDailyBalanceUseCase } from './application/use-cases/apply-entry-to-daily-balance.use-case';
import { GetDailyBalanceUseCase } from './application/use-cases/get-daily-balance.use-case';
import { SqsPollerService } from './infrastructure/messaging/sqs-poller.service';
import { DailyBalanceRepository } from './infrastructure/persistence/daily-balance.repository';
import { PgTransactionManagerAdapter } from './infrastructure/persistence/pg-transaction-manager.adapter';
import { ProcessedMessageRepository } from './infrastructure/persistence/processed-message.repository';
import { DailyBalanceController } from './presentation/http/daily-balance.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [DailyBalanceController, HealthController],
  providers: [
    SimpleLoggerService,
    ApplyEntryToDailyBalanceUseCase,
    GetDailyBalanceUseCase,
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
    DailyBalanceRepository,
    ProcessedMessageRepository,
    PgTransactionManagerAdapter,
    {
      provide: 'DailyBalanceRepositoryPort',
      useExisting: DailyBalanceRepository
    },
    {
      provide: 'ProcessedMessageRepositoryPort',
      useExisting: ProcessedMessageRepository
    },
    {
      provide: 'TransactionManagerPort',
      useExisting: PgTransactionManagerAdapter
    },
    {
      provide: SqsPollerService,
      inject: [SQSClient, ApplyEntryToDailyBalanceUseCase, SimpleLoggerService],
      useFactory: (
        sqsClient: SQSClient,
        useCase: ApplyEntryToDailyBalanceUseCase,
        logger: SimpleLoggerService
      ) =>
        new SqsPollerService(
          sqsClient,
          useCase,
          logger,
          process.env.SQS_QUEUE_URL ?? 'http://localhost:9324/000000000000/entry-created'
        )
    }
  ]
})
export class DailyBalanceAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
