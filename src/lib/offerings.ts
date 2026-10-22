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

export async function getOfferings(opts: { activeOnly?: boolean } = {}): Promise<Offering[]> {
  return opts.activeOnly
    ? sql<Offering[]>`select * from offerings where active order by kind, sort, name`
    : sql<Offering[]>`select * from offerings order by kind, sort, name`;
}

export async function getShowPrices(): Promise<boolean> {
  const [row] = await sql<{ value: boolean }[]>`select value from settings where key = 'show_prices'`;
  return row?.value === true;
}
