import Link from "next/link";
import { sql } from "@/lib/db";
import { stageLabel } from "@/lib/stages";
import type { Lead } from "@/lib/leads";
import { loadSummaries } from "@/lib/lead-summaries";

export default async function DashboardPage() {
  const [[counts], recent, due, aiReview, weekLeads] = await Promise.all([
    sql<{ total: number; week: number; audits_waiting: number; warm: number; won: number; emails_week: number }[]>`
      select
        (select count(*)::int from leads) as total,
        (select count(*)::int from leads where created_at > now() - interval '7 days') as week,
        (select count(*)::int from leads where stage = 'audit_in_progress') as audits_waiting,
        (select count(*)::int from leads where stage in ('interested', 'consultation_scheduled', 'proposal_sent')) as warm,
        (select count(*)::int from leads where stage = 'won') as won,
        (select count(*)::int from emails where created_at > now() - interval '7 days') as emails_week`,
    sql<Lead[]>`select * from leads order by created_at desc limit 8`,
    sql<Lead[]>`
      select * from leads
      where next_follow_up is not null and next_follow_up <= current_date
        and stage not in ('won', 'lost', 'do_not_contact')
      order by next_follow_up limit 10`,
    sql<{ lead_id: string; business_name: string; mentioned_count: number; answer_count: number }[]>`
      select distinct on (lead_id) lead_id, business_name, mentioned_count, answer_count from ai_checks
      where status = 'done' and approved_at is null
      order by lead_id, finished_at desc limit 10`,
    sql<{ id: string; source: string }[]>`select id, source from leads where created_at > now() - interval '7 days'`,
  ]);
  // Vendors pitching their own services don't count as leads this week.
  const weekSummaries = await loadSummaries(weekLeads);
  const weekPitches = weekLeads.filter((l) => weekSummaries.get(l.id)?.vendor).length;

  const tiles: { label: string; value: number; href: string; note?: string }[] = [
    {
      label: "Leads this week",
      value: counts.week - weekPitches,
      href: "/admin/leads?view=list&filter=week&pitches=hide",
      note: weekPitches ? `+${weekPitches} sales pitch${weekPitches === 1 ? "" : "es"} not counted` : undefined,
    },
    { label: "Audit requests to complete", value: counts.audits_waiting, href: "/admin/leads?view=list&stage=audit_in_progress" },
    { label: "AI reports to review", value: aiReview.length, href: "/admin/leads?view=list&filter=review" },
    { label: "Follow-ups due", value: due.length, href: "/admin/leads?view=list&filter=due" },
    { label: "Warm leads", value: counts.warm, href: "/admin/leads?view=list&filter=warm" },
    { label: "Customers won", value: counts.won, href: "/admin/leads?view=list&stage=won" },
    { label: "Emails sent this week", value: counts.emails_week, href: "/admin/emails" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-navy">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leads/new" className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white">+ Add a lead</Link>
          <Link href="/admin/finder" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-navy ring-1 ring-line">Find prospects to audit</Link>
        </div>
      </div>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="group rounded-lg bg-white p-5 shadow-sm ring-1 ring-transparent transition hover:shadow-md hover:ring-orange"
          >
            <p className="flex items-start justify-between gap-2 text-sm text-muted">
              {t.label}
              <span aria-hidden="true" className="text-orange transition group-hover:translate-x-0.5">→</span>
            </p>
            <p className="mt-1 font-display text-4xl font-bold text-navy">{t.value}</p>
            {t.note && <p className="mt-1 text-xs font-medium text-amber-800">{t.note}</p>}
          </Link>
        ))}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">What should I work on today?</h2>
        {counts.audits_waiting === 0 && due.length === 0 && aiReview.length === 0 ? (
          <p className="mt-2 text-muted">Nothing urgent. A good time to <Link href="/admin/finder" className="text-orange underline">find new prospects</Link>.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {counts.audits_waiting > 0 && (
              <li>
                Complete {counts.audits_waiting} audit request{counts.audits_waiting === 1 ? "" : "s"}.{" "}
                <Link href="/admin/leads?stage=audit_in_progress" className="text-orange underline">Open list</Link>
              </li>
            )}
            {aiReview.map((c) => (
              <li key={c.lead_id}>
                Review and send the audit for{" "}
                <Link href={`/admin/leads/${c.lead_id}`} className="text-orange underline">{c.business_name}</Link>{" "}
                (named in {c.mentioned_count} of {c.answer_count})
              </li>
            ))}
            {due.map((l) => (
              <li key={l.id}>
                Follow up with <Link href={`/admin/leads/${l.id}`} className="text-orange underline">{l.business_name || `${l.first_name} ${l.last_name}`}</Link>{" "}
                (due {l.next_follow_up})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-navy">Newest leads</h2>
          <Link href="/admin/leads" className="text-sm font-semibold text-orange">All leads ({counts.total})</Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 text-muted">No leads yet. They appear here as soon as someone submits a form on the website.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link href={`/admin/leads/${l.id}`} className="font-semibold text-navy hover:text-orange">
                  {l.business_name || `${l.first_name} ${l.last_name}`}
                </Link>
                <span className="text-sm text-muted">
                  {stageLabel(l.stage)} · {l.created_at.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
