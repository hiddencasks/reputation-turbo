import Link from "next/link";
import { sql } from "@/lib/db";

type Row = {
  id: string;
  lead_id: string | null;
  to_email: string;
  subject: string;
  status: string;
  created_at: Date;
  lead_name: string | null;
};

const fmt = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });

/** Every email the site sent in the last 7 days, the same count as the dashboard box. */
export default async function EmailsPage() {
  const rows = await sql<Row[]>`
    select e.id, e.lead_id, e.to_email, e.subject, e.status, e.created_at,
           nullif(coalesce(nullif(l.business_name, ''), trim(l.first_name || ' ' || l.last_name)), '') as lead_name
    from emails e left join leads l on l.id = e.lead_id
    where e.created_at > now() - interval '7 days'
    order by e.created_at desc
    limit 500`;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-semibold text-orange">← Dashboard</Link>
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Emails sent this week</h1>
        <p className="text-muted">Everything the website emailed in the last 7 days: confirmations, audits and follow-ups.</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-6 text-muted">No emails in the last 7 days.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg bg-white shadow-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-navy">{r.subject}</p>
                <p className="text-sm text-muted">
                  To {r.to_email}
                  {r.lead_id && r.lead_name ? (
                    <> · <Link href={`/admin/leads/${r.lead_id}`} className="text-orange underline">{r.lead_name}</Link></>
                  ) : null}
                </p>
              </div>
              <p className="text-sm text-muted">
                {r.status === "failed" ? <span className="font-semibold text-red-700">Failed</span> : r.status === "logged" ? "Logged (not sent)" : "Sent"} · {fmt(r.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
