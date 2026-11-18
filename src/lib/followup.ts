import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { sql } from "./db";
import { sendEmail } from "./email";
import { isSuppressed, type Lead } from "./leads";
import { addressOneLine } from "./site";
import { anthropic, CLAUDE_MODEL, providerLabel } from "./ai-visibility/providers";
import { getAnswers, type AiCheck } from "./ai-visibility/run";
import { auditMarkdown } from "./audit/export";
import { SUMMARY_KINDS, summarizeLead, type SummaryActivity } from "./lead-summary";
import {
  cleanDraft,
  FOLLOWUP_SCHEMA,
  FOLLOWUP_SYSTEM,
  followupBlockReason,
  followupDelayMinutes,
  followupFrom,
  followupText,
  followupUserPrompt,
  friendlyBusinessName,
  friendlyFirstName,
  type Followup,
} from "./followup-text";

// The personal note that goes out about an hour after "Approve & email".
// Flow: approveReport() calls queueFollowup() -> a row in followup_notes with
// status "writing" -> writeFollowup() asks Claude for the note -> "scheduled"
// -> the cron (/api/cron/followups, every 10 minutes) sends it once send_at
// passes, checking opt-outs, pitch flags and the lead's stage again first.

const MODEL = process.env.FOLLOWUP_MODEL || CLAUDE_MODEL;

/** The note for each check, newest first. Empty if the table doesn't exist yet (SQL not run). */
export async function getFollowupsForLead(leadId: string): Promise<Followup[]> {
  try {
    return await sql<Followup[]>`select * from followup_notes where lead_id = ${leadId} order by created_at desc`;
  } catch (err) {
    // Never let the follow-up box break the whole lead page.
    if (!isMissingTable(err)) console.error("[followup] could not load notes:", err);
    return [];
  }
}

/** False until the one-time SQL (db/updates/2026-11-followup-notes.sql) has been run. */
export async function followupsReady(): Promise<boolean> {
  try {
    const [row] = await sql<{ ok: boolean }[]>`select to_regclass('public.followup_notes') is not null as ok`;
    return Boolean(row?.ok);
  } catch (err) {
    console.error("[followup] could not check for the table:", err);
    return false;
  }
}

export function isMissingTable(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "42P01";
}

async function blockReason(lead: Lead): Promise<string | null> {
  const activities = await sql<SummaryActivity[]>`
    select lead_id, kind, body, meta, created_at from activities
    where lead_id = ${lead.id} and kind in ${sql([...SUMMARY_KINDS])}`;
  const { vendor } = summarizeLead(lead, activities);
  const suppressed = lead.email ? await isSuppressed(lead.email) : false;
  return followupBlockReason({ email: lead.email, stage: lead.stage, suppressed, vendor });
}

/**
 * Creates the follow-up row for a check that was just emailed and returns its
 * id, or null when there's already one or the lead shouldn't get one. The note
 * itself is written afterwards by writeFollowup().
 */
export async function queueFollowup(checkId: string): Promise<string | null> {
  const [check] = await sql<AiCheck[]>`select * from ai_checks where id = ${checkId}`;
  if (!check) return null;
  const [lead] = await sql<Lead[]>`select * from leads where id = ${check.lead_id}`;
  if (!lead) return null;
  const blocked = await blockReason(lead);
  const delay = followupDelayMinutes();
  try {
    const [row] = await sql<{ id: string }[]>`
      insert into followup_notes (lead_id, check_id, status, send_at, note)
      values (${lead.id}, ${check.id}, ${blocked ? "skipped" : "writing"},
              now() + make_interval(mins => ${delay}), ${blocked ?? ""})
      on conflict (check_id) do nothing
      returning id`;
    if (blocked && row) {
      await sql`insert into activities (lead_id, kind, body) values (${lead.id}, 'followup', ${`No personal follow-up: ${blocked}`})`;
    }
    return row && !blocked ? row.id : null;
  } catch (err) {
    // The table doesn't exist until the one-time SQL is run; the report email still goes out.
    if (isMissingTable(err)) return null;
    throw err;
  }
}

/** Asks Claude for the note and saves it as "scheduled". On failure the row shows why, and the owner can try again. */
export async function writeFollowup(followupId: string): Promise<void> {
  const [row] = await sql<Followup[]>`select * from followup_notes where id = ${followupId}`;
  if (!row) return;
  try {
    const [[check], [lead], answers] = await Promise.all([
      sql<AiCheck[]>`select * from ai_checks where id = ${row.check_id}`,
      sql<Lead[]>`select * from leads where id = ${row.lead_id}`,
      getAnswers(row.check_id),
    ]);
    if (!check || !lead) throw new Error("The audit or lead is gone.");
    const prompt = followupUserPrompt({
      firstName: lead.first_name,
      businessName: check.business_name || lead.business_name,
      trade: check.trade,
      city: check.city,
      auditMarkdown: auditMarkdown(lead, check, answers, providerLabel),
    });
    const draft = await draftNote(prompt, { firstName: lead.first_name, businessName: check.business_name, check });
    const { subject, body } = cleanDraft(draft);
    if (!subject || body.length < 20) throw new Error("The note came back empty.");
    await sql`
      update followup_notes set subject = ${subject}, body = ${body}, note = ${draft.finding.slice(0, 300)},
        status = 'scheduled', updated_at = now()
      where id = ${row.id} and status in ('writing', 'draft_failed', 'scheduled')`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[followup:draft_failed] ${row.id}: ${message}`);
    await sql`
      update followup_notes set status = 'draft_failed', note = ${message.slice(0, 500)}, updated_at = now()
      where id = ${row.id} and status in ('writing', 'scheduled', 'draft_failed')`;
  }
}

type Draft = { subject: string; body: string; finding: string };

async function draftNote(prompt: string, ctx: { firstName: string; businessName: string; check: AiCheck }): Promise<Draft> {
  if (process.env.AI_CHECK_FAKE === "1") return fakeDraft(ctx);
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set in Vercel, so the note can't be written.");
  const response = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // A short note doesn't need deep thinking; low effort keeps each one to a few cents.
    output_config: { effort: "low", format: { type: "json_schema", schema: FOLLOWUP_SCHEMA as unknown as Record<string, unknown> } },
    system: FOLLOWUP_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to write this note. Write it yourself or skip it.");
  const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  let parsed: Draft;
  try {
    parsed = JSON.parse(text) as Draft;
  } catch {
    throw new Error("Claude's answer wasn't in the expected format. Try again.");
  }
  if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") throw new Error("Claude's answer was missing the subject or text.");
  return { subject: parsed.subject, body: parsed.body, finding: typeof parsed.finding === "string" ? parsed.finding : "" };
}

/** A predictable note for local development and tests (AI_CHECK_FAKE=1); never calls an AI service. */
function fakeDraft(ctx: { firstName: string; businessName: string; check: AiCheck }): Draft {
  const name = friendlyBusinessName(ctx.businessName);
  const first = friendlyFirstName(ctx.firstName);
  const rival = ctx.check.competitors[0]?.name;
  const finding = rival
    ? `When I asked the AI assistants who the best ${ctx.check.trade.toLowerCase()} in ${ctx.check.city} is, they named ${rival} and left ${name} out in ${ctx.check.answer_count - ctx.check.mentioned_count} of ${ctx.check.answer_count} answers.`
    : `${name} was named in ${ctx.check.mentioned_count} of ${ctx.check.answer_count} AI answers for ${ctx.check.city}.`;
  return {
    subject: `Quick thought on ${name}`,
    body: `${first ? `${first},` : "Hi there,"}\n\n${finding} That's customers going straight to someone else, and it's fixable. Got 15 minutes this week?`,
    finding: rival ? `AI names ${rival} instead` : "AI visibility",
  };
}

/** Sends every scheduled note whose time has come. Called by the cron. */
export async function sendDueFollowups(limit = 20): Promise<{ id: string; status: string; note?: string }[]> {
  const due = await sql<Followup[]>`
    update followup_notes set status = 'sending', updated_at = now()
    where id in (
      select id from followup_notes where status = 'scheduled' and send_at <= now()
      order by send_at limit ${limit} for update skip locked)
    returning *`;
  const out: { id: string; status: string; note?: string }[] = [];
  for (const f of due) out.push(await sendOne(f));
  // Anything stuck "writing" for over 15 minutes (the server stopped mid-way) gets written again.
  const stuck = await sql<{ id: string }[]>`
    select id from followup_notes where status = 'writing' and updated_at < now() - interval '15 minutes' limit 5`;
  for (const s of stuck) await writeFollowup(s.id);
  return out;
}

/** Sends one note now, after checking it still should go out. */
export async function sendOne(f: Followup): Promise<{ id: string; status: string; note?: string }> {
  const [lead] = await sql<Lead[]>`select * from leads where id = ${f.lead_id}`;
  const blocked = lead ? await blockReason(lead) : "The lead was deleted.";
  if (blocked || !lead) {
    await sql`update followup_notes set status = 'skipped', note = ${blocked ?? ""}, updated_at = now() where id = ${f.id}`;
    if (lead) await sql`insert into activities (lead_id, kind, body) values (${lead.id}, 'followup', ${`Personal follow-up not sent: ${blocked}`})`;
    return { id: f.id, status: "skipped", note: blocked ?? undefined };
  }
  const result = await sendEmail({
    to: lead.email,
    leadId: lead.id,
    template: "followup_note",
    subject: f.subject,
    paragraphs: [],
    plainText: followupText(f.body, addressOneLine),
    from: followupFrom(process.env.EMAIL_FROM),
  });
  if (result.status === "failed") {
    await sql`update followup_notes set status = 'failed', note = ${result.error ?? "Sending failed."}, updated_at = now() where id = ${f.id}`;
    return { id: f.id, status: "failed", note: result.error };
  }
  await sql`update followup_notes set status = 'sent', sent_at = now(), updated_at = now() where id = ${f.id}`;
  await sql`insert into activities (lead_id, kind, body) values (${lead.id}, 'followup', ${`Personal follow-up emailed to ${lead.email}: "${f.subject}"`})`;
  return { id: f.id, status: "sent" };
}
