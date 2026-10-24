# Reputation Turbo

The Reputation Turbo public website and owner dashboard: one Next.js app with a Postgres database.

**Milestone 1 includes:** public pages (Home, Services & Pricing, About, Our Work, Free Online Audit, Contact, One-Sheet, Privacy, Terms), the Free Online Audit and contact forms, lead capture with duplicate detection, confirmation and owner notification emails, and the dashboard (sign-in, daily summary, leads pipeline and list, lead detail with notes and history, and a pricing editor with a switch that shows or hides prices on the website).

## How it fits together

| Part | Where |
| --- | --- |
| Public pages | `src/app/(site)` |
| Form handling (validation, spam checks, duplicate leads, emails) | `src/app/(site)/actions.ts`, `src/lib/leads.ts`, `src/lib/notifications.ts` |
| Dashboard | `src/app/admin` |
| Business details (phone, address, cities, industries) | `src/lib/site.ts` |
| Database tables and starting prices | `db/schema.sql`, `db/seed.sql` |

## Run it locally

1. Install Node 22 and Postgres 16.
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill it in (see the comments in that file).
4. `npm run db:setup` creates the tables and loads the starting packages, add-ons and plans.
   Already set up a database before GEO was added? Run `npm run db:setup` again to add the GEO package and plan, then run `db/updates/2026-10-geo-wording.sql` once (Supabase SQL editor or psql) to add GEO to the existing package wording.
5. `npm run dev`, then open http://localhost:3000 and http://localhost:3000/admin.

Without `RESEND_API_KEY`, emails are recorded in the database (status `logged`) instead of being sent.

## AI visibility checks

Every free audit request (and every outreach prospect you add on the Leads page) starts an automatic check: the site asks AI assistants four customer-style questions, such as "Who is the best plumber in Santee, CA?", records whether the business is named and who is named instead, and emails you when the report is ready.

1. Add at least one AI key from `.env.example` (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`). Each service is used only when its key is set. With `ANTHROPIC_API_KEY` set, Claude also reads each answer to list the businesses it names; without it, simple text matching is used.
2. Review the report on the lead's page, then **Approve & email** (sends the client their private report link and moves them to Audit Delivered with a follow-up in 3 days) or **Approve link only** (to paste into your own message).
3. Reports are visible only to you until approved. After that, anyone with the link can open it.
4. **Monthly tracking** on a lead re-runs the check every month. On Vercel the schedule in `vercel.json` calls `/api/cron/ai-checks` daily; set `CRON_SECRET` so only Vercel can call it.

Website forms start at most `AI_CHECK_DAILY_LIMIT` checks per 24 hours (default 40), so a flood of spam submissions can't run up AI bills. A repeat request from the same lead within a day doesn't start a second check.

`AI_CHECK_FAKE=1` uses built-in sample answers for local development and the tests, so no AI service is called.

## Tests

- `npm test` runs the unit tests (form validation, password hashing).
- `npm run build && npm run test:e2e` runs the browser tests on desktop and phone sizes against a production build. They reset the leads tables in the database named in `.env.local`, so never point them at production. Set `PW_CHROMIUM_PATH` to use an already installed Chromium.

## Deploying (Vercel + Supabase + Resend)

1. **Supabase:** create a project, then copy the *Transaction pooler* connection string (Project Settings, Database). Run `DATABASE_URL="..." npm run db:setup` once.
2. **Resend:** add and verify the `reputationturbo.com` domain (it gives you DNS records to add), then create an API key.
3. **Vercel:** import the GitHub repository and add every variable from `.env.example` under Project Settings, Environment Variables. Use a new `SESSION_SECRET` and a password hash made with `npm run hash-password -- "your password"`.
4. Point `reputationturbo.com` at Vercel (Vercel shows the DNS records) and set `NEXT_PUBLIC_SITE_URL=https://reputationturbo.com`.

## Rules this code follows

- Prices stay hidden on the website until the owner turns on "Show prices" in the dashboard.
- No invented reviews, testimonials or projects anywhere on the site.
- Every admin page and admin action checks the signed-in session on the server.
- Secrets live only in environment variables, never in code.
