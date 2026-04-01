import { randomUUID } from 'crypto';
import { Money } from '../../../../libs/shared-kernel/money';
import { EntryType } from './entry-type.enum';

export class Entry {
  private constructor(
    readonly id: string,
    readonly merchantId: string,
    readonly type: EntryType,
    readonly amount: Money,
    readonly description: string | null,
    readonly occurredAt: Date,
    readonly createdAt: Date
  ) {}

  static create(params: {
    merchantId: string;
    type: EntryType;
    amount: Money;
    description?: string | null;
    occurredAt: Date;
  }): Entry {
    if (!params.merchantId.trim()) {
      throw new Error('merchantId is required');
    }

    return new Entry(
      randomUUID(),
      params.merchantId.trim(),
      params.type,
      params.amount,
      params.description?.trim() || null,
      params.occurredAt,
      new Date()
    );
  }

  static restore(params: {
    id: string;
    merchantId: string;
    type: EntryType;
    amountCents: number;
    description?: string | null;
    occurredAt: Date;
    createdAt: Date;
  }): Entry {
    return new Entry(
      params.id,
      params.merchantId,
      params.type,
      Money.fromCents(params.amountCents),
      params.description || null,
      params.occurredAt,
      params.createdAt
    );
  }
}
