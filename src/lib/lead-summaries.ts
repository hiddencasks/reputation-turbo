import "server-only";
import { sql } from "./db";
import { SUMMARY_KINDS, summarizeLead, type LeadSummary, type SummaryActivity } from "./lead-summary";

/** Loads the board/list summary for each lead in one query. */
export async function loadSummaries(leads: { id: string; source: string }[]): Promise<Map<string, LeadSummary>> {
  const out = new Map<string, LeadSummary>();
  if (!leads.length) return out;
  const rows = await sql<SummaryActivity[]>`
    select lead_id, kind, body, meta, created_at from activities
    where lead_id in ${sql(leads.map((l) => l.id))} and kind in ${sql([...SUMMARY_KINDS])}
    order by created_at`;
  const byLead = new Map<string, SummaryActivity[]>();
  for (const r of rows) byLead.set(r.lead_id, [...(byLead.get(r.lead_id) ?? []), r]);
  for (const l of leads) out.set(l.id, summarizeLead(l, byLead.get(l.id) ?? []));
  return out;
}
