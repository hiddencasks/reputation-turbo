import Link from "next/link";
import { sql } from "@/lib/db";
import { STAGES, stageLabel } from "@/lib/stages";
import type { Lead } from "@/lib/leads";
import { site } from "@/lib/site";
import { aiChecksAvailable } from "@/lib/ai-visibility/run";
import { moveLeadStage } from "../../actions";
import { ProspectForm } from "./ProspectForm";

// Leaves time for AI visibility checks started when adding a prospect.
export const maxDuration = 300;

type Search = { q?: string; stage?: string; view?: string; sort?: string; deleted?: string };

function name(l: Lead) {
  return l.business_name || `${l.first_name} ${l.last_name}`.trim() || l.email;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", stage = "", view = "board", sort = "newest", deleted } = await searchParams;
  const like = `%${q.trim()}%`;
  const validStage = STAGES.some((s) => s.id === stage) ? stage : "";
  const order = sort === "oldest" ? sql`created_at asc` : sort === "name" ? sql`lower(business_name) asc` : sql`created_at desc`;

  const leads = await sql<Lead[]>`
    select * from leads
    where (${q.trim()} = '' or business_name ilike ${like} or first_name ilike ${like} or last_name ilike ${like}
           or email ilike ${like} or phone ilike ${like} or website_url ilike ${like})
      and (${validStage} = '' or stage = ${validStage})
    order by ${order}
    limit 500`;

  const tab = (v: string) =>
    `rounded px-3 py-1.5 text-sm font-semibold ${view === v ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-line"}`;
  const qs = (v: string) => `?${new URLSearchParams({ q, stage: validStage, view: v, sort }).toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-navy">Leads</h1>
        <div className="flex gap-2">
          <Link href={qs("board")} className={tab("board")}>Pipeline</Link>
          <Link href={qs("list")} className={tab("list")}>List</Link>
        </div>
      </div>

      {deleted && <p role="status" className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">Lead deleted.</p>}

      <details className="rounded-lg bg-white p-4 shadow-sm">
        <summary className="cursor-pointer font-semibold text-navy">Add a prospect for outreach</summary>
        <p className="mt-2 text-sm text-muted">
          Add a business you want to contact. Its AI check runs in the background; approve the report, then send the link in
          your message.
        </p>
        <div className="mt-4">
          <ProspectForm industries={site.industries} cities={site.cities} canCheck={aiChecksAvailable()} />
        </div>
      </details>

      <form className="flex flex-wrap gap-2" role="search">
        <input type="hidden" name="view" value={view} />
        <label className="sr-only" htmlFor="q">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name, business, email, phone" className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2" />
        <label className="sr-only" htmlFor="stage">Stage</label>
        <select id="stage" name="stage" defaultValue={validStage} className="rounded-md border border-line bg-white px-3 py-2">
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="sort">Sort</label>
        <select id="sort" name="sort" defaultValue={sort} className="rounded-md border border-line bg-white px-3 py-2">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Business name</option>
        </select>
        <button className="rounded-md bg-navy px-4 py-2 font-semibold text-white">Apply</button>
      </form>

      {leads.length === 0 && <p className="rounded-lg bg-white p-6 text-muted">No leads match.</p>}

      {leads.length > 0 && view === "list" && (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-3">Business</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Source</th>
                <th className="p-3">Next follow-up</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="p-3"><Link href={`/admin/leads/${l.id}`} className="font-semibold text-navy hover:text-orange">{name(l)}</Link></td>
                  <td className="p-3">{`${l.first_name} ${l.last_name}`.trim()}<br /><span className="text-muted">{l.email}</span></td>
                  <td className="p-3">{stageLabel(l.stage)}</td>
                  <td className="p-3">{l.source.replace("_", " ")}</td>
                  <td className="p-3">{l.next_follow_up ?? ""}</td>
                  <td className="p-3">{l.created_at.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leads.length > 0 && view !== "list" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.filter((s) => !validStage || s.id === validStage).map((s) => {
            const items = leads.filter((l) => l.stage === s.id);
            return (
              <section key={s.id} aria-label={s.label} className="w-64 shrink-0 rounded-lg bg-white/70 p-3">
                <h2 className="flex items-center justify-between text-sm font-bold text-navy">
                  {s.label} <span className="rounded-full bg-navy-50 px-2 text-xs">{items.length}</span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {items.map((l) => (
                    <li key={l.id} className="rounded-md bg-white p-3 shadow-sm">
                      <Link href={`/admin/leads/${l.id}`} className="font-semibold text-navy hover:text-orange">{name(l)}</Link>
                      <p className="truncate text-xs text-muted">{l.email}</p>
                      <form action={moveLeadStage.bind(null, l.id)} className="mt-2 flex gap-1">
                        <label className="sr-only" htmlFor={`stage-${l.id}`}>Move to stage</label>
                        <select id={`stage-${l.id}`} name="stage" defaultValue={l.stage} className="min-w-0 flex-1 rounded border border-line px-1 py-1 text-xs">
                          {STAGES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                        <button className="rounded bg-navy px-2 text-xs font-semibold text-white">Move</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
