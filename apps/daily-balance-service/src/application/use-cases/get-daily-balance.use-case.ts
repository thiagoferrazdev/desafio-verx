import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../../../libs/shared-kernel/app-exception';
import { DailyBalanceRepositoryPort } from '../ports/daily-balance-repository.port';

@Injectable()
export class GetDailyBalanceUseCase {
  constructor(
    @Inject('DailyBalanceRepositoryPort')
    private readonly dailyBalanceRepository: DailyBalanceRepositoryPort
  ) {}

  async execute(merchantId: string, date: string) {
    const balance = await this.dailyBalanceRepository.findByMerchantAndDate(merchantId, date);

    if (!balance) {
      throw new AppException('Daily balance not found', 404, 'DAILY_BALANCE_NOT_FOUND');
    }

    return balance;
  }
}
