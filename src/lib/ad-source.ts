/**
 * Which ad or link brought a visitor to the site. AdSourceCapture saves the link's tags
 * (utm_source, utm_campaign, ...) in a cookie when someone lands, and the forms copy it onto
 * the lead, so the dashboard can say "came from the Meta ad, concept 1".
 * Shared by the browser and the server, so nothing here may be server-only.
 */

export const AD_COOKIE = "rt_ad";
/** How long a click keeps counting if they come back later to fill in a form. */
export const AD_COOKIE_DAYS = 30;

export type AdSource = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  /** Meta adds fbclid to every ad click, even without tags. */
  fbclid?: boolean;
  /** The page they first landed on, such as /free-audit. */
  landing?: string;
  /** When they clicked, as an ISO date. */
  at?: string;
};

const TAGS = ["source", "medium", "campaign", "content", "term"] as const;

const clean = (v: unknown, max = 80) =>
  typeof v === "string" ? v.replace(/[^\w .:/@+-]/g, "").trim().slice(0, max) || undefined : undefined;

/** Reads the tags from a landing URL's query string. Returns null when the link had none. */
export function adSourceFromUrl(search: string, path: string, now = new Date()): AdSource | null {
  const params = new URLSearchParams(search);
  const out: AdSource = {};
  for (const t of TAGS) {
    const v = clean(params.get(`utm_${t}`));
    if (v) out[t] = v;
  }
  if (params.get("fbclid")) {
    out.fbclid = true;
    out.source ??= "facebook";
  }
  if (!Object.keys(out).length) return null;
  out.landing = clean(path, 120);
  out.at = now.toISOString();
  return out;
}

/** Parses the cookie value, dropping anything unexpected. Returns null when it's missing or broken. */
export function parseAdSource(raw: string | undefined): AdSource | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const out: AdSource = {};
    for (const t of TAGS) {
      const v = clean(data[t]);
      if (v) out[t] = v;
    }
    if (data.fbclid === true) out.fbclid = true;
    if (!out.source && !out.campaign && !out.fbclid) return null;
    const landing = clean(data.landing, 120);
    if (landing) out.landing = landing;
    const at = clean(data.at, 30);
    if (at && !Number.isNaN(Date.parse(at))) out.at = at;
    return out;
  } catch {
    return null;
  }
}

const SOURCE_NAMES: Record<string, string> = {
  meta: "Meta ad",
  facebook: "Facebook",
  fb: "Facebook",
  instagram: "Instagram",
  ig: "Instagram",
  google: "Google",
};

/** One line for the dashboard, such as "Meta ad · geo-v1 · concept1". */
export function describeAdSource(ad: AdSource): string {
  const name = ad.source ? SOURCE_NAMES[ad.source.toLowerCase()] ?? ad.source : "Unknown";
  return [name, ad.campaign, ad.content, ad.term].filter(Boolean).join(" · ");
}
