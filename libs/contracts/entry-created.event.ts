export interface EntryCreatedEvent {
  eventId: string;
  entryId: string;
  merchantId: string;
  type: 'DEBIT' | 'CREDIT';
  amountCents: number;
  description?: string | null;
  occurredAt: string;
  createdAt: string;
}
