-- One-time update for Stripe payments (Buy now / Pay deposit buttons and payment links).
-- Run it once in the Supabase SQL editor. It is safe to run more than once.

-- Payments made through Stripe checkout (one row per completed checkout).
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  stripe_id text not null unique,
  lead_id uuid references leads (id) on delete set null,
  item text not null default '',
  slug text not null default '',
  payment text not null default '',
  amount_cents integer not null default 0,
  monthly boolean not null default false,
  email text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payments_lead_idx on payments (lead_id, created_at desc);

alter table payments enable row level security;
