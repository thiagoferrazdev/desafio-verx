import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../../../../../libs/shared-infra/security/api-key.guard';
import { GetDailyBalanceUseCase } from '../../application/use-cases/get-daily-balance.use-case';

@Controller()
@UseGuards(ApiKeyGuard)
export class DailyBalanceController {
  constructor(private readonly getDailyBalanceUseCase: GetDailyBalanceUseCase) {}

  @Get('daily-balance')
  async getDailyBalance(@Query('merchantId') merchantId: string, @Query('date') date: string) {
    const balance = await this.getDailyBalanceUseCase.execute(merchantId, date);

    return {
      merchantId: balance.merchantId,
      date: balance.balanceDate,
      totalCredits: balance.totalCreditsCents / 100,
      totalDebits: balance.totalDebitsCents / 100,
      balance: balance.balanceCents / 100,
      lastUpdatedAt: balance.lastUpdatedAt.toISOString()
    };
  }
}
