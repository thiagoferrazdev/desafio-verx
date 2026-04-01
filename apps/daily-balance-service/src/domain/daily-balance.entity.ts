export class DailyBalance {
  private constructor(
    readonly merchantId: string,
    readonly balanceDate: string,
    readonly totalCreditsCents: number,
    readonly totalDebitsCents: number,
    readonly balanceCents: number,
    readonly lastEventId: string,
    readonly lastUpdatedAt: Date
  ) {}

  static initialize(params: {
    merchantId: string;
    balanceDate: string;
    lastEventId: string;
  }): DailyBalance {
    return new DailyBalance(params.merchantId, params.balanceDate, 0, 0, 0, params.lastEventId, new Date());
  }

  static restore(params: {
    merchantId: string;
    balanceDate: string;
    totalCreditsCents: number;
    totalDebitsCents: number;
    balanceCents: number;
    lastEventId: string;
    lastUpdatedAt: Date;
  }): DailyBalance {
    return new DailyBalance(
      params.merchantId,
      params.balanceDate,
      params.totalCreditsCents,
      params.totalDebitsCents,
      params.balanceCents,
      params.lastEventId,
      params.lastUpdatedAt
    );
  }

  applyCredit(amountCents: number, eventId: string): DailyBalance {
    return new DailyBalance(
      this.merchantId,
      this.balanceDate,
      this.totalCreditsCents + amountCents,
      this.totalDebitsCents,
      this.balanceCents + amountCents,
      eventId,
      new Date()
    );
  }

  applyDebit(amountCents: number, eventId: string): DailyBalance {
    return new DailyBalance(
      this.merchantId,
      this.balanceDate,
      this.totalCreditsCents,
      this.totalDebitsCents + amountCents,
      this.balanceCents - amountCents,
      eventId,
      new Date()
    );
  }
}
