"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createSession, destroySession, requireOwner } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { isSuppressed, upsertLead, type Lead } from "@/lib/leads";
import { site } from "@/lib/site";
import { normalizeWebsite, phoneDigits, prospectSchema } from "@/lib/validation";
import { findProspects } from "@/lib/finder-search";
import type { ScoredBusiness } from "@/lib/finder";
import { processCheck, queueCheck, reportUrl, type AiCheck } from "@/lib/ai-visibility/run";
import { providerLabel } from "@/lib/ai-visibility/providers";
import { verifyPassword } from "@/lib/password";
import { STAGE_IDS, stageLabel } from "@/lib/stages";
import { joinPackages } from "@/lib/recommend";
import { auditScore, type SiteAudit } from "@/lib/audit/checks";

// ---------- Login ----------

const failures = new Map<string, { count: number; until: number }>();

type LoginState = { error: string; email: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const lock = failures.get(email);
  if (lock && lock.until > Date.now()) return { error: "Too many attempts. Try again in a few minutes.", email };

  const expectedEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  const ok = Boolean(expectedEmail && hash) && email === expectedEmail && (await verifyPassword(password, hash));

  if (!ok) {
    const count = (lock?.count ?? 0) + 1;
    failures.set(email, { count, until: count >= 5 ? Date.now() + 10 * 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 400));
    return { error: "That email and password don't match.", email };
  }
  failures.delete(email);
  await createSession(email);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ---------- Leads ----------

function auditSummary(audit: SiteAudit): string {
  const { good, total } = auditScore(audit);
  const toFix = audit.sections.flatMap((sec) => sec.items).filter((i) => i.status === "fix").map((i) => (/^(Google|Facebook|Instagram|Yelp|Nextdoor)/.test(i.label) ? i.label : i.label.charAt(0).toLowerCase() + i.label.slice(1)));
  const top = toFix.slice(0, 3).join(", ");
  return `We reviewed your website, Google profile and online presence: ${good} of ${total} checks look good.${top ? ` The biggest opportunities: ${top}.` : ""}`;
}

const leadUpdate = z.object({
  stage: z.enum(STAGE_IDS),
  nextFollowUp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  recommendedPackage: z.array(z.string().trim().max(80)).max(25),
  trade: z.string().trim().max(80),
  city: z.string().trim().max(80),
  quoteAmount: z.string().trim().regex(/^\d*(\.\d{0,2})?$/, "Enter a dollar amount like 1497 or 1497.50"),
});

export async function updateLead(leadId: string, formData: FormData) {
  await requireOwner();
  const data = leadUpdate.parse({ ...Object.fromEntries(formData), recommendedPackage: formData.getAll("recommendedPackage").map(String) });
  const [before] = await sql<{ stage: string }[]>`select stage from leads where id = ${leadId}`;
  if (!before) throw new Error("Lead not found");

  const quoteCents = data.quoteAmount ? Math.round(Number(data.quoteAmount) * 100) : null;
  await sql`
    update leads set
      stage = ${data.stage},
      next_follow_up = ${data.nextFollowUp || null},
      recommended_package = ${joinPackages(data.recommendedPackage)},
      trade = ${data.trade},
      city = ${data.city},
      quote_amount_cents = ${quoteCents},
      updated_at = now()
    where id = ${leadId}`;

  if (before.stage !== data.stage) {
    await sql`
      insert into activities (lead_id, kind, body)
      values (${leadId}, 'stage_change', ${`Stage changed from ${stageLabel(before.stage)} to ${stageLabel(data.stage)}.`})`;
    if (data.stage === "do_not_contact") {
      await sql`
        insert into suppressions (email, reason)
        select lower(email), 'Marked Do Not Contact' from leads where id = ${leadId} and email <> ''
        on conflict (email) do nothing`;
    }
  }
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
}

export async function moveLeadStage(leadId: string, formData: FormData) {
  await requireOwner();
  const stage = z.enum(STAGE_IDS).parse(formData.get("stage"));
  const [before] = await sql<{ stage: string; email: string }[]>`select stage, email from leads where id = ${leadId}`;
  if (!before || before.stage === stage) return;
  await sql`update leads set stage = ${stage}, updated_at = now() where id = ${leadId}`;
  await sql`
    insert into activities (lead_id, kind, body)
    values (${leadId}, 'stage_change', ${`Stage changed from ${stageLabel(before.stage)} to ${stageLabel(stage)}.`})`;
  if (stage === "do_not_contact" && before.email) {
    await sql`insert into suppressions (email, reason) values (${before.email.toLowerCase()}, 'Marked Do Not Contact') on conflict (email) do nothing`;
  }
  revalidatePath("/admin/leads");
}

export async function addNote(leadId: string, formData: FormData) {
  await requireOwner();
  const body = z.string().trim().min(1).max(5000).parse(formData.get("note"));
  await sql`insert into activities (lead_id, kind, body) values (${leadId}, 'note', ${body})`;
  await sql`update leads set updated_at = now() where id = ${leadId}`;
  revalidatePath(`/admin/leads/${leadId}`);
}

/**
 * Permanently deletes a lead. Its notes, history, audits and AI reports go
 * with it (the database cascades those), and its email log rows are removed
 * too. Opt-outs in the suppression list are kept on purpose, so someone who
 * asked not to be contacted stays that way.
 */
export async function deleteLead(leadId: string, formData: FormData) {
  await requireOwner();
  if (formData.get("confirm") !== "delete") throw new Error("Delete was not confirmed.");
  await sql.begin(async (tx) => {
    await tx`delete from emails where lead_id = ${leadId}`;
    await tx`delete from leads where id = ${leadId}`;
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  redirect("/admin/leads?deleted=1");
}

// ---------- AI visibility checks ----------

/** Starts an AI visibility check for a lead; it runs in the background and the page refreshes until it's done. */
export async function runAiCheck(leadId: string) {
  await requireOwner();
  const result = await queueCheck(leadId);
  if ("error" in result) redirect(`/admin/leads/${leadId}?ai=${encodeURIComponent(result.error)}`);
  after(() => processCheck(result.id));
  revalidatePath(`/admin/leads/${leadId}`);
}

const EARLY_STAGES = ["new_prospect", "audit_in_progress", "audit_ready", "contacted"];

/**
 * Approves a finished report so its link works for the client. With
 * send=email it also emails the link to the lead and moves them to Audit
 * Delivered with a follow-up in 3 days.
 */
export async function approveReport(checkId: string, formData: FormData) {
  await requireOwner();
  const send = formData.get("send") === "email";
  const [check] = await sql<AiCheck[]>`
    update ai_checks set approved_at = coalesce(approved_at, now())
    where id = ${checkId} and status = 'done'
    returning *`;
  if (!check) throw new Error("Report not found or not finished.");
  const [lead] = await sql<Lead[]>`select * from leads where id = ${check.lead_id}`;
  const link = reportUrl(check);

  if (!send) {
    await sql`insert into activities (lead_id, kind, body) values (${lead.id}, 'ai_check', ${`AI report approved. Shareable link: ${link}`})`;
  } else {
    if (!lead.email) redirect(`/admin/leads/${lead.id}?ai=${encodeURIComponent("This lead has no email address. Add one or share the link yourself.")}`);
    if (await isSuppressed(lead.email)) redirect(`/admin/leads/${lead.id}?ai=${encodeURIComponent("This email address has opted out, so nothing was sent.")}`);
    const result = await sendEmail({
      to: lead.email,
      leadId: lead.id,
      template: "ai_report",
      subject: check.site_audit ? `Your free online audit for ${check.business_name}` : `Your free AI visibility report for ${check.business_name}`,
      paragraphs: [
        `Hi ${lead.first_name || "there"},`,
        ...(check.site_audit ? [auditSummary(check.site_audit)] : []),
        `More customers now ask AI assistants who to hire. We asked ${check.providers.map(providerLabel).join(", ")} the questions your customers ask, like "${check.questions[0]}", and recorded what they said.`,
        `${check.business_name} was named in ${check.mentioned_count} of ${check.answer_count} answers. Your report shows ${check.site_audit ? "every finding, " : ""}each AI answer, which businesses were recommended instead, and what we'd fix first:`,
        link,
        site.showPhone ? `Questions? Just reply to this email or call ${site.phoneDisplay}.` : `Questions? Just reply to this email, or book a 15-minute video call: ${site.bookingUrl}`,
        `The Reputation Turbo team`,
      ],
    });
    if (result.status !== "failed") {
      await sql`update ai_checks set sent_at = now() where id = ${check.id}`;
      await sql`insert into activities (lead_id, kind, body) values (${lead.id}, 'ai_check', ${`AI report approved and emailed to ${lead.email}.`})`;
      if (EARLY_STAGES.includes(lead.stage)) {
        await sql`
          update leads set stage = 'audit_delivered', next_follow_up = coalesce(next_follow_up, current_date + 3), updated_at = now()
          where id = ${lead.id}`;
        await sql`
          insert into activities (lead_id, kind, body)
          values (${lead.id}, 'stage_change', ${`Stage changed from ${stageLabel(lead.stage)} to ${stageLabel("audit_delivered")}.`})`;
      }
    }
  }
  revalidatePath(`/admin/leads/${lead.id}`);
  revalidatePath("/admin");
}

export async function setAiMonitoring(leadId: string, formData: FormData) {
  await requireOwner();
  const on = formData.get("on") === "true";
  await sql`update leads set ai_monitoring = ${on}, updated_at = now() where id = ${leadId}`;
  await sql`
    insert into activities (lead_id, kind, body)
    values (${leadId}, 'ai_check', ${on ? "Monthly AI tracking turned on." : "Monthly AI tracking turned off."})`;
  revalidatePath(`/admin/leads/${leadId}`);
}

export type ProspectState = { errors: Record<string, string | undefined>; values: Record<string, string> };

/**
 * Adds a lead by hand: a business to reach out to, or a customer who asked for
 * an audit by phone or in person. If asked, it also starts the full audit.
 */
export async function createProspect(_prev: ProspectState, formData: FormData): Promise<ProspectState> {
  await requireOwner();
  const values = Object.fromEntries(
    ["kind", "businessName", "trade", "city", "website", "firstName", "lastName", "email", "phone", "note"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = prospectSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors, values };
  }
  const d = parsed.data;
  const customer = values.kind === "customer";
  const { lead } = await upsertLead({
    firstName: d.firstName,
    lastName: d.lastName,
    businessName: d.businessName,
    email: d.email,
    phone: d.phone,
    website: d.website,
    trade: d.trade,
    city: d.city,
    source: customer ? "manual" : "outreach",
    stage: customer ? "audit_in_progress" : "new_prospect",
    note: customer
      ? `Added by you for a customer who asked for an audit (${d.trade} in ${d.city}).`
      : `Added as an outreach prospect (${d.trade} in ${d.city}).`,
  });
  if (d.note) await sql`insert into activities (lead_id, kind, body) values (${lead.id}, 'note', ${d.note})`;
  if (formData.get("runCheck") === "on") {
    const result = await queueCheck(lead.id);
    if ("id" in result) after(() => processCheck(result.id));
    else redirect(`/admin/leads/${lead.id}?ai=${encodeURIComponent(result.error)}`);
  }
  redirect(`/admin/leads/${lead.id}`);
}

// ---------- Prospect finder ----------

export type FinderState = { trade: string; city: string; error?: string; results?: ScoredBusiness[] };

const finderSearch = z.object({ trade: z.string().trim().min(1).max(80), city: z.string().trim().min(1).max(80) });

/** One Google Maps search for a trade in a city; nothing is saved and no audit runs. */
export async function searchProspects(_prev: FinderState, formData: FormData): Promise<FinderState> {
  await requireOwner();
  const trade = String(formData.get("trade") ?? "");
  const city = String(formData.get("city") ?? "");
  const parsed = finderSearch.safeParse({ trade, city });
  if (!parsed.success) return { trade, city, error: "Pick a type of business and a city." };
  const result = await findProspects(parsed.data.trade, parsed.data.city);
  revalidatePath("/admin/finder");
  return "error" in result ? { trade, city, error: result.error } : { trade, city, results: result.results };
}

export type AddFoundState = { leadId?: string; audit?: boolean; error?: string };

const foundBusiness = z.object({
  name: z.string().trim().min(1).max(120),
  trade: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  website: z.string().trim().max(500).default(""),
  phone: z.string().trim().max(40).default(""),
  summary: z.string().trim().max(500).default(""),
  mapsUrl: z.string().trim().max(500).default(""),
});

/**
 * Saves a business from the finder as an outreach prospect. With audit=1 it
 * also starts that one business's full audit (paid AI calls), never in bulk.
 */
export async function addFoundBusiness(_prev: AddFoundState, formData: FormData): Promise<AddFoundState> {
  await requireOwner();
  const parsed = foundBusiness.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something about this business didn't look right. Add it by hand instead." };
  const d = parsed.data;
  const website = normalizeWebsite(d.website) || "";
  const phone = phoneDigits(d.phone).length === 10 ? d.phone : "";
  const { lead } = await upsertLead({
    firstName: "",
    lastName: "",
    businessName: d.name,
    email: "",
    phone,
    website,
    trade: d.trade,
    city: d.city,
    source: "outreach",
    stage: "new_prospect",
    note: `Found with the prospect finder (${d.trade} in ${d.city}). ${d.summary}${d.mapsUrl ? ` Google Maps: ${d.mapsUrl}` : ""}`.trim(),
  });
  const audit = formData.get("audit") === "1";
  if (audit) {
    const result = await queueCheck(lead.id);
    if ("error" in result) return { leadId: lead.id, error: result.error };
    after(() => processCheck(result.id));
  }
  revalidatePath("/admin/leads");
  return { leadId: lead.id, audit };
}

// ---------- Pricing ----------

const offeringSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["package", "addon", "plan"]),
  tagline: z.string().trim().max(160),
  price: z.string().trim().regex(/^\d+(\.\d{0,2})?$/, "Enter a dollar amount like 1497"),
  priceSuffix: z.string().trim().max(60),
  description: z.string().trim().max(1000),
  deliverables: z.string().max(4000),
  revisionRounds: z.string().trim().regex(/^\d*$/),
  hoursLow: z.string().trim().regex(/^\d*(\.\d+)?$/),
  hoursHigh: z.string().trim().regex(/^\d*(\.\d+)?$/),
  sort: z.string().trim().regex(/^-?\d+$/),
  active: z.enum(["on"]).optional(),
});

function offeringValues(formData: FormData) {
  const d = offeringSchema.parse(Object.fromEntries(formData));
  return {
    name: d.name,
    kind: d.kind,
    tagline: d.tagline,
    price_cents: Math.round(Number(d.price) * 100),
    price_suffix: d.priceSuffix,
    description: d.description,
    deliverables: d.deliverables.split("\n").map((s) => s.trim()).filter(Boolean),
    revision_rounds: d.revisionRounds === "" ? null : Number(d.revisionRounds),
    est_hours_low: d.hoursLow === "" ? null : Number(d.hoursLow),
    est_hours_high: d.hoursHigh === "" ? null : Number(d.hoursHigh),
    sort: Number(d.sort),
    active: d.active === "on",
  };
}

function revalidatePricing() {
  revalidatePath("/admin/pricing");
  revalidatePath("/services");
  revalidatePath("/ai-search");
  revalidatePath("/");
}

export async function saveOffering(offeringId: string, formData: FormData) {
  await requireOwner();
  const v = offeringValues(formData);
  await sql`
    update offerings set
      name = ${v.name}, kind = ${v.kind}, tagline = ${v.tagline}, price_cents = ${v.price_cents},
      price_suffix = ${v.price_suffix}, description = ${v.description}, deliverables = ${v.deliverables},
      revision_rounds = ${v.revision_rounds}, est_hours_low = ${v.est_hours_low}, est_hours_high = ${v.est_hours_high},
      sort = ${v.sort}, active = ${v.active}, updated_at = now()
    where id = ${offeringId}`;
  revalidatePricing();
}

export async function createOffering(formData: FormData) {
  await requireOwner();
  const v = offeringValues(formData);
  const base = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  const slug = `${base}-${Date.now().toString(36)}`;
  await sql`
    insert into offerings (slug, kind, name, tagline, price_cents, price_suffix, description, deliverables,
                           revision_rounds, est_hours_low, est_hours_high, sort, active)
    values (${slug}, ${v.kind}, ${v.name}, ${v.tagline}, ${v.price_cents}, ${v.price_suffix}, ${v.description},
            ${v.deliverables}, ${v.revision_rounds}, ${v.est_hours_low}, ${v.est_hours_high}, ${v.sort}, ${v.active})`;
  revalidatePricing();
}

export async function setShowPrices(formData: FormData) {
  await requireOwner();
  const show = formData.get("show") === "true";
  await sql`
    insert into settings (key, value, updated_at) values ('show_prices', ${sql.json(show)}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
  revalidatePricing();
}
