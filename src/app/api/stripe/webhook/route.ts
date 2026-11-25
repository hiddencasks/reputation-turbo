import { recordCheckout } from "@/lib/payments";
import { verifyWebhook, type CompletedCheckout } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Stripe calls this when a checkout is paid (Stripe Dashboard > Developers > Webhooks,
// event "checkout.session.completed"). The signing secret goes in STRIPE_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  const payload = await request.text();
  if (!verifyWebhook(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("Bad signature", { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data: { object: CompletedCheckout } };
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await recordCheckout(event.data.object);
  }
  return Response.json({ received: true });
}
