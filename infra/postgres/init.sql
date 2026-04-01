create schema if not exists ledger;
create schema if not exists balance;

create table if not exists ledger.entries (
  id uuid primary key,
  merchant_id varchar(100) not null,
  type varchar(10) not null,
  amount_cents integer not null,
  description varchar(255),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ledger_entries_merchant_occurred_at
  on ledger.entries (merchant_id, occurred_at desc);

create table if not exists ledger.request_idempotency (
  request_id varchar(120) primary key,
  entry_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists ledger.outbox_events (
  id uuid primary key,
  aggregate_id uuid not null,
  event_type varchar(120) not null,
  payload jsonb not null,
  status varchar(20) not null default 'PENDING',
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_ledger_outbox_status_created_at
  on ledger.outbox_events (status, created_at asc);

create table if not exists balance.daily_balances (
  merchant_id varchar(100) not null,
  balance_date date not null,
  total_credits_cents integer not null default 0,
  total_debits_cents integer not null default 0,
  balance_cents integer not null default 0,
  last_event_id uuid not null,
  last_updated_at timestamptz not null default now(),
  primary key (merchant_id, balance_date)
);

create table if not exists balance.processed_messages (
  message_id varchar(120) primary key,
  processed_at timestamptz not null default now()
);
