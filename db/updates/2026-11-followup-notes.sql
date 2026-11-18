-- One-time update for the personal follow-up note that goes out about an hour
-- after "Approve & email". Run it once in the Supabase SQL editor.
-- It is safe to run more than once.

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

-- Same protection as the other tables: only the server (which bypasses RLS) can read or write it.
alter table followup_notes enable row level security;
