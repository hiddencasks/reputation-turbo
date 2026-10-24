import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { STAGES } from "@/lib/stages";
import type { Lead } from "@/lib/leads";
import { addNote, updateLead } from "../../../actions";

type Activity = { id: string; kind: string; body: string; created_at: Date };
type EmailRow = { id: string; subject: string; template: string; status: string; to_email: string; created_at: Date };

const kindLabel: Record<string, string> = {
  audit_form: "Audit request",
  ai_search: "AI search audit request",
  contact_form: "Contact form",
  note: "Note",
  stage_change: "Stage",
};

const fmt = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [[lead], activities, emails] = await Promise.all([
    sql<Lead[]>`select * from leads where id = ${id}`,
    sql<Activity[]>`select id, kind, body, created_at from activities where lead_id = ${id} order by created_at desc`,
    sql<EmailRow[]>`select id, subject, template, status, to_email, created_at from emails where lead_id = ${id} order by created_at desc`,
  ]);
  if (!lead) notFound();

  const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2";

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className="text-sm font-semibold text-orange">← All leads</Link>
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">{lead.business_name || `${lead.first_name} ${lead.last_name}`}</h1>
        <p className="text-muted">Added {fmt(lead.created_at)} from {lead.source.replace("_", " ")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy">Contact</h2>
          <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Name</dt><dd>{`${lead.first_name} ${lead.last_name}`.trim() || "—"}</dd>
            <dt className="text-muted">Email</dt><dd>{lead.email ? <a href={`mailto:${lead.email}`} className="text-orange underline">{lead.email}</a> : "—"}</dd>
            <dt className="text-muted">Phone</dt><dd>{lead.phone ? <a href={`tel:${lead.phone}`} className="text-orange underline">{lead.phone}</a> : "—"}</dd>
            <dt className="text-muted">Website</dt><dd className="break-all">{lead.website_url ? <a href={lead.website_url} target="_blank" rel="noopener noreferrer" className="text-orange underline">{lead.website_url}</a> : "None given"}</dd>
          </dl>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy">Pipeline</h2>
          <form action={updateLead.bind(null, lead.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Stage
              <select name="stage" defaultValue={lead.stage} className={input}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Next follow-up
              <input type="date" name="nextFollowUp" defaultValue={lead.next_follow_up ?? ""} className={input} />
            </label>
            <label className="text-sm font-semibold">Recommended package
              <input name="recommendedPackage" defaultValue={lead.recommended_package} className={input} />
            </label>
            <label className="text-sm font-semibold">Quote amount ($)
              <input name="quoteAmount" inputMode="decimal" defaultValue={lead.quote_amount_cents != null ? String(lead.quote_amount_cents / 100) : ""} className={input} />
            </label>
            <div className="sm:col-span-2">
              <button className="rounded-md bg-navy px-4 py-2 font-semibold text-white">Save</button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Add a note</h2>
        <form action={addNote.bind(null, lead.id)} className="mt-3 space-y-2">
          <label className="sr-only" htmlFor="note">Note</label>
          <textarea id="note" name="note" rows={3} required className="w-full rounded-md border border-line px-3 py-2" />
          <button className="rounded-md bg-orange px-4 py-2 font-semibold text-white">Add note</button>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy">History</h2>
          <ol className="mt-3 space-y-3">
            {activities.map((a) => (
              <li key={a.id} className="border-l-2 border-orange pl-3">
                <p className="text-xs text-muted">{kindLabel[a.kind] ?? a.kind} · {fmt(a.created_at)}</p>
                <p className="whitespace-pre-wrap text-sm">{a.body}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy">Emails</h2>
          {emails.length === 0 ? <p className="mt-2 text-sm text-muted">None yet.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {emails.map((e) => (
                <li key={e.id}>
                  <p className="font-medium">{e.subject}</p>
                  <p className="text-xs text-muted">To {e.to_email} · {e.status} · {fmt(e.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
