-- One-time update for client projects: the step checklist with time tracking
-- (dashboard > Clients) and the client portal (reputationturbo.com/portal).
-- Run it once in the Supabase SQL editor. It is safe to run more than once.

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

-- Same protection as the other tables: only the server (which bypasses RLS) can read or write them.
alter table client_projects enable row level security;
alter table project_steps enable row level security;
alter table time_entries enable row level security;
alter table intake_items enable row level security;
alter table intake_files enable row level security;
