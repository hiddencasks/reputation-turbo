import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { sql } from "./db";
import { sendEmail } from "./email";
import { site } from "./site";
import { dollars } from "./checkout-terms";
import { anthropic, CLAUDE_MODEL } from "./ai-visibility/providers";
import { getIntake, getProjectForLead } from "./projects";
import { intakeDef, summarize, withCities } from "./projects/intake";
import {
  canPost,
  formatPostDate,
  googleText,
  isDue,
  monthLabel,
  monthSlots,
  planStatusFromStripe,
  postAllowance,
  statusLabel,
  type PlanStatus,
  type PostChannel,
} from "./plan-schedule";

// Monthly plans and the posts we make for each client.
//
// - A plan row is made automatically when someone pays for a monthly plan through Stripe
//   (see payments.ts), or by hand from a lead's page. Stripe's webhook keeps its status
//   current: a failed payment pauses posting, a canceled subscription stops it.
// - Each month, "Draft posts" asks Claude for the plan's posts (8 Facebook/Instagram + 4
//   Google on Presence Pro). The owner edits and approves them; the hourly cron
//   (/api/cron/social) publishes approved posts on their dates.
// - Facebook and Instagram post through Meta's Graph API with one system-user token
//   (META_CLIENT_TOKEN in Vercel) that the client's Page was shared with. Until a plan's Page
//   is connected, and for Google (no API access yet), each due post is emailed to the owner
//   to paste by hand instead.

export type ClientPlan = {
  id: string;
  lead_id: string;
  slug: string;
  name: string;
  amount_cents: number;
  status: PlanStatus;
  stripe_subscription_id: string | null;
  stripe_customer_id: string;
  started_at: Date;
  current_period_end: Date | null;
  last_paid_at: Date | null;
  last_failed_at: Date | null;
  canceled_at: Date | null;
  facebook_page_id: string;
  instagram_user_id: string;
  brand_color: string;
  paused: boolean;
  created_at: Date;
  updated_at: Date;
};

export type PlanWithLead = ClientPlan & { business_name: string; first_name: string; last_name: string; email: string; phone: string; city: string; trade: string; website_url: string };

export type Network = "facebook" | "instagram" | "google";
export type NetworkResult = { status: "posted" | "failed" | "reminded"; attempts: number; at: string; remoteId?: string; error?: string };

export type PlanPost = {
  id: string;
  plan_id: string;
  channel: PostChannel;
  publish_at: Date;
  headline: string;
  subline: string;
  caption: string;
  photo_path: string;
  status: "draft" | "approved" | "posting" | "done" | "skipped";
  results: Partial<Record<Network, NetworkResult>>;
  reminded_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PlanPhoto = { path: string; filename: string; source: "plan" | "checklist"; id?: string };

const MAX_ATTEMPTS = 3;
const owner = () => process.env.OWNER_EMAIL ?? site.email;
const leadName = (p: { business_name: string; first_name: string; last_name: string }) => p.business_name || `${p.first_name} ${p.last_name}`.trim() || "A client";

function isMissingTable(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "42P01";
}

/** False until db/updates/2026-11-client-plans.sql has been run. */
export async function plansReady(): Promise<boolean> {
  try {
    const [row] = await sql<{ ok: boolean }[]>`select to_regclass('public.plan_posts') is not null as ok`;
    return Boolean(row?.ok);
  } catch {
    return false;
  }
}

const withLead = sql`
  select p.*, l.business_name, l.first_name, l.last_name, l.email, l.phone, l.city, l.trade, l.website_url
  from client_plans p join leads l on l.id = p.lead_id`;

export async function listPlans(): Promise<(PlanWithLead & { upcoming: number; drafts: number })[]> {
  try {
    return await sql<(PlanWithLead & { upcoming: number; drafts: number })[]>`
      select x.*,
        (select count(*)::int from plan_posts pp where pp.plan_id = x.id and pp.status = 'approved' and pp.publish_at > now()) as upcoming,
        (select count(*)::int from plan_posts pp where pp.plan_id = x.id and pp.status = 'draft') as drafts
      from (${withLead}) x
      order by (x.status = 'canceled'), x.started_at desc`;
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

export async function getPlan(id: string): Promise<PlanWithLead | null> {
  const [row] = await sql<PlanWithLead[]>`select * from (${withLead}) x where x.id = ${id}`;
  return row ?? null;
}

export async function plansForLead(leadId: string): Promise<ClientPlan[]> {
  try {
    return await sql<ClientPlan[]>`select * from client_plans where lead_id = ${leadId} order by started_at desc`;
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

async function note(leadId: string, body: string) {
  await sql`insert into activities (lead_id, kind, body) values (${leadId}, 'note', ${body})`;
}

// ---------- Making plans ----------

/** Called when a subscription checkout is paid. Makes the plan once (Stripe can repeat events). Returns its id. */
export async function ensurePlanFromCheckout(p: { leadId: string; slug: string; name: string; amountCents: number; subscriptionId: string; customerId: string }): Promise<string | null> {
  if (!(await plansReady())) return null;
  const [row] = await sql<{ id: string }[]>`
    insert into client_plans (lead_id, slug, name, amount_cents, status, stripe_subscription_id, stripe_customer_id, last_paid_at)
    values (${p.leadId}, ${p.slug}, ${p.name}, ${p.amountCents}, 'active', ${p.subscriptionId || null}, ${p.customerId}, now())
    on conflict (stripe_subscription_id) do nothing
    returning id`;
  if (!row) {
    const [existing] = await sql<{ id: string }[]>`select id from client_plans where stripe_subscription_id = ${p.subscriptionId}`;
    return existing?.id ?? null;
  }
  await note(p.leadId, `Monthly plan started: ${p.name}, ${dollars(p.amountCents)}/month. Posts page: ${site.url}/admin/plans/${row.id}`);
  return row.id;
}

/** A plan paid outside Stripe (cash, check, or free). */
export async function createManualPlan(leadId: string, slug: string, name: string, amountCents: number): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into client_plans (lead_id, slug, name, amount_cents, status, last_paid_at)
    values (${leadId}, ${slug}, ${name}, ${amountCents}, 'manual', now())
    returning id`;
  await note(leadId, `Monthly plan started by hand: ${name}, ${dollars(amountCents)}/month.`);
  return row.id;
}

export async function updatePlanSettings(id: string, s: { slug: string; name: string; facebookPageId: string; instagramUserId: string; brandColor: string; paused: boolean }) {
  await sql`
    update client_plans set slug = ${s.slug}, name = ${s.name}, facebook_page_id = ${s.facebookPageId}, instagram_user_id = ${s.instagramUserId},
      brand_color = ${s.brandColor}, paused = ${s.paused}, updated_at = now()
    where id = ${id}`;
}

/** Ends a plan that isn't billed through Stripe. Stripe plans are canceled in Stripe, which tells us. */
export async function endManualPlan(id: string) {
  const [plan] = await sql<ClientPlan[]>`
    update client_plans set status = 'canceled', canceled_at = now(), updated_at = now()
    where id = ${id} and stripe_subscription_id is null returning *`;
  if (plan) await note(plan.lead_id, `Monthly plan ended: ${plan.name}. Posting stopped.`);
}

// ---------- Stripe keeping it current ----------

export type StripeSubscription = {
  id: string;
  status: string;
  customer?: string | null;
  cancel_at_period_end?: boolean;
  current_period_end?: number | null;
  items?: { data?: { current_period_end?: number | null }[] } | null;
};

export type StripeInvoice = {
  id: string;
  subscription?: string | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  billing_reason?: string | null;
  hosted_invoice_url?: string | null;
};

const invoiceSubscription = (i: StripeInvoice) => i.subscription || i.parent?.subscription_details?.subscription || "";

async function planBySubscription(subscriptionId: string): Promise<PlanWithLead | null> {
  if (!subscriptionId || !(await plansReady())) return null;
  const [row] = await sql<PlanWithLead[]>`select * from (${withLead}) x where x.stripe_subscription_id = ${subscriptionId}`;
  return row ?? null;
}

/** customer.subscription.updated / .deleted */
export async function applySubscription(sub: StripeSubscription, deleted: boolean) {
  const plan = await planBySubscription(sub.id);
  if (!plan) return;
  const status: PlanStatus = deleted ? "canceled" : planStatusFromStripe(sub.status);
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  await sql`
    update client_plans set status = ${status}, current_period_end = ${periodEnd ? new Date(periodEnd * 1000) : plan.current_period_end},
      canceled_at = ${status === "canceled" ? (plan.canceled_at ?? new Date()) : null}, updated_at = now()
    where id = ${plan.id}`;
  if (status === plan.status) {
    // Canceling "at the end of the period" keeps it active until then; let the owner know once.
    if (sub.cancel_at_period_end && status === "active") await tellOwnerOnce(plan, "cancel-scheduled", `Plan canceled: ${leadName(plan)}`, [
      `${leadName(plan)} canceled their ${plan.name} plan. It stays active until ${periodEnd ? new Date(periodEnd * 1000).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "America/Los_Angeles" }) : "the end of the month they paid for"}, then posting stops on its own.`,
    ]);
    return;
  }
  if (status === "canceled") {
    await note(plan.lead_id, `Monthly plan canceled in Stripe: ${plan.name}. Posting stopped.`);
    await emailOwner(plan, `Plan ended: ${leadName(plan)}`, [
      `${leadName(plan)}'s ${plan.name} plan (${dollars(plan.amount_cents)}/month) is canceled. No more posts will go out for them, and Stripe won't charge them again.`,
      "Their website stays theirs. If it's worth a call to ask why, now is a good time.",
    ]);
  } else if (status === "past_due") {
    await note(plan.lead_id, `Monthly plan payment problem (Stripe says "${sub.status}"). Posting is paused until it's paid.`);
  } else if (status === "active" && plan.status === "past_due") {
    await note(plan.lead_id, "Monthly plan is paid up again. Posting is back on.");
  }
}

/** invoice.payment_failed / invoice.paid */
export async function applyInvoice(invoice: StripeInvoice, paid: boolean) {
  const plan = await planBySubscription(invoiceSubscription(invoice));
  if (!plan) return;
  if (paid) {
    await sql`update client_plans set status = 'active', last_paid_at = now(), updated_at = now() where id = ${plan.id} and status <> 'canceled'`;
    if (invoice.billing_reason === "subscription_cycle") {
      await note(plan.lead_id, `Monthly plan paid: ${plan.name}, ${dollars(invoice.amount_paid ?? plan.amount_cents)}.`);
    }
    if (plan.status === "past_due") {
      await note(plan.lead_id, "Monthly plan is paid up again. Posting is back on.");
      await emailOwner(plan, `Paid up again: ${leadName(plan)}`, [`The ${plan.name} payment went through, so their posts are back on schedule.`]);
    }
    return;
  }
  await sql`update client_plans set status = 'past_due', last_failed_at = now(), updated_at = now() where id = ${plan.id} and status <> 'canceled'`;
  const first = await tellOwnerOnce(plan, `failed:${invoice.id}`, `Monthly payment failed: ${leadName(plan)}`, [
    `Stripe couldn't charge ${leadName(plan)} ${dollars(invoice.amount_due ?? plan.amount_cents)} for their ${plan.name} plan. Their posts are paused until it's paid.`,
    "Stripe will retry the card over the next few days and email them. A quick text from you usually fixes it faster.",
    invoice.hosted_invoice_url ? `Payment page you can send them: ${invoice.hosted_invoice_url}` : "",
  ]);
  if (first) await note(plan.lead_id, `Monthly plan payment failed (${dollars(invoice.amount_due ?? plan.amount_cents)}). Posting is paused until it's paid.`);
}

async function emailOwner(plan: PlanWithLead, subject: string, paragraphs: string[]) {
  await sendEmail({
    to: owner(),
    leadId: plan.lead_id,
    template: "owner_plan_update",
    subject,
    paragraphs: [...paragraphs.filter(Boolean), `Open the plan: ${site.url}/admin/plans/${plan.id}`],
  });
}

async function tellOwnerOnce(plan: PlanWithLead, what: string, subject: string, paragraphs: string[]): Promise<boolean> {
  const key = `plan:${plan.id}:${what}`;
  const rows = await sql`insert into settings (key, value, updated_at) values (${key}, ${sql.json({ at: new Date().toISOString() })}, now()) on conflict (key) do nothing returning key`;
  if (rows.length) await emailOwner(plan, subject, paragraphs);
  return rows.length > 0;
}

// ---------- Photos ----------

export async function planPhotos(plan: ClientPlan): Promise<PlanPhoto[]> {
  const own = await sql<{ id: string; storage_path: string; filename: string }[]>`
    select id, storage_path, filename from plan_photos where plan_id = ${plan.id} order by created_at desc`;
  const out: PlanPhoto[] = own.map((r) => ({ id: r.id, path: r.storage_path, filename: r.filename, source: "plan" }));
  // Photos the client already sent in their website checklist work too.
  const project = await getProjectForLead(plan.lead_id).catch(() => null);
  if (project) {
    const { files } = await getIntake(project.id);
    for (const f of files) if (/^image\/(jpeg|png|webp)/.test(f.content_type) || /\.(jpe?g|png|webp)$/i.test(f.filename)) out.push({ path: f.storage_path, filename: f.filename, source: "checklist" });
  }
  return out;
}

export async function addPlanPhoto(planId: string, path: string, filename: string) {
  await sql`insert into plan_photos (plan_id, storage_path, filename) values (${planId}, ${path}, ${filename}) on conflict (storage_path) do nothing`;
}

export async function removePlanPhoto(planId: string, photoId: string): Promise<string | null> {
  const [row] = await sql<{ storage_path: string }[]>`delete from plan_photos where id = ${photoId} and plan_id = ${planId} returning storage_path`;
  if (row) await sql`update plan_posts set photo_path = '' where plan_id = ${planId} and photo_path = ${row.storage_path} and status in ('draft', 'approved')`;
  return row?.storage_path ?? null;
}

// ---------- Posts ----------

export async function postsForPlan(planId: string): Promise<PlanPost[]> {
  return sql<PlanPost[]>`
    select * from plan_posts where plan_id = ${planId}
      and publish_at >= date_trunc('month', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles' - interval '1 month'
    order by publish_at`;
}

export async function getPost(id: string): Promise<(PlanPost & { brand_color: string; business_name: string }) | null> {
  const [row] = await sql<(PlanPost & { brand_color: string; business_name: string })[]>`
    select pp.*, p.brand_color, l.business_name from plan_posts pp
    join client_plans p on p.id = pp.plan_id join leads l on l.id = p.lead_id
    where pp.id = ${id}`;
  return row ?? null;
}

export async function savePost(planId: string, postId: string, f: { publishAt: Date; headline: string; subline: string; caption: string; photoPath: string }) {
  await sql`
    update plan_posts set publish_at = ${f.publishAt}, headline = ${f.headline}, subline = ${f.subline}, caption = ${f.caption},
      photo_path = ${f.photoPath}, updated_at = now()
    where id = ${postId} and plan_id = ${planId} and status in ('draft', 'approved', 'skipped')`;
}

export async function setPostStatus(planId: string, postId: string, status: "draft" | "approved" | "skipped") {
  await sql`update plan_posts set status = ${status}, updated_at = now() where id = ${postId} and plan_id = ${planId} and status in ('draft', 'approved', 'skipped')`;
}

export async function approveAllDrafts(planId: string): Promise<number> {
  const rows = await sql`update plan_posts set status = 'approved', updated_at = now() where plan_id = ${planId} and status = 'draft' and publish_at > now() returning id`;
  return rows.length;
}

export async function deletePost(planId: string, postId: string) {
  await sql`delete from plan_posts where id = ${postId} and plan_id = ${planId} and status <> 'posting'`;
}

export async function addBlankPost(planId: string, channel: PostChannel, publishAt: Date) {
  await sql`insert into plan_posts (plan_id, channel, publish_at, headline) values (${planId}, ${channel}, ${publishAt}, 'New post')`;
}

// ---------- Drafting with Claude ----------

const POSTS_MODEL = process.env.POSTS_MODEL || CLAUDE_MODEL;

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["social", "google"] },
          topic: { type: "string", description: "A few words on what the post is about, for the owner." },
          headline: { type: "string", description: "Big words on the image: 2 to 7 words." },
          subline: { type: "string", description: "Smaller line on the image: up to 14 words, or empty." },
          caption: { type: "string", description: "The post text." },
        },
        required: ["channel", "topic", "headline", "subline", "caption"],
        additionalProperties: false,
      },
    },
  },
  required: ["posts"],
  additionalProperties: false,
} as const;

const DRAFT_SYSTEM = `You write a month of social media posts for a small local business. The posts are published as the business itself ("we", "our shop"), on its Facebook Page, Instagram and Google Business Profile.

Rules:
- Use only facts given in the business details. Never invent prices, discounts, awards, years in business, reviews, quotes, customer names or guarantees. If a detail isn't given, write around it.
- Never mention AI, marketing agencies, or who wrote the posts.
- Plain, friendly, local and specific. Short sentences. Sound like the owner, not an ad agency.
- Mix the topics across the month: what the business does and why it matters, a helpful tip customers can use, what to expect when they visit, something about the team or the place, a reminder of a perk or policy that is in the details, and anything seasonal for the month (holidays, weather, deadlines) that fits the business.
- Don't repeat a topic or headline from the recent posts list.
- "social" posts (Facebook and Instagram): 40 to 110 words. At most one emoji. End with a simple call to action (visit, call, or the website), then a blank line and 3 to 6 relevant local hashtags.
- "google" posts (Google profile updates): 30 to 90 words. No hashtags, no emojis, no links and no phone numbers (Google rejects those). End with a short call to action like "Stop by" or "Walk-ins welcome" if true.
- The headline and subline go on the post's image, over a photo of the business. Keep them short and punchy. Don't end the headline with a period.
- Return exactly the number of posts asked for, for each channel, in the order given.`;

async function businessFacts(plan: PlanWithLead): Promise<string> {
  const out: string[] = [];
  out.push(`Business: ${plan.business_name || "(no name given)"}`);
  if (plan.trade) out.push(`Trade: ${plan.trade}`);
  if (plan.city) out.push(`City: ${plan.city}`);
  if (plan.website_url) out.push(`Website: ${plan.website_url}`);
  if (plan.phone) out.push(`Phone: ${plan.phone}`);
  const [lead] = await sql<{ details: Record<string, string> | null }[]>`select details from leads where id = ${plan.lead_id}`.catch(() => [{ details: null }]);
  for (const [k, v] of Object.entries(lead?.details ?? {})) if (v && !["facebook", "instagram", "yelp", "googleProfile", "otherLinks"].includes(k)) out.push(`${k}: ${v}`);
  const project = await getProjectForLead(plan.lead_id).catch(() => null);
  if (project) {
    const { items } = await getIntake(project.id);
    for (const item of items) {
      const base = item.key ? intakeDef(item.key) : undefined;
      const def = base ? withCities(base, site.cities) : undefined;
      const lines = def && item.fields && Object.keys(item.fields).length ? summarize(def, item.fields) : [];
      const text = lines.length ? lines.join("; ") : item.answer;
      if (text && !/password|login|account/i.test(item.label)) out.push(`${item.label}: ${text}`.slice(0, 800));
    }
  }
  return out.join("\n");
}

/**
 * Drafts the plan's posts for one month (Pacific time), skipping times already taken.
 * Returns how many were added.
 */
export async function draftMonth(planId: string, year: number, month: number): Promise<number> {
  const plan = await getPlan(planId);
  if (!plan) throw new Error("Plan not found.");
  const allowance = postAllowance(plan.slug);
  if (!allowance.social && !allowance.google) throw new Error(`${plan.name || "This plan"} doesn't include posts. Pick the plan type in Settings if that's wrong.`);
  const taken = await sql<{ publish_at: Date; channel: string }[]>`select publish_at, channel from plan_posts where plan_id = ${planId}`;
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  const pacificMonth = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" }).format(d);
  const inMonth = taken.filter((t) => pacificMonth(t.publish_at) === key);
  const need = {
    social: Math.max(0, allowance.social - inMonth.filter((t) => t.channel === "social").length),
    google: Math.max(0, allowance.google - inMonth.filter((t) => t.channel === "google").length),
  };
  const takenTimes = new Set(taken.map((t) => `${t.channel}:${t.publish_at.getTime()}`));
  const slots = monthSlots(year, month, { social: 31, google: 31 }).filter((s) => !takenTimes.has(`${s.channel}:${s.at.getTime()}`));
  const pick = [
    ...slots.filter((s) => s.channel === "social").slice(0, need.social),
    ...slots.filter((s) => s.channel === "google").slice(0, need.google),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  if (!pick.length) throw new Error(`${monthLabel(year, month)} already has all its posts.`);

  const recent = await sql<{ headline: string }[]>`select headline from plan_posts where plan_id = ${planId} order by publish_at desc limit 30`;
  const prompt = [
    `Business details:\n${await businessFacts(plan)}`,
    `Month: ${monthLabel(year, month)}`,
    `Write ${pick.length} posts, in this order:\n${pick.map((s, i) => `${i + 1}. ${s.channel} (${formatPostDate(s.at)})`).join("\n")}`,
    recent.length ? `Recent posts (don't repeat):\n${recent.map((r) => `- ${r.headline}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  const drafts = await askClaude(prompt, pick);
  const photos = await planPhotos(plan);
  for (const [i, s] of pick.entries()) {
    const d = drafts[i];
    if (!d) continue;
    const photo = photos.length ? photos[(inMonth.length + i) % photos.length].path : "";
    const caption = s.channel === "google" ? googleText(d.caption) : d.caption.trim();
    await sql`
      insert into plan_posts (plan_id, channel, publish_at, headline, subline, caption, photo_path)
      values (${planId}, ${s.channel}, ${s.at}, ${d.headline.trim().slice(0, 80)}, ${d.subline.trim().slice(0, 140)}, ${caption.slice(0, 2200)}, ${photo})`;
  }
  return Math.min(drafts.length, pick.length);
}

type Draft = { channel: string; topic: string; headline: string; subline: string; caption: string };

async function askClaude(prompt: string, pick: { channel: PostChannel }[]): Promise<Draft[]> {
  if (process.env.AI_CHECK_FAKE === "1") {
    return pick.map((s, i) => ({ channel: s.channel, topic: "Sample", headline: `Sample post ${i + 1}`, subline: "A short line under it", caption: s.channel === "google" ? "Sample Google update. Walk-ins welcome." : "Sample post for Facebook and Instagram.\n\n#SanDiego" }));
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set in Vercel, so posts can't be drafted.");
  const response = await anthropic().beta.messages.create({
    model: POSTS_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: DRAFT_SCHEMA as unknown as Record<string, unknown> } },
    system: DRAFT_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to write these posts. Try again or write them by hand.");
  const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  try {
    const parsed = JSON.parse(text) as { posts: Draft[] };
    return Array.isArray(parsed.posts) ? parsed.posts : [];
  } catch {
    throw new Error("Claude's answer wasn't in the expected format. Try again.");
  }
}

// ---------- Publishing ----------

export function postImageUrl(post: { id: string; updated_at: Date }, google = false): string {
  return `${site.url}/plan-image/${post.id}${google ? ".google" : ""}.jpg?v=${post.updated_at.getTime()}`;
}

export const metaClientReady = () => Boolean(process.env.META_CLIENT_TOKEN);

function graphBase(): string {
  return `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v24.0"}`;
}

type GraphResult = { id?: string; post_id?: string; status_code?: string; access_token?: string; name?: string; username?: string; error?: { message?: string } };

async function graph(path: string, params: Record<string, string>, token: string, method: "GET" | "POST" = "POST"): Promise<GraphResult> {
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === "GET" ? `${graphBase()}/${path}?${body}` : `${graphBase()}/${path}`;
  const res = await fetch(url, method === "GET" ? { cache: "no-store" } : { method, body, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as GraphResult;
  if (!res.ok || data.error) throw new Error(data.error?.message || `Meta returned ${res.status}`);
  return data;
}

/** The Page's own token, from the system-user token the Page was shared with. */
async function pageToken(pageId: string): Promise<string> {
  const data = await graph(pageId, { fields: "access_token" }, process.env.META_CLIENT_TOKEN ?? "", "GET");
  if (!data.access_token) throw new Error("Meta didn't give a Page token. Make sure the Page is shared with the Claude system user (Business settings > System users > Assign assets).");
  return data.access_token;
}

/** Checks a plan's Facebook and Instagram connection without posting. */
export async function checkPlanConnection(plan: ClientPlan): Promise<string[]> {
  if (!metaClientReady()) return ["META_CLIENT_TOKEN isn't set in Vercel yet, so posts are emailed to you to paste instead."];
  const out: string[] = [];
  if (!plan.facebook_page_id) return ["Add the Facebook Page ID first."];
  try {
    const token = await pageToken(plan.facebook_page_id);
    const page = await graph(plan.facebook_page_id, { fields: "name" }, token, "GET");
    out.push(`Facebook: connected to ${page.name}`);
    if (plan.instagram_user_id) {
      const ig = await graph(plan.instagram_user_id, { fields: "username" }, token, "GET");
      out.push(`Instagram: connected to @${ig.username}`);
    } else out.push("Instagram: add the Instagram account ID to post there.");
  } catch (e) {
    out.push(`Not connected: ${e instanceof Error ? e.message : String(e)}`);
  }
  return out;
}

async function waitForContainer(id: string, token: string) {
  for (let i = 0; i < 10; i++) {
    const s = await graph(id, { fields: "status_code" }, token, "GET");
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram could not process the image (${s.status_code}).`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Instagram is still processing the image. It will try again next hour.");
}

async function publishFacebook(plan: ClientPlan, post: PlanPost): Promise<string> {
  const token = await pageToken(plan.facebook_page_id);
  const data = await graph(`${plan.facebook_page_id}/photos`, { url: postImageUrl(post), message: post.caption, published: "true" }, token);
  return data.post_id || data.id || "";
}

async function publishInstagram(plan: ClientPlan, post: PlanPost): Promise<string> {
  const token = await pageToken(plan.facebook_page_id);
  const c = await graph(`${plan.instagram_user_id}/media`, { image_url: postImageUrl(post), caption: post.caption.slice(0, 2200) }, token);
  if (!c.id) throw new Error("Instagram did not accept the image.");
  await waitForContainer(c.id, token);
  const done = await graph(`${plan.instagram_user_id}/media_publish`, { creation_id: c.id }, token);
  return done.id || "";
}

/** Which networks a post goes to, and whether we can post there automatically. */
export function networksFor(plan: ClientPlan, post: { channel: PostChannel }): { network: Network; auto: boolean }[] {
  if (post.channel === "google") return [{ network: "google", auto: false }];
  const meta = metaClientReady() && Boolean(plan.facebook_page_id);
  return [
    { network: "facebook", auto: meta },
    { network: "instagram", auto: meta && Boolean(plan.instagram_user_id) },
  ];
}

/** Claims an approved post so two cron runs never publish it twice. Also frees posts stuck in "posting". */
async function claim(postId: string, force: boolean): Promise<PlanPost | null> {
  const [row] = force
    ? await sql<PlanPost[]>`update plan_posts set status = 'posting', updated_at = now() where id = ${postId} and status in ('approved', 'draft') returning *`
    : await sql<PlanPost[]>`
        update plan_posts set status = 'posting', updated_at = now()
        where id = ${postId} and (status = 'approved' or (status = 'posting' and updated_at < now() - interval '20 minutes'))
        returning *`;
  return row ?? null;
}

export type PlanOutcome = { postId: string; business: string; network: Network; status: NetworkResult["status"]; error?: string; final?: boolean };

async function publishPost(plan: PlanWithLead, post: PlanPost): Promise<PlanOutcome[]> {
  const outcomes: PlanOutcome[] = [];
  const results = { ...post.results };
  const manual: Network[] = [];
  for (const { network, auto } of networksFor(plan, post)) {
    const prev = results[network];
    if (prev?.status === "posted" || prev?.status === "reminded") continue;
    if (!auto) {
      manual.push(network);
      continue;
    }
    if (prev && prev.attempts >= MAX_ATTEMPTS) continue;
    const attempts = (prev?.attempts ?? 0) + 1;
    try {
      const remoteId = network === "facebook" ? await publishFacebook(plan, post) : await publishInstagram(plan, post);
      results[network] = { status: "posted", attempts, at: new Date().toISOString(), remoteId };
      outcomes.push({ postId: post.id, business: leadName(plan), network, status: "posted" });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results[network] = { status: "failed", attempts, at: new Date().toISOString(), error };
      outcomes.push({ postId: post.id, business: leadName(plan), network, status: "failed", error, final: attempts >= MAX_ATTEMPTS });
    }
  }
  if (manual.length) {
    await remindOwner(plan, post, manual);
    for (const network of manual) {
      results[network] = { status: "reminded", attempts: 1, at: new Date().toISOString() };
      outcomes.push({ postId: post.id, business: leadName(plan), network, status: "reminded" });
    }
  }
  const pending = Object.values(results).some((r) => r?.status === "failed" && r.attempts < MAX_ATTEMPTS);
  await sql`
    update plan_posts set results = ${sql.json(results as never)}, status = ${pending ? "approved" : "done"},
      reminded_at = ${manual.length ? new Date() : post.reminded_at}, updated_at = now()
    where id = ${post.id}`;
  return outcomes;
}

const networkName: Record<Network, string> = { facebook: "Facebook", instagram: "Instagram", google: "Google profile" };

async function remindOwner(plan: PlanWithLead, post: PlanPost, networks: Network[]) {
  const where = networks.map((n) => networkName[n]).join(" and ");
  const google = networks.includes("google");
  await sendEmail({
    to: owner(),
    leadId: plan.lead_id,
    template: "owner_client_post",
    subject: `${leadName(plan)}: today's post is ready to paste (${where})`,
    paragraphs: [
      `Today's ${where} post for ${leadName(plan)} is ready. It takes about a minute to post by hand:`,
      `1. Save this image: ${postImageUrl(post, google)}`,
      google ? `2. Open ${leadName(plan)}'s Google profile while signed in as a manager, tap "Add update", and add the image.` : `2. Open their ${where} and start a new post with the image.`,
      "3. Paste this text:",
      ...post.caption.split("\n\n"),
      `Or copy it from the dashboard: ${site.url}/admin/plans/${plan.id}#${post.id}`,
    ],
  });
}

/** Run by the hourly cron: publishes every due client post. */
export async function publishDuePlanPosts(now: Date = new Date()): Promise<PlanOutcome[]> {
  if (!(await plansReady()) || process.env.SOCIAL_PAUSED === "1") return [];
  const due = await sql<PlanPost[]>`
    select pp.* from plan_posts pp
    where (pp.status = 'approved' or (pp.status = 'posting' and pp.updated_at < now() - interval '20 minutes'))
      and pp.publish_at <= ${now} and pp.publish_at > ${new Date(now.getTime() - 36 * 3600 * 1000)}
    order by pp.publish_at limit 20`;
  const outcomes: PlanOutcome[] = [];
  for (const candidate of due) {
    const plan = await getPlan(candidate.plan_id);
    if (!plan || !canPost(plan)) continue;
    if (candidate.status === "approved" && !isDue(candidate, now)) continue;
    const post = await claim(candidate.id, false);
    if (!post) continue;
    outcomes.push(...(await publishPost(plan, post)));
  }
  const failed = outcomes.filter((o) => o.status === "failed" && o.final);
  if (failed.length) {
    await sendEmail({
      to: owner(),
      template: "owner_social_failed",
      subject: "A client post didn't go out",
      paragraphs: [
        `These posts couldn't be published after ${MAX_ATTEMPTS} tries, one hour apart. You can post them by hand from the plan page.`,
        ...failed.map((f) => `${f.business}, ${networkName[f.network]}: ${f.error}`),
      ],
    });
  }
  return outcomes;
}

/** "Post now" from the plan page. */
export async function publishPostNow(planId: string, postId: string): Promise<PlanOutcome[]> {
  const plan = await getPlan(planId);
  if (!plan) throw new Error("Plan not found.");
  const post = await claim(postId, true);
  if (!post || post.plan_id !== planId) throw new Error("That post is already posted or being posted.");
  return publishPost(plan, post);
}

export { statusLabel };
