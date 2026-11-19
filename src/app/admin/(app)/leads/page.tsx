import Link from "next/link";
import Form from "next/form";
import { sql } from "@/lib/db";
import { STAGES, stageLabel } from "@/lib/stages";
import type { Lead } from "@/lib/leads";
import { moveLeadStage } from "../../actions";
import { loadSummaries } from "@/lib/lead-summaries";
import { LeadInfo } from "./LeadInfo";
import { SubmitButton } from "@/components/admin/SubmitButton";

type Search = { q?: string; stage?: string; view?: string; sort?: string; filter?: string; pitches?: string; deleted?: string };

/** Views the dashboard's number boxes link to. Each matches how that box counts. */
const FILTERS = {
  week: "Became a lead in the last 7 days",
  review: "AI reports waiting for your review",
  due: "Follow-ups due today or earlier",
  warm: "Warm leads (Interested, Consultation Scheduled, Proposal Sent)",
  pitches: "Sales pitches from vendors",
} as const;
type FilterId = keyof typeof FILTERS;

function name(l: Lead) {
  return l.business_name || `${l.first_name} ${l.last_name}`.trim() || l.email;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", stage = "", view = "board", sort = "newest", filter = "", pitches = "", deleted } = await searchParams;
  const validFilter = (filter in FILTERS ? filter : "") as FilterId | "";
  const hidePitches = pitches === "hide" && validFilter !== "pitches";
  const like = `%${q.trim()}%`;
  const validStage = STAGES.some((s) => s.id === stage) ? stage : "";
  const order = sort === "oldest" ? sql`created_at asc` : sort === "name" ? sql`lower(business_name) asc` : sql`created_at desc`;

  const allLeads = await sql<Lead[]>`
    select * from leads
    where (${q.trim()} = '' or business_name ilike ${like} or first_name ilike ${like} or last_name ilike ${like}
           or email ilike ${like} or phone ilike ${like} or website_url ilike ${like})
      and (${validStage} = '' or stage = ${validStage})
      and (${validFilter} <> 'week' or created_at > now() - interval '7 days')
      and (${validFilter} <> 'warm' or stage in ('interested', 'consultation_scheduled', 'proposal_sent'))
      and (${validFilter} <> 'due' or (next_follow_up is not null and next_follow_up <= current_date
           and stage not in ('won', 'lost', 'do_not_contact')))
      and (${validFilter} <> 'review' or exists (
           select 1 from ai_checks c where c.lead_id = leads.id and c.status = 'done' and c.approved_at is null))
    order by ${order}
    limit 500`;
  const summaries = await loadSummaries(allLeads);
  const pitchCount = allLeads.filter((l) => summaries.get(l.id)?.vendor).length;
  const leads = allLeads.filter((l) => {
    const vendor = summaries.get(l.id)?.vendor ?? false;
    return validFilter === "pitches" ? vendor : hidePitches ? !vendor : true;
  });

  const tab = (v: string) =>
    `rounded px-3 py-1.5 text-sm font-semibold ${view === v ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-line"}`;
  const params = (over: Record<string, string>) => {
    const p = new URLSearchParams({ q, stage: validStage, view, sort, filter: validFilter, pitches: hidePitches ? "hide" : "", ...over });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `?${p.toString()}`;
  };
  const qs = (v: string) => params({ view: v });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-navy">Leads</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leads/new" className="rounded bg-orange px-3 py-1.5 text-sm font-semibold text-white">+ Add a lead</Link>
          <Link href="/admin/finder" className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-line">Find prospects</Link>
          <Link href={qs("board")} className={tab("board")}>Pipeline</Link>
          <Link href={qs("list")} className={tab("list")}>List</Link>
        </div>
      </div>

      {deleted && <p role="status" className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">Lead deleted.</p>}


      {(validFilter || validStage) && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-navy px-4 py-2.5 text-sm text-white">
          <span>
            Showing: <strong>{validFilter ? FILTERS[validFilter] : stageLabel(validStage)}</strong>
            {validFilter && validStage ? <> in <strong>{stageLabel(validStage)}</strong></> : null} ({leads.length})
          </span>
          <Link href={`?view=${view}`} className="font-semibold text-orange underline">Show all leads</Link>
        </p>
      )}

      {pitchCount > 0 && validFilter !== "pitches" && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          <span>
            {pitchCount} {pitchCount === 1 ? "lead looks" : "leads look"} like a sales pitch from a vendor
            {hidePitches ? " (hidden)" : " (marked in yellow)"}.
          </span>
          <Link href={params({ pitches: hidePitches ? "" : "hide" })} className="font-semibold underline">
            {hidePitches ? "Show them" : "Hide them"}
          </Link>
          <Link href={params({ filter: "pitches", pitches: "" })} className="font-semibold underline">See only pitches</Link>
        </p>
      )}

      <Form action="/admin/leads" className="flex flex-wrap gap-2" role="search">
        <input type="hidden" name="view" value={view} />
        {validFilter && <input type="hidden" name="filter" value={validFilter} />}
        {hidePitches && <input type="hidden" name="pitches" value="hide" />}
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
        <SubmitButton navigates pendingText="Loading…" className="rounded-md bg-navy px-4 py-2 font-semibold text-white">Apply</SubmitButton>
      </Form>

      {leads.length === 0 && <p className="rounded-lg bg-white p-6 text-muted">No leads match.</p>}

      {leads.length > 0 && view === "list" && (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-3">Business</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Next follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => (
                <tr key={l.id} className={`align-top ${summaries.get(l.id)?.vendor ? "bg-amber-50/60" : ""}`}>
                  <td className="max-w-md p-3">
                    <Link href={`/admin/leads/${l.id}`} className="font-semibold text-navy hover:text-orange">{name(l)}</Link>
                    <LeadInfo leadId={l.id} createdAt={l.created_at} info={summaries.get(l.id)!} />
                  </td>
                  <td className="p-3">{`${l.first_name} ${l.last_name}`.trim()}<br /><span className="text-muted">{l.email}</span></td>
                  <td className="p-3">{stageLabel(l.stage)}</td>
                  <td className="p-3">{l.next_follow_up ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leads.length > 0 && view !== "list" && (
        <div className="flex gap-4 overflow-x-auto pb-4 [contain:paint]">
          {STAGES.filter((s) => !validStage || s.id === validStage)
            // With a dashboard filter on, skip the empty columns so the matches are easy to see.
            .filter((s) => !validFilter || leads.some((l) => l.stage === s.id))
            .map((s) => {
            const items = leads.filter((l) => l.stage === s.id);
            return (
              <section key={s.id} aria-label={s.label} className="w-72 shrink-0 rounded-lg bg-white/70 p-3">
                <h2 className="flex items-center justify-between text-sm font-bold text-navy">
                  {s.label} <span className="rounded-full bg-navy-50 px-2 text-xs">{items.length}</span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {items.map((l) => (
                    <li key={l.id} className={`rounded-md p-3 shadow-sm ${summaries.get(l.id)?.vendor ? "bg-amber-50 ring-1 ring-amber-200" : "bg-white"}`}>
                      <Link href={`/admin/leads/${l.id}`} className="font-semibold text-navy hover:text-orange">{name(l)}</Link>
                      <p className="truncate text-xs text-muted">{l.email}</p>
                      <LeadInfo leadId={l.id} createdAt={l.created_at} info={summaries.get(l.id)!} />
                      <form action={moveLeadStage.bind(null, l.id)} className="mt-2 flex gap-1">
                        <label className="sr-only" htmlFor={`stage-${l.id}`}>Move to stage</label>
                        <select id={`stage-${l.id}`} name="stage" defaultValue={l.stage} className="min-w-0 flex-1 rounded border border-line px-1 py-1 text-xs">
                          {STAGES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                        <SubmitButton pendingText="Moving…" doneText="Moved" className="rounded bg-navy px-2 text-xs font-semibold text-white">Move</SubmitButton>
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
