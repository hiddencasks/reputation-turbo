"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { auditRequestSchema, contactSchema, firstErrors, type FieldErrors } from "@/lib/validation";
import { isSuppressed, recentSubmissions, upsertLead } from "@/lib/leads";
import { notifyOwner, sendAuditConfirmation, sendContactConfirmation } from "@/lib/notifications";
import { aiChecksAvailable, hasRecentCheck, processCheck, queueCheck, underDailyLimit } from "@/lib/ai-visibility/run";

export type FormState = {
  ok: boolean;
  errors: FieldErrors;
  values: Record<string, string>;
};

const MAX_SUBMISSIONS_PER_10_MIN = 5;

async function visitorHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}:${process.env.SESSION_SECRET ?? ""}`).digest("hex").slice(0, 32);
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

export async function submitAuditRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, [
    "firstName", "lastName", "businessName", "trade", "tradeOther", "city", "cityOther", "phone", "email", "website", "noWebsite",
  ]);
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
      note: `Requested a free online audit${aiSearch ? " with an AI search check" : ""}${data.website ? ` for ${data.website}` : " (no website given)"}.${interest ? ` Interested in: ${interest}.` : ""}`,
      meta: { ipHash, website: data.website },
    });

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
    await notifyOwner(lead, "audit", `${data.trade} in ${data.city}.\n\n${nextStep}`, duplicate);
    return { ok: true, errors: {}, values: {} };
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
      meta: { ipHash },
    });

    if (!(await isSuppressed(lead.email))) await sendContactConfirmation(lead);
    await notifyOwner(lead, "contact", `Message:\n${data.message}`, duplicate);
    return { ok: true, errors: {}, values: {} };
  } catch (err) {
    console.error("[contact-form]", err);
    return { ok: false, errors: { form: genericError }, values };
  }
}
