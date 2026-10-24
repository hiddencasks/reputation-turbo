import Link from "next/link";
import { sql } from "@/lib/db";
import { stageLabel } from "@/lib/stages";
import type { Lead } from "@/lib/leads";

export default async function DashboardPage() {
  const [[counts], recent, due, aiReview] = await Promise.all([
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
  ]);

  const tiles = [
    { label: "Leads this week", value: counts.week },
    { label: "Audit requests to complete", value: counts.audits_waiting },
    { label: "AI reports to review", value: aiReview.length },
    { label: "Follow-ups due", value: due.length },
    { label: "Warm leads", value: counts.warm },
    { label: "Customers won", value: counts.won },
    { label: "Emails sent this week", value: counts.emails_week },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-navy">Dashboard</h1>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 font-display text-4xl font-bold text-navy">{t.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">What should I work on today?</h2>
        {counts.audits_waiting === 0 && due.length === 0 && aiReview.length === 0 ? (
          <p className="mt-2 text-muted">Nothing urgent. A good time to reach out to new prospects.</p>
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
                Review and send the AI report for{" "}
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
