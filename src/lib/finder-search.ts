import "server-only";
import { sql } from "./db";
import { placeName, tradePhrase } from "./ai-visibility/questions";
import { rankProspects, type FoundBusiness, type ScoredBusiness } from "./finder";

/**
 * Each search is one Google Places Text Search call that asks for ratings,
 * reviews, website, phone and hours (Google's "Enterprise" fields). Google gives
 * 1,000 of these calls free each month, shared with the free audit's lookups,
 * then charges about $0.035 per call. The monthly limit below keeps a runaway
 * month well under the $5 budget alert.
 */
export const SEARCH_COST = "about 3.5¢ (free within Google's 1,000 lookups a month)";

export function monthlyLimit(): number {
  const n = Number(process.env.FINDER_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 100;
}

export function finderAvailable(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY) || process.env.AI_CHECK_FAKE === "1";
}

const month = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }).slice(0, 7);

/** Searches run so far this calendar month (Pacific time). */
export async function searchesThisMonth(): Promise<number> {
  const [row] = await sql<{ value: { month: string; count: number } }[]>`select value from settings where key = 'finder_searches'`;
  return row && row.value.month === month() ? row.value.count : 0;
}

/** Counts one search, unless this month's limit is already reached. Returns false when it is. */
async function takeSearch(): Promise<boolean> {
  const m = month();
  const limit = monthlyLimit();
  const rows = await sql`
    insert into settings (key, value, updated_at) values ('finder_searches', ${sql.json({ month: m, count: 1 })}, now())
    on conflict (key) do update set
      value = case when settings.value->>'month' = ${m}
        then jsonb_build_object('month', ${m}::text, 'count', (settings.value->>'count')::int + 1)
        else jsonb_build_object('month', ${m}::text, 'count', 1) end,
      updated_at = now()
    where settings.value->>'month' <> ${m} or (settings.value->>'count')::int < ${limit}
    returning value`;
  return rows.length > 0;
}

type Place = {
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: unknown;
  photos?: unknown[];
  googleMapsUri?: string;
  businessStatus?: string;
};

/** Made-up sample results for tests and previews (AI_CHECK_FAKE=1), so Google isn't called. */
const FAKE: FoundBusiness[] = [
  { name: "Summit Pro Services", address: "101 Main St, El Cajon, CA", website: "https://summitpro.example.com", phone: "(619) 555-0101", rating: 4.9, reviews: 212, hasHours: true, photos: 10, mapsUrl: "", rank: 1 },
  { name: "Canyon Crew", address: "22 Broadway, El Cajon, CA", website: "https://canyoncrew.example.com", phone: "(619) 555-0102", rating: 4.7, reviews: 96, hasHours: true, photos: 10, mapsUrl: "", rank: 2 },
  { name: "Valley Standard Co.", address: "9 Magnolia Ave, El Cajon, CA", website: "https://valleystandard.example.com", phone: "(619) 555-0103", rating: 4.8, reviews: 61, hasHours: true, photos: 8, mapsUrl: "", rank: 3 },
  { name: "Mesa Family Services", address: "450 Fletcher Pkwy, El Cajon, CA", website: "", phone: "(619) 555-0104", rating: 4.2, reviews: 7, hasHours: false, photos: 1, mapsUrl: "", rank: 4 },
  { name: "Lopez & Sons", address: "El Cajon, CA", website: "https://lopezsons.example.com", phone: "(619) 555-0105", rating: 4.6, reviews: 18, hasHours: true, photos: 2, mapsUrl: "", rank: 5 },
  { name: "Greenfield Brothers", address: "1200 E Main St, El Cajon, CA", website: "", phone: "", rating: undefined, reviews: 0, hasHours: false, photos: 0, mapsUrl: "", rank: 6 },
  { name: "Ridgeline Works", address: "300 Johnson Ave, El Cajon, CA", website: "https://ridgeline.example.com", phone: "(619) 555-0107", rating: 3.8, reviews: 24, hasHours: true, photos: 6, mapsUrl: "", rank: 7 },
];

export type FinderResult = { results: ScoredBusiness[] } | { error: string };

/** Up to 20 businesses Google Maps shows for "<trade> in <city>", scored weakest first. */
export async function findProspects(trade: string, city: string): Promise<FinderResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const fake = process.env.AI_CHECK_FAKE === "1";
  if (!key && !fake) return { error: "The Google Places key isn't set up, so the finder can't search." };
  if (!(await takeSearch())) return { error: `You've used this month's ${monthlyLimit()} searches. The count resets on the 1st.` };

  let found: FoundBusiness[];
  if (fake) {
    found = FAKE;
  } else {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key!,
        "x-goog-fieldmask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours,places.photos,places.googleMapsUri,places.businessStatus",
      },
      body: JSON.stringify({ textQuery: `${tradePhrase(trade)} in ${placeName(city)}`, pageSize: 20 }),
    });
    if (!res.ok) {
      console.error("[finder] Google search failed:", res.status, await res.text().catch(() => ""));
      return { error: `Google search failed (${res.status}). Try again in a minute.` };
    }
    const { places = [] } = (await res.json()) as { places?: Place[] };
    found = places
      .map((p, i) => ({ p, rank: i + 1 }))
      .filter(({ p }) => p.displayName?.text && p.businessStatus !== "CLOSED_PERMANENTLY")
      .map(({ p, rank }) => ({
        name: p.displayName!.text,
        address: p.formattedAddress ?? "",
        website: p.websiteUri ?? "",
        phone: p.nationalPhoneNumber ?? "",
        rating: p.rating,
        reviews: p.userRatingCount,
        hasHours: Boolean(p.regularOpeningHours),
        photos: p.photos?.length ?? 0,
        mapsUrl: p.googleMapsUri ?? "",
        rank,
      }));
  }

  const leads = await sql<{ id: string; business_name: string; website_url: string; phone_digits: string }[]>`
    select id, business_name, website_url, phone_digits from leads`;
  return { results: rankProspects(found, leads) };
}
