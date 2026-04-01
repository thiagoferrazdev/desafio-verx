import { EntryType } from '../../domain/entry-type.enum';

export interface CreateEntryCommand {
  merchantId: string;
  type: EntryType;
  amount: number;
  description?: string;
  occurredAt: string;
  requestId: string;
}
