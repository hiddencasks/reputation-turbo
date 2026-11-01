/**
 * Prospect finder scoring: from what one Google Maps search already returns,
 * flags the businesses whose online presence looks weakest, so they're worth a
 * full audit. No extra lookups are made per business.
 */
import { domainStem, normalizeName } from "./ai-visibility/match";
import { phoneDigits } from "./phone";

export type FoundBusiness = {
  name: string;
  address: string;
  website: string;
  phone: string;
  rating?: number;
  reviews?: number;
  hasHours: boolean;
  photos: number;
  mapsUrl: string;
  /** Position in the Google Maps results for this search, starting at 1. */
  rank: number;
};

export type Flag = { label: string; points: number };
export type Verdict = "strong" | "maybe" | "solid";
export type ScoredBusiness = FoundBusiness & { flags: Flag[]; points: number; verdict: Verdict; existingLeadId?: string };

export const verdictLabel: Record<Verdict, string> = {
  strong: "Strong prospect",
  maybe: "Worth a look",
  solid: "Looks solid",
};

/** The weak spots a full audit would likely find, worth more points the bigger the gap. */
export function flagsFor(b: FoundBusiness): Flag[] {
  const flags: Flag[] = [];
  if (!b.website) flags.push({ label: "No website", points: 3 });
  const reviews = b.reviews ?? 0;
  if (reviews === 0) flags.push({ label: "No Google reviews", points: 3 });
  else if (reviews < 10) flags.push({ label: `Only ${reviews} review${reviews === 1 ? "" : "s"}`, points: 2 });
  else if (reviews < 30) flags.push({ label: `${reviews} reviews`, points: 1 });
  if (b.rating !== undefined && reviews > 0) {
    if (b.rating < 4) flags.push({ label: `Rated ${b.rating.toFixed(1)}`, points: 2 });
    else if (b.rating < 4.5) flags.push({ label: `Rated ${b.rating.toFixed(1)}`, points: 1 });
  }
  if (!b.hasHours) flags.push({ label: "No hours listed", points: 1 });
  if (!b.phone) flags.push({ label: "No phone listed", points: 1 });
  if (b.photos < 3) flags.push({ label: b.photos === 0 ? "No photos" : "Few photos", points: 1 });
  if (b.rank > 3) flags.push({ label: `#${b.rank} on Maps, not top 3`, points: 1 });
  return flags;
}

export function scoreBusiness(b: FoundBusiness): ScoredBusiness {
  const flags = flagsFor(b);
  const points = flags.reduce((sum, f) => sum + f.points, 0);
  const verdict: Verdict = points >= 4 ? "strong" : points >= 2 ? "maybe" : "solid";
  return { ...b, flags, points, verdict };
}

type KnownLead = { id: string; business_name: string; website_url: string; phone_digits: string };

/**
 * Scores every result and marks the ones already in the leads list (same name,
 * website or phone). Weakest first; ties keep Google's order.
 */
export function rankProspects(found: FoundBusiness[], leads: KnownLead[]): ScoredBusiness[] {
  const byName = new Map(leads.filter((l) => l.business_name).map((l) => [normalizeName(l.business_name), l.id]));
  const byStem = new Map(leads.filter((l) => l.website_url).map((l) => [domainStem(l.website_url), l.id]));
  const byPhone = new Map(leads.filter((l) => l.phone_digits).map((l) => [l.phone_digits, l.id]));
  return found
    .map((b) => {
      const stem = domainStem(b.website);
      const digits = phoneDigits(b.phone);
      const existingLeadId = byName.get(normalizeName(b.name)) ?? (stem ? byStem.get(stem) : undefined) ?? (digits ? byPhone.get(digits) : undefined);
      return { ...scoreBusiness(b), existingLeadId };
    })
    .sort((a, b) => b.points - a.points || a.rank - b.rank);
}
