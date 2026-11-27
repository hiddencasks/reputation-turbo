import { recordCheckout } from "@/lib/payments";
import { applyInvoice, applySubscription, type StripeInvoice, type StripeSubscription } from "@/lib/plans";
import { verifyWebhook, type CompletedCheckout } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Stripe calls this when something happens to a payment (Stripe Dashboard > Developers > Webhooks).
// Events to send here:
//   checkout.session.completed, checkout.session.async_payment_succeeded  (a checkout was paid)
//   customer.subscription.updated, customer.subscription.deleted         (a monthly plan changed or was canceled)
//   invoice.paid, invoice.payment_failed                                 (a monthly charge went through or failed)
// The signing secret goes in STRIPE_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  const payload = await request.text();
  if (!verifyWebhook(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("Bad signature", { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data: { object: unknown } };
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await recordCheckout(event.data.object as CompletedCheckout);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object as StripeSubscription, event.type === "customer.subscription.deleted");
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      await applyInvoice(event.data.object as StripeInvoice, event.type === "invoice.paid");
      break;
  }
  return Response.json({ received: true });
}
