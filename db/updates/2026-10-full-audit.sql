-- One-time update for the full online audit (website, Google profile, social and contact checks).
-- Run it once in the Supabase SQL editor. It is safe to run more than once.

alter table ai_checks add column if not exists site_audit jsonb;
