"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, requireOwner } from "@/lib/auth";
import { sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { STAGE_IDS, stageLabel } from "@/lib/stages";

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

const leadUpdate = z.object({
  stage: z.enum(STAGE_IDS),
  nextFollowUp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  recommendedPackage: z.string().trim().max(120),
  quoteAmount: z.string().trim().regex(/^\d*(\.\d{0,2})?$/, "Enter a dollar amount like 1497 or 1497.50"),
});

export async function updateLead(leadId: string, formData: FormData) {
  await requireOwner();
  const data = leadUpdate.parse(Object.fromEntries(formData));
  const [before] = await sql<{ stage: string }[]>`select stage from leads where id = ${leadId}`;
  if (!before) throw new Error("Lead not found");

  const quoteCents = data.quoteAmount ? Math.round(Number(data.quoteAmount) * 100) : null;
  await sql`
    update leads set
      stage = ${data.stage},
      next_follow_up = ${data.nextFollowUp || null},
      recommended_package = ${data.recommendedPackage},
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
  revalidatePath("/one-sheet");
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
