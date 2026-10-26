import type { MapsCompetitor } from "@/lib/audit/checks";
import { Icon } from "./Icon";

/** The top 3 businesses on Google Maps for the lead's search, with their ratings and review counts. */
export function MapsCompetitors({ competitors, search }: { competitors: MapsCompetitor[]; search: string }) {
  if (competitors.length === 0) return null;
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <h3 className="font-display text-xl font-bold text-navy">Who shows up first on Google Maps</h3>
      <p className="text-sm text-muted">The top results when customers search for {search}.</p>
      <ol className="mt-3 space-y-2">
        {competitors.map((c, i) => (
          <li key={c.name} className="flex items-center gap-3 border-t border-line pt-2 text-sm">
            <span className="w-5 shrink-0 font-display text-lg font-bold text-orange">{i + 1}</span>
            <span className="min-w-0 flex-1 font-medium text-ink">
              {c.mapsUrl ? (
                <a href={c.mapsUrl} target="_blank" rel="noopener" className="underline-offset-4 hover:underline">
                  {c.name}
                </a>
              ) : (
                c.name
              )}
            </span>
            {c.rating !== undefined && (
              <span className="flex shrink-0 items-center gap-1 font-semibold text-navy">
                <Icon name="star" className="h-4 w-4 text-orange" />
                {c.rating.toFixed(1)}
              </span>
            )}
            <span className="w-24 shrink-0 text-right text-muted">{c.reviews ?? 0} reviews</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
