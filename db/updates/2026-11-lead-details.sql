-- One-time update for the "Business details" box on each lead page
-- (address, profile links and other notes for our own records).
-- Run it once in the Supabase SQL editor. It is safe to run more than once.

alter table leads add column if not exists details jsonb not null default '{}';
