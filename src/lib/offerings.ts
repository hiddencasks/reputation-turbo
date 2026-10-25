import "server-only";
import { sql } from "./db";

export type Offering = {
  id: string;
  slug: string;
  kind: "package" | "addon" | "plan";
  name: string;
  tagline: string;
  price_cents: number;
  price_suffix: string;
  description: string;
  deliverables: string[];
  revision_rounds: number | null;
  est_hours_low: string | null;
  est_hours_high: string | null;
  sort: number;
  active: boolean;
};

/** AI search (GEO) offerings, shown in their own section for businesses that already have a website. */
export const geoSlugs = ["ai-search-setup", "ai-visibility-plan"];
export const isGeo = (o: Offering) => geoSlugs.includes(o.slug);

// Names changed in October 2026 (db/updates/2026-10-site-refresh.sql). Until that update runs, show the new names
// for rows that still have the old ones, so the site reads the same either way.
const renamed: Record<string, [from: string, to: string]> = {
  "ai-search-setup": ["AI Search Visibility (GEO)", "GEO Setup"],
  "ai-visibility-plan": ["AI Visibility", "AI Visibility Monitoring"],
};

function withCurrentName(o: Offering): Offering {
  const r = renamed[o.slug];
  return r && o.name === r[0] ? { ...o, name: r[1] } : o;
}

export async function getOfferings(opts: { activeOnly?: boolean } = {}): Promise<Offering[]> {
  const rows = opts.activeOnly
    ? await sql<Offering[]>`select * from offerings where active order by kind, sort, name`
    : await sql<Offering[]>`select * from offerings order by kind, sort, name`;
  return rows.map(withCurrentName);
}

export async function getShowPrices(): Promise<boolean> {
  const [row] = await sql<{ value: boolean }[]>`select value from settings where key = 'show_prices'`;
  return row?.value === true;
}
