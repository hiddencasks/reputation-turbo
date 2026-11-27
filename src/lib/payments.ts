import "server-only";
import { sql } from "./db";
import { sendEmail } from "./email";
import { upsertLead, type Lead } from "./leads";
import { site } from "./site";
import { dollars, type CompletedCheckout } from "./stripe";
import { ensurePlanFromCheckout } from "./plans";

export type Payment = {
  id: string;
  stripe_id: string;
  lead_id: string | null;
  item: string;
  slug: string;
  payment: string;
  amount_cents: number;
  monthly: boolean;
  email: string;
  created_at: Date;
};

export async function paymentsForLead(leadId: string): Promise<Payment[]> {
  try {
    return await sql<Payment[]>`select * from payments where lead_id = ${leadId} order by created_at desc`;
  } catch {
    return []; // db/updates/2026-11-stripe-payments.sql not run yet
  }
}

const paymentWord: Record<string, string> = {
  deposit: "50% deposit",
  full: "paid in full",
  final: "final payment",
  plan: "monthly plan, first month",
  addon: "add-on",
  custom: "payment",
};

/**
 * Records a completed Stripe checkout once (Stripe can send the same event more than once):
 * finds or creates the lead, notes the payment, moves one-time project payments to Won,
 * and emails the owner. Returns false when it was already recorded.
 */
export async function recordCheckout(s: CompletedCheckout): Promise<boolean> {
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return false;
  const m = s.metadata ?? {};
  const email = s.customer_details?.email?.trim() ?? "";
  const amount = s.amount_total ?? 0;
  const monthly = s.mode === "subscription";
  const item = m.item || "Online payment";
  const kind = m.payment || (monthly ? "plan" : "custom");

  const [row] = await sql<{ id: string }[]>`
    insert into payments (stripe_id, item, slug, payment, amount_cents, monthly, email)
    values (${s.id}, ${item}, ${m.slug ?? ""}, ${kind}, ${amount}, ${monthly}, ${email})
    on conflict (stripe_id) do nothing
    returning id`;
  if (!row) return false;

  const discount = s.total_details?.amount_discount ? ` (after a ${dollars(s.total_details.amount_discount)} discount code)` : "";
  const word = paymentWord[kind] ?? kind;
  const note = `Paid ${dollars(amount)}${monthly ? "/month" : ""} online for ${item}${item.toLowerCase().includes(word.split(" ").pop() ?? word) ? "" : ` (${word})`}${discount}.`;

  let lead: Lead | undefined;
  if (m.lead_id) {
    [lead] = await sql<Lead[]>`select * from leads where id = ${m.lead_id}`;
    if (lead) await sql`insert into activities (lead_id, kind, body, meta) values (${lead.id}, 'payment', ${note}, ${sql.json({ stripe: s.id } as never)})`;
  }
  if (!lead) {
    const [first = "", ...rest] = (s.customer_details?.name ?? "").trim().split(/\s+/);
    const business = s.custom_fields?.find((f) => f.key === "business")?.text?.value?.trim() ?? "";
    ({ lead } = await upsertLead({
      firstName: first,
      lastName: rest.join(" "),
      businessName: business,
      email,
      phone: s.customer_details?.phone ?? "",
      source: "stripe",
      stage: "won",
      note,
      meta: { stripe: s.id },
    }));
  }

  await sql`update payments set lead_id = ${lead.id} where id = ${row.id}`;
  // A one-time project paid for means the deal is won (plans and add-ons can be paid by existing clients too).
  if (["deposit", "full"].includes(kind) && lead.stage !== "won") {
    await sql`update leads set stage = 'won', updated_at = now() where id = ${lead.id}`;
    await sql`insert into activities (lead_id, kind, body) values (${lead.id}, 'stage_change', ${"Moved to Won after an online payment."})`;
  }

  // Any monthly plan gets its own plan page (posts, billing status) right away.
  let planId: string | null = null;
  if (monthly) {
    const id = (v: CompletedCheckout["subscription"]) => (typeof v === "string" ? v : v?.id ?? "");
    const [offering] = m.slug ? await sql<{ name: string }[]>`select name from offerings where slug = ${m.slug}`.catch(() => []) : [];
    planId = await ensurePlanFromCheckout({
      leadId: lead.id,
      slug: m.slug ?? "",
      name: offering?.name || item,
      amountCents: amount,
      subscriptionId: id(s.subscription),
      customerId: id(s.customer),
    }).catch((err) => {
      console.error("[plans] could not start the plan:", err);
      return null;
    });
  }

  await sendEmail({
    to: process.env.OWNER_EMAIL ?? site.email,
    leadId: lead.id,
    template: "owner_payment",
    subject: `Payment received: ${dollars(amount)} from ${lead.business_name || `${lead.first_name} ${lead.last_name}`.trim() || email}`,
    replyTo: email || undefined,
    paragraphs: [
      note,
      [`Name: ${`${lead.first_name} ${lead.last_name}`.trim() || "(not given)"}`, `Business: ${lead.business_name || "(not given)"}`, `Email: ${email}`, `Phone: ${lead.phone || "(not given)"}`].join("\n"),
      ["deposit", "full"].includes(kind) ? "Next step: open the lead and start their client project so the welcome email and checklist go out." : "",
      planId ? `Their monthly plan page is ready, where you draft and approve their posts: ${site.url}/admin/plans/${planId}` : "",
      `Open in dashboard: ${site.url}/admin/leads/${lead.id}`,
    ].filter(Boolean),
  });
  return true;
}
