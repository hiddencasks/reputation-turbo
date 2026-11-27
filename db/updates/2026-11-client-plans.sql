-- One-time update for monthly plans and client posts (Dashboard > Clients > Monthly plans).
-- Run it once in the Supabase SQL editor. It is safe to run more than once.

-- Monthly plans: one row per client subscription (made automatically when a plan is paid
-- through Stripe, or by hand). Stripe keeps it up to date: payment failed, canceled, back on.
create table if not exists client_plans (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  slug text not null default '',
  name text not null default '',
  amount_cents integer not null default 0,
  -- active, past_due (a payment failed), canceled, or manual (paid outside Stripe)
  status text not null default 'active',
  stripe_subscription_id text unique,
  stripe_customer_id text not null default '',
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  last_paid_at timestamptz,
  last_failed_at timestamptz,
  canceled_at timestamptz,
  -- Where posts go. Ids only (no tokens): the token lives in Vercel as META_CLIENT_TOKEN.
  facebook_page_id text not null default '',
  instagram_user_id text not null default '',
  brand_color text not null default '#0c2a5c',
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_plans_lead_idx on client_plans (lead_id);

-- Photos a plan's posts can use (uploaded on the plan page; checklist photos are used directly).
create table if not exists plan_photos (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references client_plans (id) on delete cascade,
  storage_path text not null unique,
  filename text not null default '',
  created_at timestamptz not null default now()
);

-- Each post for a client: drafted, approved, then published on its date by the hourly cron.
create table if not exists plan_posts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references client_plans (id) on delete cascade,
  -- "social" goes to Facebook and Instagram, "google" to the Google profile
  channel text not null default 'social',
  publish_at timestamptz not null,
  headline text not null default '',
  subline text not null default '',
  caption text not null default '',
  photo_path text not null default '',
  -- draft, approved, posting (being published right now), done (posted everywhere it can), skipped
  status text not null default 'draft',
  -- per network: { "facebook": { "status": "posted", "attempts": 1, "remoteId": "...", "error": "" } }
  results jsonb not null default '{}'::jsonb,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_posts_plan_idx on plan_posts (plan_id, publish_at);
create index if not exists plan_posts_due_idx on plan_posts (status, publish_at);

alter table client_plans enable row level security;
alter table plan_photos enable row level security;
alter table plan_posts enable row level security;
