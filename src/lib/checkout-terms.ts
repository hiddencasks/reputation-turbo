// What the public "Buy now" / "Pay deposit" buttons charge. Pure, so pages and tests can use it.
import type { Offering } from "./offerings";

/** What a "buy" button charges for an offering on the public site, or null when it can't be bought online. */
export type CheckoutTerms = { kind: "full" | "deposit"; cents: number; label: string };

/** GEO Setup is paid in full; website packages take a 50% deposit (rounded to the dollar); plans and add-ons are arranged with us. */
export function checkoutTerms(o: Pick<Offering, "slug" | "kind" | "price_cents">): CheckoutTerms | null {
  if (o.kind !== "package" || o.price_cents <= 0) return null;
  if (o.slug === "ai-search-setup") return { kind: "full", cents: o.price_cents, label: "Buy Now" };
  const cents = depositCents(o.price_cents);
  return { kind: "deposit", cents, label: `Pay ${dollars(cents)} Deposit` };
}

export const depositCents = (priceCents: number) => Math.round(priceCents / 200) * 100;

export const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;

