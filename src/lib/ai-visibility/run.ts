import "server-only";
import { sql } from "../db";
import { sendEmail } from "../email";
import { site } from "../site";
import { stageLabel } from "../stages";
import type { Lead } from "../leads";
import { analyzeAnswers } from "./extract";
import { tallyCompetitors, type Competitor } from "./match";
import { enabledProviders, providerLabel } from "./providers";
import { buildQuestions } from "./questions";
import { runSiteAudit } from "../audit/run";
import type { SiteAudit } from "../audit/checks";

export type AiCheck = {
  id: string;
  lead_id: string;
  status: "queued" | "running" | "done" | "failed";
  business_name: string;
  website_url: string;
  trade: string;
  city: string;
  questions: string[];
  providers: string[];
  mentioned_count: number;
  answer_count: number;
  competitors: Competitor[];
  error: string | null;
  report_token: string;
  approved_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
  site_audit: SiteAudit | null;
};

export type AiCheckAnswer = {
  id: string;
  provider: string;
  question: string;
  answer: string;
  mentioned: boolean;
  businesses: string[];
  sources: string[];
  error: string | null;
};

/** How many questions are sent to AI services at the same time. */
const CONCURRENCY = 4;
/** A check still "running" after this long is treated as interrupted and run again. */
const STALE_MINUTES = 15;

export function aiChecksAvailable(): boolean {
  return enabledProviders().length > 0;
}

/**
 * Creates a check for a lead using its business name, website, trade and city.
 * Returns null, with the reason, when the lead is missing details or no AI
 * service is configured.
 */
export async function queueCheck(leadId: string): Promise<{ id: string } | { error: string }> {
  const providers = enabledProviders();
  if (providers.length === 0) return { error: "No AI services are set up yet. Add an API key (see .env.example)." };
  const [lead] = await sql<Lead[]>`select * from leads where id = ${leadId}`;
  if (!lead) return { error: "Lead not found." };
  if (!lead.business_name || !lead.trade || !lead.city) {
    return { error: "Add the business name, type of business and city first." };
  }
  const [check] = await sql<{ id: string }[]>`
    insert into ai_checks (lead_id, business_name, website_url, trade, city, questions, providers)
    values (${lead.id}, ${lead.business_name}, ${lead.website_url}, ${lead.trade}, ${lead.city},
            ${buildQuestions(lead.trade, lead.city)}, ${providers.map((p) => p.id)})
    returning id`;
  return check;
}

async function pool<T>(items: T[], limit: number, run: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await run(items[next++]);
  });
  await Promise.all(workers);
}

/** Runs one queued check from start to finish. Safe to call twice: only one run claims the check. */
export async function processCheck(checkId: string): Promise<void> {
  const [check] = await sql<AiCheck[]>`
    update ai_checks set status = 'running', started_at = now(), error = null
    where id = ${checkId}
      and (status = 'queued' or (status = 'running' and started_at < now() - make_interval(mins => ${STALE_MINUTES})))
    returning *`;
  if (!check) return;

  try {
    await sql`delete from ai_check_answers where check_id = ${check.id}`;
    const providers = enabledProviders().filter((p) => check.providers.includes(p.id));
    if (providers.length === 0) throw new Error("None of this check's AI services are set up anymore.");

    await saveSiteAudit(check);

    const jobs = check.questions.flatMap((question) => providers.map((provider) => ({ question, provider })));
    const results: { provider: string; question: string; text: string; sources: string[]; error: string | null }[] = [];
    await pool(jobs, CONCURRENCY, async ({ question, provider }) => {
      try {
        const answer = await provider.ask(question, { businessName: check.business_name });
        if (!answer.text) throw new Error("Empty answer.");
        results.push({ provider: provider.id, question, text: answer.text, sources: answer.sources, error: null });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[ai-check] ${provider.id} failed:`, error);
        results.push({ provider: provider.id, question, text: "", sources: [], error });
      }
    });

    const answered = results.filter((r) => !r.error);
    if (answered.length === 0) throw new Error(`Every AI request failed. First error: ${results[0]?.error ?? "unknown"}`);

    const analysis = await analyzeAnswers(
      answered.map((r) => r.text),
      { name: check.business_name, website: check.website_url, trade: check.trade, city: check.city },
    );
    const rows = results.map((r) => {
      const a = r.error ? undefined : analysis[answered.indexOf(r)];
      return {
        check_id: check.id,
        provider: r.provider,
        question: r.question,
        answer: r.text,
        mentioned: a?.mentioned ?? false,
        businesses: a?.businesses ?? [],
        sources: r.sources,
        error: r.error,
      };
    });
    // Keep report order stable: by question, then provider.
    rows.sort((x, y) => check.questions.indexOf(x.question) - check.questions.indexOf(y.question) || check.providers.indexOf(x.provider) - check.providers.indexOf(y.provider));
    for (const row of rows) {
      await sql`
        insert into ai_check_answers (check_id, provider, question, answer, mentioned, businesses, sources, error)
        values (${row.check_id}, ${row.provider}, ${row.question}, ${row.answer}, ${row.mentioned},
                ${row.businesses}, ${row.sources}, ${row.error})`;
    }

    const mentionedCount = rows.filter((r) => r.mentioned).length;
    const competitors = tallyCompetitors(rows.filter((r) => !r.error), check.business_name, check.website_url);
    await sql`
      update ai_checks set status = 'done', finished_at = now(), mentioned_count = ${mentionedCount},
        answer_count = ${answered.length}, competitors = ${sql.json(competitors)}
      where id = ${check.id}`;
    await afterCheck({ ...check, mentioned_count: mentionedCount, answer_count: answered.length, competitors });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[ai-check] check failed:", error);
    await sql`update ai_checks set status = 'failed', finished_at = now(), error = ${error} where id = ${check.id}`;
    await sql`insert into activities (lead_id, kind, body) values (${check.lead_id}, 'ai_check', ${`AI visibility check failed: ${error}`})`;
  }
}

/**
 * Runs the website, Google and contact checks for the full audit. A failure here never stops the AI check.
 * Skipped when the audit form already ran them for its instant summary.
 */
async function saveSiteAudit(check: AiCheck) {
  if (check.site_audit) return;
  try {
    const [lead] = await sql<{ email: string }[]>`select email from leads where id = ${check.lead_id}`;
    const audit = await runSiteAudit({
      businessName: check.business_name,
      website: check.website_url,
      email: lead?.email ?? "",
      city: check.city,
      trade: check.trade,
    });
    await sql`update ai_checks set site_audit = ${sql.json(audit)} where id = ${check.id}`;
  } catch (err) {
    // Most likely db/updates/2026-10-full-audit.sql hasn't been run yet.
    console.error("[audit] website checks not saved:", err);
  }
}

/** Records the result on the lead, moves a waiting audit to Audit Ready, and tells the owner a report needs review. */
async function afterCheck(check: AiCheck) {
  const top = check.competitors.slice(0, 3).map((c) => c.name).join(", ");
  const summary = `AI visibility check finished: named in ${check.mentioned_count} of ${check.answer_count} AI answers${top ? `. Most named instead: ${top}` : ""}.`;
  await sql`insert into activities (lead_id, kind, body) values (${check.lead_id}, 'ai_check', ${summary})`;

  const [moved] = await sql<{ stage: string }[]>`
    update leads set stage = 'audit_ready', updated_at = now()
    where id = ${check.lead_id} and stage = 'audit_in_progress'
    returning stage`;
  if (moved) {
    await sql`
      insert into activities (lead_id, kind, body)
      values (${check.lead_id}, 'stage_change', ${`Stage changed from ${stageLabel("audit_in_progress")} to ${stageLabel("audit_ready")}.`})`;
  }

  await sendEmail({
    to: process.env.OWNER_EMAIL ?? site.email,
    leadId: check.lead_id,
    template: "owner_ai_check",
    subject: `Audit ready to review: ${check.business_name}`,
    paragraphs: [
      summary,
      `Asked ${check.questions.length} questions in ${check.providers.map(providerLabel).join(", ")}.`,
      `Review it, then approve and send it from the lead's page: ${site.url}/admin/leads/${check.lead_id}`,
    ],
  });
}

/** Whether the lead already had a check started in the last `hours` hours. */
export async function hasRecentCheck(leadId: string, hours: number): Promise<boolean> {
  const [row] = await sql`
    select 1 from ai_checks where lead_id = ${leadId} and status <> 'failed'
      and created_at > now() - make_interval(hours => ${hours})`;
  return Boolean(row);
}

/**
 * Whether the website forms may start another check today. Caps what a flood of
 * form submissions could spend on AI services (AI_CHECK_DAILY_LIMIT, default 40).
 * Checks the owner starts from the dashboard don't count against it.
 */
export async function underDailyLimit(): Promise<boolean> {
  const limit = Number(process.env.AI_CHECK_DAILY_LIMIT) || 40;
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from ai_checks c join leads l on l.id = c.lead_id
    where c.created_at > now() - interval '24 hours' and l.source in ('audit_form', 'ai_search', 'geo_quiz')`;
  return row.n < limit;
}

/** Runs checks that are waiting or were interrupted. Used by the scheduled job. */
export async function processPending(limit = 5): Promise<number> {
  const pending = await sql<{ id: string }[]>`
    select id from ai_checks
    where status = 'queued' or (status = 'running' and started_at < now() - make_interval(mins => ${STALE_MINUTES}))
    order by created_at limit ${limit}`;
  for (const p of pending) await processCheck(p.id);
  return pending.length;
}

/** Queues this month's re-check for every client on monthly AI tracking. */
export async function queueMonthlyChecks(): Promise<number> {
  const due = await sql<{ id: string }[]>`
    select l.id from leads l
    where l.ai_monitoring and l.business_name <> '' and l.trade <> '' and l.city <> ''
      and not exists (
        select 1 from ai_checks c where c.lead_id = l.id and c.created_at > now() - interval '28 days'
      )`;
  let queued = 0;
  for (const l of due) if ("id" in (await queueCheck(l.id))) queued++;
  return queued;
}

export async function getChecksForLead(leadId: string): Promise<AiCheck[]> {
  return sql<AiCheck[]>`select * from ai_checks where lead_id = ${leadId} order by created_at desc limit 12`;
}

/** For each check, the AI services whose answers failed and the first error each gave, so a broken key is easy to spot. */
export async function getProviderErrors(checkIds: string[]): Promise<{ check_id: string; provider: string; error: string }[]> {
  if (checkIds.length === 0) return [];
  return sql<{ check_id: string; provider: string; error: string }[]>`
    select check_id, provider, min(error) as error
    from ai_check_answers where check_id in ${sql(checkIds)} and error is not null
    group by check_id, provider order by provider`;
}

export async function getAnswers(checkId: string): Promise<AiCheckAnswer[]> {
  return sql<AiCheckAnswer[]>`
    select id, provider, question, answer, mentioned, businesses, sources, error
    from ai_check_answers where check_id = ${checkId} order by created_at, id`;
}

/** The finished check before this one, for showing change over time. */
export async function getPreviousCheck(check: AiCheck): Promise<AiCheck | undefined> {
  const [prev] = await sql<AiCheck[]>`
    select * from ai_checks
    where lead_id = ${check.lead_id} and status = 'done' and created_at < ${check.created_at}
    order by created_at desc limit 1`;
  return prev;
}

export function reportUrl(check: Pick<AiCheck, "report_token">): string {
  return `${site.url}/report/${check.report_token}`;
}
