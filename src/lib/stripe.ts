import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Offering } from "./offerings";
import { dollars, type CheckoutTerms } from "./checkout-terms";
import { site } from "./site";

export { checkoutTerms, depositCents, dollars, type CheckoutTerms } from "./checkout-terms";

// Stripe payments through Stripe's hosted checkout. No Stripe package: a few form-encoded calls to the REST API.
// Turned on by STRIPE_SECRET_KEY (a restricted key is enough, see README) and STRIPE_WEBHOOK_SECRET in Vercel.

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

type Params = Record<string, string | number | boolean | undefined>;

function form(params: Params): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") body.append(k, String(v));
  return body.toString();
}

async function stripe<T>(path: string, params: Params): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not connected.");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form(params),
    cache: "no-store",
    // Never leave a button spinning: give up after 20 seconds.
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe error ${res.status}`);
  return json;
}

/** One line item with its price made on the spot, so nothing has to be set up in Stripe first. */
function lineItem(prefix: string, name: string, cents: number, monthly: boolean, description?: string): Params {
  return {
    [`${prefix}[quantity]`]: 1,
    [`${prefix}[price_data][currency]`]: "usd",
    [`${prefix}[price_data][unit_amount]`]: cents,
    [`${prefix}[price_data][product_data][name]`]: name,
    [`${prefix}[price_data][product_data][description]`]: description,
    [`${prefix}[price_data][recurring][interval]`]: monthly ? "month" : undefined,
  };
}

const meta = (m: Record<string, string>): Params => Object.fromEntries(Object.entries(m).map(([k, v]) => [`metadata[${k}]`, v]));

/** A hosted checkout page for a public "Buy now" / "Pay deposit" button. Returns its address. */
export async function createCheckout(o: Offering, terms: CheckoutTerms): Promise<string> {
  const name = terms.kind === "deposit" ? `${o.name}: 50% deposit` : o.name;
  const description =
    terms.kind === "deposit"
      ? `First half of ${dollars(o.price_cents)}. The second half is due before your new site goes live, after you approve it.`
      : o.tagline || undefined;
  const session = await stripe<{ url: string }>("checkout/sessions", {
    mode: "payment",
    ...lineItem("line_items[0]", name, terms.cents, false, description),
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    "phone_number_collection[enabled]": true,
    customer_creation: "always",
    "custom_fields[0][key]": "business",
    "custom_fields[0][label][type]": "custom",
    "custom_fields[0][label][custom]": "Business name",
    "custom_fields[0][type]": "text",
    "payment_intent_data[description]": name,
    success_url: `${site.url}/thank-you?paid=${encodeURIComponent(o.slug)}`,
    cancel_url: `${site.url}/services#${o.slug}`,
    ...meta({ slug: o.slug, item: name, payment: terms.kind }),
  });
  return session.url;
}

export type PaymentLinkInput = {
  leadId: string;
  name: string;
  cents: number;
  monthly: boolean;
  /** "final", "plan", "addon" or "custom": shown in the dashboard when it's paid. */
  payment: string;
  slug?: string;
};

/** A reusable payment link for one lead (final payment, a monthly plan, an add-on or a custom amount). */
export async function createPaymentLink(p: PaymentLinkInput): Promise<string> {
  const price = await stripe<{ id: string }>("prices", {
    currency: "usd",
    unit_amount: p.cents,
    "product_data[name]": p.name,
    "recurring[interval]": p.monthly ? "month" : undefined,
  });
  const data = { lead_id: p.leadId, slug: p.slug ?? "", item: p.name, payment: p.payment };
  const link = await stripe<{ url: string }>("payment_links", {
    "line_items[0][price]": price.id,
    "line_items[0][quantity]": 1,
    allow_promotion_codes: true,
    "phone_number_collection[enabled]": true,
    "after_completion[type]": "redirect",
    "after_completion[redirect][url]": `${site.url}/thank-you?paid=${encodeURIComponent(p.slug || p.payment)}`,
    ...meta(data),
    // Payment links copy their metadata to each checkout; subscriptions get it too, for later invoices.
    ...(p.monthly ? Object.fromEntries(Object.entries(data).map(([k, v]) => [`subscription_data[metadata][${k}]`, v])) : {}),
  });
  return link.url;
}

/**
 * Checks a webhook's Stripe-Signature header (see Stripe's "verify signatures manually" guide).
 * Rejects anything older than 5 minutes.
 */
export function verifyWebhook(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || sigs.length === 0 || Math.abs(now / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** The parts of a completed checkout we use. */
export type CompletedCheckout = {
  id: string;
  amount_total: number | null;
  mode: "payment" | "subscription" | "setup";
  payment_status: string;
  metadata: Record<string, string> | null;
  customer_details: { email: string | null; name: string | null; phone: string | null } | null;
  custom_fields?: { key: string; text?: { value: string | null } | null }[];
  total_details?: { amount_discount?: number } | null;
};
