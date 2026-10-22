import { getOfferings, getShowPrices, type Offering } from "@/lib/offerings";
import { formatPrice } from "@/components/ui";
import { createOffering, saveOffering, setShowPrices } from "../../actions";

const kinds = [
  { id: "package", label: "Packages" },
  { id: "plan", label: "Monthly plans" },
  { id: "addon", label: "Add-ons" },
] as const;

const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";

function hourly(o: Offering): string | null {
  const lo = o.est_hours_low ? Number(o.est_hours_low) : null;
  const hi = o.est_hours_high ? Number(o.est_hours_high) : null;
  if (!lo || !hi || !o.price_cents) return null;
  const dollars = o.price_cents / 100;
  return `${formatPrice(Math.round((dollars / hi) * 100))} to ${formatPrice(Math.round((dollars / lo) * 100))} per hour`;
}

function OfferingFields({ o }: { o?: Offering }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Name<input name="name" required defaultValue={o?.name} className={input} /></label>
      <label className="text-sm font-semibold">Type
        <select name="kind" defaultValue={o?.kind ?? "addon"} className={input}>
          {kinds.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Price ($)<input name="price" required inputMode="decimal" defaultValue={o ? String(o.price_cents / 100) : ""} className={input} /></label>
      <label className="text-sm font-semibold">Price note<input name="priceSuffix" placeholder="/month, setup, each" defaultValue={o?.price_suffix} className={input} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Tagline<input name="tagline" defaultValue={o?.tagline} className={input} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={o?.description} className={input} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Deliverables (one per line)<textarea name="deliverables" rows={5} defaultValue={o?.deliverables.join("\n")} className={input} /></label>
      <label className="text-sm font-semibold">Revision rounds<input name="revisionRounds" inputMode="numeric" defaultValue={o?.revision_rounds ?? ""} className={input} /></label>
      <label className="text-sm font-semibold">Display order<input name="sort" inputMode="numeric" required defaultValue={o?.sort ?? 100} className={input} /></label>
      <label className="text-sm font-semibold">Your hours (low)<input name="hoursLow" inputMode="decimal" defaultValue={o?.est_hours_low ?? ""} className={input} /></label>
      <label className="text-sm font-semibold">Your hours (high)<input name="hoursHigh" inputMode="decimal" defaultValue={o?.est_hours_high ?? ""} className={input} /></label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={o?.active ?? true} /> Offered (shown on website)</label>
    </div>
  );
}

export default async function PricingPage() {
  const [offerings, showPrices] = await Promise.all([getOfferings(), getShowPrices()]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-navy">Pricing</h1>

      <section className={`rounded-lg p-5 shadow-sm ${showPrices ? "bg-white" : "border-2 border-orange bg-white"}`}>
        <h2 className="font-display text-xl font-bold text-navy">Prices on the website: {showPrices ? "shown" : "hidden"}</h2>
        <p className="mt-1 text-sm text-muted">
          {showPrices
            ? "Visitors see prices on Services & Pricing and the One-Sheet."
            : "Visitors see services and are asked to request a free audit or quote. Turn this on once you approve final prices."}
        </p>
        <form action={setShowPrices} className="mt-3">
          <input type="hidden" name="show" value={showPrices ? "false" : "true"} />
          <button className="rounded-md bg-navy px-4 py-2 font-semibold text-white">{showPrices ? "Hide prices" : "Show prices on website"}</button>
        </form>
      </section>

      {kinds.map((k) => (
        <section key={k.id} className="space-y-3">
          <h2 className="font-display text-2xl font-bold text-navy">{k.label}</h2>
          {offerings.filter((o) => o.kind === k.id).map((o) => (
            <details key={o.id} className="rounded-lg bg-white shadow-sm">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                <span className="font-semibold text-navy">
                  {o.name} {!o.active && <span className="ml-2 rounded bg-navy-50 px-2 py-0.5 text-xs text-muted">Not offered</span>}
                </span>
                <span className="text-sm">
                  <strong>{formatPrice(o.price_cents)}</strong>{o.price_suffix && ` ${o.price_suffix}`}
                  {hourly(o) && <span className="ml-3 text-muted">≈ {hourly(o)}</span>}
                </span>
              </summary>
              <form action={saveOffering.bind(null, o.id)} className="space-y-3 border-t border-line p-4">
                <OfferingFields o={o} />
                <button className="rounded-md bg-orange px-4 py-2 font-semibold text-white">Save changes</button>
              </form>
            </details>
          ))}
        </section>
      ))}

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Add a new service</h2>
        <form action={createOffering} className="mt-3 space-y-3">
          <OfferingFields />
          <button className="rounded-md bg-navy px-4 py-2 font-semibold text-white">Add</button>
        </form>
      </section>
    </div>
  );
}
