import { Money } from './money';

describe('Money', () => {
  it('converts decimal value into cents', () => {
    const money = Money.fromDecimal(10.25);
    expect(money.cents).toBe(1025);
    expect(money.toDecimal()).toBe(10.25);
  });

  it('throws when value is invalid', () => {
    expect(() => Money.fromDecimal(0)).toThrow('Amount must be a positive number');
  });
});
