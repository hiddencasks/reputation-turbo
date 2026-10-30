import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { domainStem, normalizeName } from "../ai-visibility/match";
import { placeName, tradePhrase } from "../ai-visibility/questions";
import {
  analyzeContact,
  analyzeGoogle,
  analyzeSocial,
  analyzeWebsite,
  type AuditContext,
  type AuditSection,
  type MapsCompetitor,
  type PlaceResult,
  type SiteAudit,
} from "./checks";

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000;

/** Blocks addresses inside private networks, so a lead's "website" can't point the server at itself. */
function isPrivate(ip: string): boolean {
  if (ip.includes(":")) return ip === "::1" || /^f[cd]/i.test(ip) || /^fe80/i.test(ip) || ip.startsWith("::ffff:") && isPrivate(ip.slice(7));
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function assertPublic(url: URL) {
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only web addresses can be checked.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (ips.length === 0 || ips.some(isPrivate)) throw new Error("That address isn't a public website.");
}

/** Fetches the home page, following up to 5 redirects and checking each hop is a public address. */
async function fetchHome(website: string): Promise<{ html: string; finalUrl: string; ms: number }> {
  let url = new URL(website);
  const started = Date.now();
  for (let hop = 0; hop < 6; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; ReputationTurboAudit/1.0; +https://reputationturbo.com)", accept: "text/html" },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) throw new Error(`The website answered with an error (${res.status}).`);
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      for (let size = 0; size < MAX_BYTES; ) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        html += decoder.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => {});
    }
    return { html, finalUrl: url.toString(), ms: Date.now() - started };
  }
  throw new Error("The website redirected too many times.");
}

/**
 * Looks the business up on Google (Places API). Undefined when no key is set, null when nothing matching is found.
 * If "<name> <city> CA" finds nothing, it tries "<name> CA": a service-area business with a hidden address,
 * or one based in a different town from the city entered, often only turns up without the city.
 */
async function findPlace(ctx: AuditContext): Promise<PlaceResult | null | undefined> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return undefined;
  const match = (await searchPlaces(key, `${ctx.businessName} ${ctx.city} CA`, ctx)) ?? (ctx.city ? await searchPlaces(key, `${ctx.businessName} CA`, ctx) : undefined);
  if (!match) return null;
  return {
    name: match.displayName?.text ?? ctx.businessName,
    rating: match.rating,
    reviews: match.userRatingCount,
    hasHours: Boolean(match.regularOpeningHours),
    hasPhone: Boolean(match.nationalPhoneNumber),
    hasWebsite: Boolean(match.websiteUri),
    photos: match.photos?.length ?? 0,
    mapsUrl: match.googleMapsUri,
  };
}

type Place = {
  displayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: unknown;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  photos?: unknown[];
  googleMapsUri?: string;
};

/** One Places Text Search; returns the result that is the lead's own business, if any. */
async function searchPlaces(key: string, textQuery: string, ctx: AuditContext): Promise<Place | undefined> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": key,
      "x-goog-fieldmask": "places.displayName,places.rating,places.userRatingCount,places.regularOpeningHours,places.nationalPhoneNumber,places.websiteUri,places.photos,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery, pageSize: 5 }),
  });
  if (!res.ok) throw new Error(`Google lookup failed (${res.status}).`);
  const { places = [] } = (await res.json()) as { places?: Place[] };
  return places.find((p) => isSameBusiness(ctx, p.displayName?.text ?? "", p.websiteUri ?? ""));
}

/** Whether a Places result is the lead's own business, by name or website. */
function isSameBusiness(ctx: AuditContext, name: string, website: string): boolean {
  const want = normalizeName(ctx.businessName);
  const stem = domainStem(ctx.website);
  const n = normalizeName(name);
  return Boolean((n && want && (n.includes(want) || want.includes(n))) || (stem && domainStem(website) === stem));
}

/**
 * The top 3 businesses Google Maps shows for "<trade> in <city>", leaving out the lead's own business.
 * One Places Text Search call (Enterprise fields, about $0.035 after Google's free monthly allowance).
 */
async function findCompetitors(ctx: AuditContext): Promise<MapsCompetitor[] | undefined> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !ctx.trade || !ctx.city) return undefined;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": key,
      "x-goog-fieldmask": "places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: `${tradePhrase(ctx.trade)} in ${placeName(ctx.city)}`, pageSize: 6 }),
  });
  if (!res.ok) throw new Error(`Google competitor lookup failed (${res.status}).`);
  type Place = { displayName?: { text: string }; rating?: number; userRatingCount?: number; websiteUri?: string; googleMapsUri?: string };
  const { places = [] } = (await res.json()) as { places?: Place[] };
  return places
    .filter((p) => p.displayName?.text && !isSameBusiness(ctx, p.displayName.text, p.websiteUri ?? ""))
    .slice(0, 3)
    .map((p) => ({ name: p.displayName!.text, rating: p.rating, reviews: p.userRatingCount, mapsUrl: p.googleMapsUri }));
}

/** A small sample site for tests (AI_CHECK_FAKE=1), so no real website is fetched. */
const FAKE_HTML = `<html><head><title>Lopez Concrete | Driveways</title><meta name="viewport" content="width=device-width">
<script type="application/ld+json">{"@type":"Organization"}</script></head>
<body><a href="tel:6195550100">Call</a><a href="/contact">Contact</a><a href="https://www.facebook.com/lopezconcrete">Facebook</a></body></html>`;

const FAKE_COMPETITORS: MapsCompetitor[] = [
  { name: "Summit Pro Services", rating: 4.9, reviews: 212 },
  { name: "Canyon Crew", rating: 4.7, reviews: 96 },
  { name: "Valley Standard Co.", rating: 4.8, reviews: 61 },
];

/** Runs the website, Google, social and contact checks. Each part fails on its own without stopping the rest. */
export async function runSiteAudit(ctx: AuditContext): Promise<SiteAudit> {
  const fake = process.env.AI_CHECK_FAKE === "1";
  const sections: AuditSection[] = [];

  let html: string | null = null;
  if (!ctx.website) {
    sections.push({
      id: "website",
      title: "Website",
      items: [{ id: "website", label: "Website", status: "fix", detail: "No website yet. Customers and AI assistants look for one to confirm you're a real, established business." }],
    });
  } else {
    try {
      const home = fake ? { html: FAKE_HTML, finalUrl: ctx.website, ms: 900 } : await fetchHome(ctx.website);
      html = home.html;
      sections.push({ id: "website", title: "Website", items: analyzeWebsite(home.html, home.finalUrl, ctx, home.ms) });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      sections.push({
        id: "website",
        title: "Website",
        items: [{ id: "website", label: "Website", status: "fix", detail: `We couldn't load ${ctx.website}. ${reason}` }],
      });
    }
  }

  const [place, competitors] = await Promise.all([
    (fake ? Promise.resolve(undefined) : findPlace(ctx)).catch((err): PlaceResult | null | undefined => {
      console.error("[audit] Google lookup failed:", err);
      return undefined;
    }),
    (fake ? Promise.resolve(FAKE_COMPETITORS) : findCompetitors(ctx)).catch((err): MapsCompetitor[] | undefined => {
      console.error("[audit] Google competitor lookup failed:", err);
      return undefined;
    }),
  ]);
  sections.push(analyzeGoogle(place, ctx));
  sections.push({ id: "social", title: "Social profiles", items: analyzeSocial(html) });
  const contact = analyzeContact(ctx);
  if (contact.length) sections.push({ id: "contact", title: "Contact details", items: contact });
  return { sections, competitors };
}
