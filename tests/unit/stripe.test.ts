import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { checkoutTerms, depositCents, dollars } = await import("@/lib/checkout-terms");
const { verifyWebhook } = await import("@/lib/stripe");

describe("checkout terms", () => {
  it("charges GEO Setup in full and websites a rounded 50% deposit", () => {
    expect(checkoutTerms({ slug: "ai-search-setup", kind: "package", price_cents: 69700 })).toEqual({ kind: "full", cents: 69700, label: "Buy Now" });
    expect(checkoutTerms({ slug: "business-website-launch", kind: "package", price_cents: 149700 })).toEqual({ kind: "deposit", cents: 74900, label: "Pay $749 Deposit" });
    expect(depositCents(299700)).toBe(149900);
    expect(dollars(74800)).toBe("$748");
  });
  it("leaves plans and add-ons to payment links", () => {
    expect(checkoutTerms({ slug: "growth-plan", kind: "plan", price_cents: 19900 })).toBeNull();
    expect(checkoutTerms({ slug: "logo-creation", kind: "addon", price_cents: 39700 })).toBeNull();
  });
});

describe("Stripe webhook signature", () => {
  const secret = "whsec_test";
  const body = '{"id":"evt_1"}';
  const now = 1_800_000_000_000;
  const sign = (t: number, payload = body) => createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  it("accepts a fresh, correctly signed event", () => {
    const t = now / 1000;
    expect(verifyWebhook(body, `t=${t},v1=${sign(t)}`, secret, now)).toBe(true);
  });
  it("rejects tampered, old or unsigned events", () => {
    const t = now / 1000;
    expect(verifyWebhook('{"id":"evt_2"}', `t=${t},v1=${sign(t)}`, secret, now)).toBe(false);
    expect(verifyWebhook(body, `t=${t - 600},v1=${sign(t - 600)}`, secret, now)).toBe(false);
    expect(verifyWebhook(body, null, secret, now)).toBe(false);
  });
});
