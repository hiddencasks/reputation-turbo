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
