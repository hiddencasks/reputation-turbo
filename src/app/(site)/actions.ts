"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { auditRequestSchema, contactSchema, firstErrors, type FieldErrors } from "@/lib/validation";
import { isSuppressed, recentSubmissions, upsertLead, type Lead } from "@/lib/leads";
import { notifyOwner, sendAuditConfirmation, sendContactConfirmation } from "@/lib/notifications";
import { site } from "@/lib/site";
import { sql } from "@/lib/db";
import { AD_COOKIE, parseAdSource } from "@/lib/ad-source";
import { QUIZ, quizScore, quizSummary } from "@/lib/quiz";
import { aiChecksAvailable, hasRecentCheck, processCheck, queueCheck, underDailyLimit } from "@/lib/ai-visibility/run";
import { runSiteAudit } from "@/lib/audit/run";
import { auditSnapshot, type AuditSnapshot, type SiteAudit } from "@/lib/audit/checks";

export type FormState = {
  ok: boolean;
  errors: FieldErrors;
  values: Record<string, string>;
};

/** The audit form's success state also carries the instant summary, when the quick checks finished in time. */
export type AuditFormState = FormState & { snapshot?: AuditSnapshot };

const MAX_SUBMISSIONS_PER_10_MIN = 5;

async function visitorHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}:${process.env.SESSION_SECRET ?? ""}`).digest("hex").slice(0, 32);
}

/** The ad or tagged link that brought this visitor, if any (saved by AdSourceCapture). */
async function adSource() {
  const ad = parseAdSource((await cookies()).get(AD_COOKIE)?.value);
  return ad ? { ad } : {};
}

function formValues(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

/**
 * Bots fill the hidden "rt_hp_v2" field; people never see it. The name has no meaning on purpose:
 * browsers can autofill a name like "company_site" for real visitors, which silently dropped their requests.
 */
function isBot(formData: FormData): boolean {
  const bot = String(formData.get("rt_hp_v2") ?? "") !== "";
  if (bot) console.warn("[forms] hidden spam field was filled; ignoring the submission");
  return bot;
}

const genericError = "Something went wrong on our end. Please try again, or email us.";

/** Dropdowns send "Other" plus a typed answer in `${key}Other`; use the typed answer. */
function withOther(values: Record<string, string>, keys: string[]): Record<string, string> {
  const out = { ...values };
  for (const k of keys) if (out[k] === "Other") out[k] = (values[`${k}Other`] ?? "").trim();
  return out;
}

/**
 * Everything after an audit request is saved: the visitor's confirmation, the AI and website
 * checks, and the owner's email. Used by the audit form and the quiz's "send my audit" button.
 */
async function startAudit(lead: Lead, duplicate: boolean, details: string, aiSearch = false): Promise<string | null> {
  if (!(await isSuppressed(lead.email))) await sendAuditConfirmation(lead);
  // Start the AI visibility check right away; it runs after the visitor sees the confirmation.
  // A repeat request within a day reuses the check already started.
  const check =
    aiChecksAvailable() && !(await hasRecentCheck(lead.id, 24)) && (await underDailyLimit()) ? await queueCheck(lead.id) : null;
  if (check && "id" in check) after(() => processCheck(check.id));

  const nextStep = check && "id" in check
    ? "The AI visibility check is running. You'll get an email when its report is ready to review. Then run the rest of the audit and approve both before they are sent."
    : aiSearch
      ? "Next step: check what AI assistants say about them, run the audit and approve it before it is sent."
      : "Next step: run the audit and approve it before it is sent.";
  await notifyOwner(lead, "audit", `${details}\n\n${nextStep}`, duplicate);
  return check && "id" in check ? check.id : null;
}

/** How long the visitor waits for the instant summary before we show the plain confirmation instead. */
const SNAPSHOT_WAIT_MS = 9_000;

/** Runs the quick website, Google, social and contact checks, or gives up after SNAPSHOT_WAIT_MS. */
async function quickAudit(lead: Lead): Promise<SiteAudit | null> {
  const run = runSiteAudit({ businessName: lead.business_name, website: lead.website_url, email: lead.email, city: lead.city, trade: lead.trade });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SNAPSHOT_WAIT_MS));
  return Promise.race([run, timeout]).catch((err) => {
    console.error("[audit-form] quick checks failed:", err);
    return null;
  });
}

export async function submitAuditRequest(_prev: AuditFormState, formData: FormData): Promise<AuditFormState> {
  const values = formValues(formData, [
    "firstName", "lastName", "businessName", "trade", "tradeOther", "city", "cityOther", "phone", "email", "website", "noWebsite",
  ]);
  const helpWith = formData.getAll("helpWith").map(String).filter((h) => (site.helpOptions as readonly string[]).includes(h));
  values.helpWith = helpWith.join("|");
  if (isBot(formData)) return { ok: true, errors: {}, values: {} };

  const input = withOther(values, ["trade", "city"]);
  if (input.noWebsite === "on") input.website = "";
  const parsed = auditRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: firstErrors(parsed.error), values };

  try {
    const ipHash = await visitorHash();
    if ((await recentSubmissions(ipHash, 10)) >= MAX_SUBMISSIONS_PER_10_MIN) {
      return { ok: false, errors: { form: "Too many requests from this connection. Please try again later." }, values };
    }

    const data = parsed.data;
    const aiSearch = formData.get("focus") === "ai-search";
    const interest = String(formData.get("interest") ?? "").trim().slice(0, 80);
    const { lead, duplicate } = await upsertLead({
      ...data,
      source: aiSearch ? "ai_search" : "audit_form",
      stage: "audit_in_progress",
      note: `Requested a free online audit${aiSearch ? " with an AI search check" : ""}${data.website ? ` for ${data.website}` : " (no website given)"}.${interest ? ` Interested in: ${interest}.` : ""}${helpWith.length ? ` Wants help with: ${helpWith.join(", ")}.` : ""}`,
      meta: { ipHash, website: data.website, ...(await adSource()) },
    });

    const wants = helpWith.length ? `\nWants help with: ${helpWith.join(", ")}.` : "";
    const [checkId, audit] = await Promise.all([startAudit(lead, duplicate, `${data.trade} in ${data.city}.${wants}`, aiSearch), quickAudit(lead)]);
    if (!audit) return { ok: true, errors: {}, values: {} };
    // Reuse these results in the full report so the website isn't checked twice.
    if (checkId) await sql`update ai_checks set site_audit = ${sql.json(audit)} where id = ${checkId}`.catch(() => {});
    return { ok: true, errors: {}, values: {}, snapshot: auditSnapshot(audit, { website: lead.website_url }) };
  } catch (err) {
    console.error("[audit-form]", err);
    return { ok: false, errors: { form: genericError }, values };
  }
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["firstName", "lastName", "businessName", "phone", "email", "message"]);
  if (isBot(formData)) return { ok: true, errors: {}, values: {} };

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { ok: false, errors: firstErrors(parsed.error), values };

  try {
    const ipHash = await visitorHash();
    if ((await recentSubmissions(ipHash, 10)) >= MAX_SUBMISSIONS_PER_10_MIN) {
      return { ok: false, errors: { form: "Too many messages from this connection. Please try again later." }, values };
    }

    const data = parsed.data;
    const { lead, duplicate } = await upsertLead({
      ...data,
      source: "contact_form",
      stage: "new_prospect",
      note: data.message,
      meta: { ipHash, ...(await adSource()) },
    });

    if (!(await isSuppressed(lead.email))) await sendContactConfirmation(lead);
    await notifyOwner(lead, "contact", `Message:\n${data.message}`, duplicate);
    return { ok: true, errors: {}, values: {} };
  } catch (err) {
    console.error("[contact-form]", err);
    return { ok: false, errors: { form: genericError }, values };
  }
}

// ---------- GEO quiz ----------

export type QuizState = FormState & { score?: number; leadId?: string; answers?: Record<string, string> };

/** Saves a quiz taker as a lead with their answers, then shows them their score. */
export async function submitQuiz(_prev: QuizState, formData: FormData): Promise<QuizState> {
  const values = formValues(formData, ["firstName", "businessName", "trade", "tradeOther", "city", "cityOther", "email", "website", "noWebsite"]);
  const answers = Object.fromEntries(
    QUIZ.map((q) => [q.id, ["yes", "no", "unsure"].includes(String(formData.get(`q_${q.id}`))) ? String(formData.get(`q_${q.id}`)) : "unsure"]),
  );
  if (isBot(formData)) return { ok: true, errors: {}, values: {}, score: quizScore(answers), answers };

  const input = withOther(values, ["trade", "city"]);
  if (input.noWebsite === "on") input.website = "";
  const parsed = auditRequestSchema.safeParse({ ...input, lastName: "", phone: "" });
  if (!parsed.success) return { ok: false, errors: firstErrors(parsed.error), values, answers };

  try {
    const ipHash = await visitorHash();
    if ((await recentSubmissions(ipHash, 10)) >= MAX_SUBMISSIONS_PER_10_MIN) {
      return { ok: false, errors: { form: "Too many requests from this connection. Please try again later." }, values, answers };
    }
    const summary = quizSummary(answers);
    const { lead, duplicate } = await upsertLead({
      ...parsed.data,
      source: "geo_quiz",
      stage: "new_prospect",
      note: summary,
      meta: { ipHash, quiz: answers, score: quizScore(answers), ...(await adSource()) },
    });
    await notifyOwner(lead, "quiz", `${parsed.data.trade} in ${parsed.data.city}.\n${summary}\n\nThey haven't asked for the audit yet. If they click "Send my free audit", you'll get a second email.`, duplicate);
    return { ok: true, errors: {}, values: {}, score: quizScore(answers), leadId: lead.id, answers };
  } catch (err) {
    console.error("[geo-quiz]", err);
    return { ok: false, errors: { form: genericError }, values, answers };
  }
}

/** The quiz results page's "Send my free audit" button. Only works for a quiz taken in the last day. */
export async function requestQuizAudit(leadId: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[0-9a-f-]{36}$/.test(leadId)) return { ok: false, error: genericError };
  try {
    const [lead] = await sql<Lead[]>`
      select l.* from leads l
      where l.id = ${leadId} and exists (
        select 1 from activities a where a.lead_id = l.id and a.kind = 'geo_quiz' and a.created_at > now() - interval '1 day'
      )`;
    if (!lead) return { ok: false, error: "This quiz has expired. Please request your audit from the free audit page." };
    if (lead.stage === "new_prospect" || lead.stage === "lost") {
      await sql`update leads set stage = 'audit_in_progress', updated_at = now() where id = ${lead.id}`;
    }
    await sql`
      insert into activities (lead_id, kind, body)
      values (${lead.id}, 'audit_form', ${`Requested a free online audit from the GEO quiz${lead.website_url ? ` for ${lead.website_url}` : " (no website given)"}.`})`;
    await startAudit({ ...lead, stage: "audit_in_progress" }, true, `${lead.trade} in ${lead.city}.\nCame from the GEO quiz.`);
    return { ok: true };
  } catch (err) {
    console.error("[geo-quiz audit]", err);
    return { ok: false, error: genericError };
  }
}
