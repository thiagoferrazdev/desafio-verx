import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../../../../../libs/shared-infra/security/api-key.guard';
import { CreateEntryUseCase } from '../../application/use-cases/create-entry.use-case';
import { ListEntriesUseCase } from '../../application/use-cases/list-entries.use-case';
import { CreateEntryRequest } from './dto/create-entry.request';

@Controller()
@UseGuards(ApiKeyGuard)
export class EntriesController {
  constructor(
    private readonly createEntryUseCase: CreateEntryUseCase,
    private readonly listEntriesUseCase: ListEntriesUseCase
  ) {}

  @Post('entries')
  async create(@Body() request: CreateEntryRequest) {
    const entry = await this.createEntryUseCase.execute(request);

    return {
      entryId: entry.id,
      merchantId: entry.merchantId,
      type: entry.type,
      amount: entry.amount.toDecimal(),
      description: entry.description,
      occurredAt: entry.occurredAt.toISOString(),
      createdAt: entry.createdAt.toISOString()
    };
  }

  @Get('entries')
  async list(@Query('merchantId') merchantId?: string) {
    const entries = await this.listEntriesUseCase.execute(merchantId);

    return entries.map((entry) => ({
      entryId: entry.id,
      merchantId: entry.merchantId,
      type: entry.type,
      amount: entry.amount.toDecimal(),
      description: entry.description,
      occurredAt: entry.occurredAt.toISOString(),
      createdAt: entry.createdAt.toISOString()
    }));
  }
}
