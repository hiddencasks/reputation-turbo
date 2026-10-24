"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { auditRequestSchema, contactSchema, firstErrors, type FieldErrors } from "@/lib/validation";
import { isSuppressed, recentSubmissions, upsertLead } from "@/lib/leads";
import { notifyOwner, sendAuditConfirmation, sendContactConfirmation } from "@/lib/notifications";

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

/** Bots fill the hidden "company_site" field; people never see it. */
function isBot(formData: FormData): boolean {
  return String(formData.get("company_site") ?? "") !== "";
}

const genericError = "Something went wrong on our end. Please try again, or call us.";

export async function submitAuditRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["firstName", "lastName", "businessName", "phone", "email", "website"]);
  if (isBot(formData)) return { ok: true, errors: {}, values: {} };

  const parsed = auditRequestSchema.safeParse(values);
  if (!parsed.success) return { ok: false, errors: firstErrors(parsed.error), values };

  try {
    const ipHash = await visitorHash();
    if ((await recentSubmissions(ipHash, 10)) >= MAX_SUBMISSIONS_PER_10_MIN) {
      return { ok: false, errors: { form: "Too many requests from this connection. Please try again later." }, values };
    }

    const data = parsed.data;
    const aiSearch = formData.get("focus") === "ai-search";
    const { lead, duplicate } = await upsertLead({
      ...data,
      source: aiSearch ? "ai_search" : "audit_form",
      stage: "audit_in_progress",
      note: `Requested a free online audit${aiSearch ? " with an AI search check" : ""}${data.website ? ` for ${data.website}` : " (no website given)"}.`,
      meta: { ipHash, website: data.website },
    });

    if (!(await isSuppressed(lead.email))) await sendAuditConfirmation(lead);
    const nextStep = aiSearch
      ? "Next step: check what AI assistants say about them, run the audit and approve it before it is sent."
      : "Next step: run the audit and approve it before it is sent.";
    await notifyOwner(lead, "audit", nextStep, duplicate);
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
