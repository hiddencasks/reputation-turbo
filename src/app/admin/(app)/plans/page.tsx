import Link from "next/link";
import { listPlans, plansReady } from "@/lib/plans";
import { statusLabel } from "@/lib/plan-schedule";
import { dollars } from "@/lib/stripe";

const tone: Record<string, string> = {
  active: "bg-green-100 text-green-900",
  manual: "bg-green-100 text-green-900",
  past_due: "bg-red-100 text-red-900",
  canceled: "bg-navy-50 text-muted",
};

export default async function PlansPage() {
  const ready = await plansReady();
  const plans = ready ? await listPlans() : [];
  const paying = plans.filter((p) => p.status === "active" || p.status === "manual");
  const mrr = paying.reduce((sum, p) => sum + p.amount_cents, 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Monthly plans</h1>
        <p className="text-muted">Every client on a monthly plan. A plan appears here by itself when someone pays for one through Stripe, and Stripe keeps its status up to date. To add one paid another way, use the lead&apos;s page.</p>
      </div>
      {!ready ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          One-time setup needed: run <code>db/updates/2026-11-client-plans.sql</code> in the Supabase SQL editor, then reload this page.
        </p>
      ) : plans.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm text-muted shadow-sm">No monthly plans yet. Send a plan payment link from a lead&apos;s page, or start one by hand there.</p>
      ) : (
        <>
          <p className="text-sm">{paying.length} paying · <strong>{dollars(mrr)}/month</strong></p>
          <ul className="grid gap-4 md:grid-cols-2">
            {plans.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/plans/${p.id}`} className="block rounded-lg bg-white p-5 shadow-sm ring-1 ring-transparent hover:ring-orange">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-xl font-bold text-navy">{p.business_name || `${p.first_name} ${p.last_name}`}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone[p.status]}`}>{statusLabel[p.status]}</span>
                  </div>
                  <p className="text-sm text-muted">{p.name || "Monthly plan"} · {dollars(p.amount_cents)}/month{p.paused ? " · posting paused" : ""}</p>
                  <p className="mt-2 text-sm">
                    {p.drafts ? <strong className="text-amber-800">{p.drafts} draft{p.drafts === 1 ? "" : "s"} to review · </strong> : null}
                    {p.upcoming} post{p.upcoming === 1 ? "" : "s"} scheduled
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
