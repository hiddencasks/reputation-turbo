import type { Offering } from "@/lib/offerings";
import { formatPrice } from "./ui";

export function priceText(o: Offering, showPrices: boolean): string | null {
  if (!showPrices) return null;
  const base = formatPrice(o.price_cents);
  if (!o.price_suffix) return o.kind === "package" ? `Starting at ${base}` : base;
  return o.price_suffix.startsWith("/") ? `${base}${o.price_suffix}` : `${base} ${o.price_suffix}`;
}

export function OfferingCard({ o, showPrices, featured = false }: { o: Offering; showPrices: boolean; featured?: boolean }) {
  const price = priceText(o, showPrices);
  return (
    <div className={`flex flex-col rounded-lg border p-6 ${featured ? "border-orange ring-2 ring-orange" : "border-line"}`}>
      <h3 className="font-display text-2xl font-bold text-navy">{o.name}</h3>
      {o.tagline && <p className="text-sm font-semibold uppercase tracking-wide text-orange">{o.tagline}</p>}
      {price && <p className="mt-3 font-display text-3xl font-extrabold text-ink">{price}</p>}
      {o.description && <p className="mt-3 text-muted">{o.description}</p>}
      {o.deliverables.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {o.deliverables.map((d) => (
            <li key={d} className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 -skew-x-[20deg] bg-orange" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
      {o.revision_rounds != null && <p className="mt-4 text-sm text-muted">Includes {o.revision_rounds} revision rounds.</p>}
    </div>
  );
}
