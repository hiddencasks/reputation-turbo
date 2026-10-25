-- Reputation Turbo database schema (Milestone 1).
-- Safe to run more than once: every statement is idempotent.

create extension if not exists pgcrypto;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '',
  last_name text not null default '',
  business_name text not null default '',
  email text not null default '',
  phone text not null default '',
  phone_digits text not null default '',
  website_url text not null default '',
  source text not null default 'website',
  stage text not null default 'new_prospect' check (stage in (
    'new_prospect', 'audit_in_progress', 'audit_ready', 'contacted',
    'audit_delivered', 'follow_up_due', 'interested', 'consultation_scheduled',
    'proposal_sent', 'won', 'lost', 'do_not_contact'
  )),
  next_follow_up date,
  recommended_package text not null default '',
  quote_amount_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_email_idx on leads (lower(email));
create index if not exists leads_phone_idx on leads (phone_digits);
create index if not exists leads_stage_idx on leads (stage);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  kind text not null,
  body text not null default '',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists activities_lead_idx on activities (lead_id, created_at desc);

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads (id) on delete set null,
  to_email text not null,
  subject text not null,
  template text not null,
  status text not null check (status in ('sent', 'logged', 'failed')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists suppressions (
  email text primary key,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists offerings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind text not null check (kind in ('package', 'addon', 'plan')),
  name text not null,
  tagline text not null default '',
  price_cents integer not null default 0,
  price_suffix text not null default '',
  description text not null default '',
  deliverables text[] not null default '{}',
  revision_rounds integer,
  est_hours_low numeric,
  est_hours_high numeric,
  sort integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- AI visibility checks (Milestone 2): what AI assistants say when customers ask for a lead's trade in their city.
alter table leads add column if not exists trade text not null default '';
alter table leads add column if not exists city text not null default '';
-- Monthly re-checks for clients on the AI Visibility plan.
alter table leads add column if not exists ai_monitoring boolean not null default false;

create table if not exists ai_checks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  business_name text not null,
  website_url text not null default '',
  trade text not null,
  city text not null,
  questions text[] not null default '{}',
  providers text[] not null default '{}',
  mentioned_count integer not null default 0,
  answer_count integer not null default 0,
  -- [{ "name": "...", "count": 3 }], most-named first
  competitors jsonb not null default '[]',
  error text,
  -- Unguessable link for the client report; the report is public only after approved_at is set.
  report_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  -- Website, Google profile, social and contact findings for the full online audit (src/lib/audit/checks.ts).
  site_audit jsonb
);
alter table ai_checks add column if not exists site_audit jsonb;

create index if not exists ai_checks_lead_idx on ai_checks (lead_id, created_at desc);
create index if not exists ai_checks_status_idx on ai_checks (status);

create table if not exists ai_check_answers (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references ai_checks (id) on delete cascade,
  provider text not null,
  question text not null,
  answer text not null default '',
  mentioned boolean not null default false,
  businesses text[] not null default '{}',
  sources text[] not null default '{}',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists ai_check_answers_check_idx on ai_check_answers (check_id);

-- Supabase publishes every table in "public" through its web API. Row level
-- security with no policies keeps that API from reading them; the site
-- connects as the table owner, which bypasses it.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
