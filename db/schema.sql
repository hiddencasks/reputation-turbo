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
-- Internal business details we add by hand (address, profile links, notes). Never shown to the lead.
alter table leads add column if not exists details jsonb not null default '{}';

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

-- Personal follow-up note sent about an hour after an audit report is emailed.
create table if not exists followup_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  check_id uuid not null unique references ai_checks (id) on delete cascade,
  subject text not null default '',
  body text not null default '',
  status text not null default 'writing'
    check (status in ('writing', 'scheduled', 'sending', 'sent', 'skipped', 'failed', 'draft_failed')),
  send_at timestamptz not null,
  sent_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists followup_notes_due_idx on followup_notes (status, send_at);
create index if not exists followup_notes_lead_idx on followup_notes (lead_id);

-- Client projects: step checklist with time tracking, and the client portal.
create table if not exists client_projects (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references leads (id) on delete cascade,
  package text not null default '',
  -- Private link the client uses to open their portal. "Reset link" replaces it.
  portal_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  portal_email text not null default '',
  invited_at timestamptz,
  client_seen_at timestamptz,
  owner_notified_at timestamptz,
  reminder_count integer not null default 0,
  reminded_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project agreement the client agrees to in the portal.
alter table client_projects add column if not exists agreement_text text not null default '';
alter table client_projects add column if not exists agreement_sent_at timestamptz;
alter table client_projects add column if not exists agreed_at timestamptz;
alter table client_projects add column if not exists agreed_name text not null default '';

create table if not exists project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references client_projects (id) on delete cascade,
  position integer not null,
  phase text not null,
  title text not null,
  who text not null default '',
  detail text not null default '',
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'waiting', 'done')),
  started_at timestamptz,
  done_at timestamptz,
  -- Time spent waiting on the client, added up each time the step leaves "Waiting on client".
  wait_minutes integer not null default 0,
  waiting_since timestamptz,
  notes text not null default '',
  unique (project_id, position)
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references project_steps (id) on delete cascade,
  project_id uuid not null references client_projects (id) on delete cascade,
  started_at timestamptz not null default now(),
  -- Empty while the timer is running.
  ended_at timestamptz,
  -- Set for time typed in by hand instead of timed.
  manual_minutes integer,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists time_entries_step_idx on time_entries (step_id);
create index if not exists time_entries_running_idx on time_entries (project_id) where ended_at is null;

create table if not exists intake_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references client_projects (id) on delete cascade,
  position integer not null,
  section text not null,
  kind text not null check (kind in ('answer', 'upload', 'access')),
  label text not null,
  help text not null default '',
  answer text not null default '',
  done_at timestamptz,
  done_by text not null default '',
  updated_at timestamptz not null default now(),
  -- Which checklist question this is (see src/lib/projects/intake.ts) and its form answers.
  key text not null default '',
  fields jsonb not null default '{}'::jsonb,
  unique (project_id, position)
);

create table if not exists intake_files (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references intake_items (id) on delete cascade,
  project_id uuid not null references client_projects (id) on delete cascade,
  storage_path text not null unique,
  filename text not null,
  size_bytes bigint not null default 0,
  content_type text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists intake_files_item_idx on intake_files (item_id);

-- Private file storage for client uploads (logo, photos). Only the server can read it.
-- Skipped outside Supabase, where there is no storage schema.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('client-files', 'client-files', false, 26214400)
    on conflict (id) do nothing;
  end if;
end $$;

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

-- Supabase publishes every table in "public" through its web API. Row level
-- security with no policies keeps that API from reading them; the site
-- connects as the table owner, which bypasses it.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
