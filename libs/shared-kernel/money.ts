export class Money {
  private constructor(private readonly centsValue: number) {}

  static fromDecimal(amount: number): Money {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    return new Money(Math.round(amount * 100));
  }

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents) || cents <= 0) {
      throw new Error('Amount cents must be a positive integer');
    }

    return new Money(cents);
  }

  get cents(): number {
    return this.centsValue;
  }

  toDecimal(): number {
    return this.centsValue / 100;
  }
}
