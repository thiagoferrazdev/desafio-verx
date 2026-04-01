import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GlobalExceptionFilter } from '../../../libs/observability/global-exception.filter';
import { SimpleLoggerService } from '../../../libs/observability/simple-logger.service';
import { DailyBalanceAppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(DailyBalanceAppModule, {
    logger: new SimpleLoggerService()
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.DAILY_BALANCE_PORT ?? 3001);
  await app.listen(port);
}

bootstrap();
