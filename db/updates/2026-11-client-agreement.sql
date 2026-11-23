-- One-time update: the project agreement the client reads and agrees to in their portal.
-- Run it once in the Supabase SQL editor. It is safe to run more than once.

alter table client_projects add column if not exists agreement_text text not null default '';
alter table client_projects add column if not exists agreement_sent_at timestamptz;
alter table client_projects add column if not exists agreed_at timestamptz;
alter table client_projects add column if not exists agreed_name text not null default '';
