/**
 * The non-AI parts of the free online audit: the website, the Google Business Profile,
 * social profiles and contact details. Each finding is "good", "fix" or "info" with a
 * plain-English detail the owner can read before approving the report.
 */
export type AuditStatus = "good" | "fix" | "info";
export type AuditItem = { id: string; label: string; status: AuditStatus; detail: string };
export type AuditSection = { id: "website" | "google" | "social" | "contact"; title: string; items: AuditItem[]; note?: string };
/** A business ranking near the top of Google Maps for the lead's trade and city. */
export type MapsCompetitor = { name: string; rating?: number; reviews?: number; mapsUrl?: string };
/** `competitors` is missing when the Google lookup isn't set up or failed. */
export type SiteAudit = { sections: AuditSection[]; competitors?: MapsCompetitor[] };

export type AuditContext = { businessName: string; website: string; email: string; city: string; trade: string };

const PERSONAL_EMAIL = /@(gmail|yahoo|hotmail|outlook|aol|icloud|me|live|msn|comcast|att|sbcglobal|cox)\.(com|net)$/i;

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;/g, " ")
    .replace(/\s+/g, " ");

/** Turns the common HTML entities back into characters, so a title reads "A & B", not "A &amp; B". */
const decodeEntities = (s: string) =>
  s.replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (_, e: string) => ({ amp: "&", quot: '"', "#39": "'", apos: "'", lt: "<", gt: ">", nbsp: " " })[e]!);

function metaContent(html: string, name: string): string {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0] ?? "";
  return tag.match(/content=["']([^"']*)["']/i)?.[1]?.trim() ?? "";
}

/** JSON-LD @type values on the page, e.g. ["LocalBusiness", "FAQPage"]. */
export function schemaTypes(html: string): string[] {
  const types = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const t of m[1].matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) {
      for (const v of t[1].matchAll(/"([^"]+)"/g)) types.add(v[1]);
    }
  }
  return [...types];
}

/**
 * True when the home page is an empty shell that JavaScript fills in later (a React/Vite style
 * single-page app). Our checks read the raw HTML, so on these sites links, text and forms only
 * exist after scripts run and would wrongly show as missing.
 */
export function isScriptShell(html: string): boolean {
  const bodyHtml = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const visible = text(bodyHtml).trim();
  return /<script[^>]+src=/i.test(html) && visible.length < 200;
}

const SHELL_DETAIL = "Your site loads this part with JavaScript and we couldn't download its code to check it.";

const LOCAL_TYPES = /LocalBusiness|HomeAndConstructionBusiness|Contractor|Plumber|Electrician|RoofingContractor|HVACBusiness|GeneralContractor|HousePainter|Locksmith|MovingCompany|LandscapingBusiness|ProfessionalService/;

/** Website findings from the home page HTML. `finalUrl` is where the request ended up after redirects. */
/**
 * `scripts` is the site's own JavaScript, fetched when the home page is a script shell. Those sites
 * build their links and text in code, so the checks below look there too (e.g. `href:"tel:..."`).
 */
export function analyzeWebsite(html: string, finalUrl: string, ctx: AuditContext, loadMs?: number, scripts = ""): AuditItem[] {
  const items: AuditItem[] = [];
  const body = text(html);
  const lower = (body + " " + scripts).toLowerCase();
  const shell = isScriptShell(html);
  /** Only when we couldn't read a shell site's code is a missing link unproven, so it's "info", not "fix". */
  const check = (ok: boolean, good: AuditItem, fix: AuditItem): AuditItem =>
    ok ? good : shell && !scripts ? { ...fix, status: "info", detail: SHELL_DETAIL } : fix;

  items.push(
    finalUrl.startsWith("https://")
      ? { id: "https", label: "Secure (https)", status: "good", detail: "The site loads securely, so browsers don't show a \"Not secure\" warning." }
      : { id: "https", label: "Secure (https)", status: "fix", detail: "The site doesn't load securely. Browsers may warn visitors with \"Not secure\"." },
  );

  items.push(
    /<meta[^>]+name=["']viewport["']/i.test(html)
      ? { id: "mobile", label: "Works on phones", status: "good", detail: "The page is set up to fit phone screens." }
      : { id: "mobile", label: "Works on phones", status: "fix", detail: "The page isn't set up for phones, so most visitors see a shrunken desktop page." },
  );

  if (loadMs !== undefined) {
    const s = (loadMs / 1000).toFixed(1);
    items.push(
      loadMs <= 2500
        ? { id: "speed", label: "Responds quickly", status: "good", detail: `The home page responded in ${s} seconds.` }
        : { id: "speed", label: "Responds quickly", status: "fix", detail: `The home page took ${s} seconds to respond. Slow pages lose visitors before they call.` },
    );
  }

  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const cityInTitle = ctx.city && title.toLowerCase().includes(ctx.city.toLowerCase());
  items.push(
    !title
      ? { id: "title", label: "Page title for Google", status: "fix", detail: "The home page has no title, which is the headline Google shows in search results." }
      : cityInTitle
        ? { id: "title", label: "Page title for Google", status: "good", detail: `The title "${title}" names your city.` }
        : { id: "title", label: "Page title for Google", status: "fix", detail: `The title "${title}" doesn't mention ${ctx.city || "your city"}, which helps local searches find you.` },
  );

  items.push(
    metaContent(html, "description")
      ? { id: "description", label: "Search description", status: "good", detail: "The page has a description for search results." }
      : { id: "description", label: "Search description", status: "fix", detail: "No search description, so Google picks random text from the page to show." },
  );

  items.push(
    check(
      /href=["']tel:/i.test(html) || /["'`]tel:\+?[\d(]/i.test(scripts),
      { id: "call", label: "Tap to call", status: "good", detail: "Visitors on phones can tap your number to call." },
      { id: "call", label: "Tap to call", status: "fix", detail: "There's no tap-to-call link, so phone visitors have to copy your number by hand." },
    ),
  );

  items.push(
    check(
      /<form[\s>]/i.test(html) || /href=["'][^"']*contact/i.test(html) || /\(\s*["']form["']/.test(scripts) || /["'`][^"'`\s]*\/contact/i.test(scripts),
      { id: "contact", label: "Easy to contact", status: "good", detail: "There's a contact form or contact page." },
      { id: "contact", label: "Easy to contact", status: "fix", detail: "No contact form or contact page was found on the home page." },
    ),
  );

  const types = schemaTypes(html);
  items.push(
    types.some((t) => LOCAL_TYPES.test(t))
      ? { id: "schema", label: "Business details for Google and AI", status: "good", detail: `The page includes structured business details (${types.join(", ")}).` }
      : { id: "schema", label: "Business details for Google and AI", status: "fix", detail: "No structured business details. These tell Google and AI assistants your services, area and hours in a format they read directly." },
  );

  if (ctx.city) {
    items.push(
      check(
        lower.includes(ctx.city.toLowerCase()),
        { id: "area", label: "Service area on the page", status: "good", detail: `The home page mentions ${ctx.city}.` },
        { id: "area", label: "Service area on the page", status: "fix", detail: `The home page doesn't mention ${ctx.city}. Naming the areas you serve helps you show up in local searches.` },
      ),
    );
  }

  items.push(
    check(
      /faq|frequently asked/i.test(body) || /frequently asked|["'`]faq/i.test(scripts) || types.includes("FAQPage"),
      { id: "faq", label: "Answers common questions", status: "good", detail: "The site has a questions section, which AI assistants often quote." },
      { id: "faq", label: "Answers common questions", status: "fix", detail: "No FAQ found. Plain-language answers to common customer questions are what AI assistants quote." },
    ),
  );

  if (shell) {
    items.push({
      id: "no-js",
      label: "Readable without JavaScript",
      status: "fix",
      detail:
        "Your home page is almost blank until JavaScript runs. Google can usually handle that, but many of the crawlers that feed ChatGPT, Claude, Gemini, Perplexity and Copilot read only the raw page, so they may see little about your business.",
    });
  }

  return items;
}

const SOCIAL: { id: string; label: string; re: RegExp }[] = [
  { id: "facebook", label: "Facebook", re: /https?:\/\/(www\.)?facebook\.com\/(?!sharer|share|dialog|tr\b)[^"'\s>]+/i },
  { id: "instagram", label: "Instagram", re: /https?:\/\/(www\.)?instagram\.com\/[^"'\s>]+/i },
  { id: "yelp", label: "Yelp", re: /https?:\/\/(www\.)?yelp\.com\/biz\/[^"'\s>]+/i },
  { id: "nextdoor", label: "Nextdoor", re: /https?:\/\/(www\.)?nextdoor\.com\/[^"'\s>]+/i },
];

/** Social profiles linked from the website. Without a website we can't tell, so these are informational. */
export function analyzeSocial(html: string | null, scripts = ""): AuditItem[] {
  if (html === null) {
    return [{ id: "social", label: "Social profiles", status: "info", detail: "We'll check your Facebook, Instagram and Yelp profiles by hand and include what we find." }];
  }
  const found = SOCIAL.filter((s) => s.re.test(html) || s.re.test(scripts));
  if (!found.length && !scripts && isScriptShell(html)) {
    return [{ id: "social", label: "Social profiles", status: "info", detail: "Your site loads its links with JavaScript and we couldn't download its code to check them." }];
  }
  const items: AuditItem[] = found.map((s) => ({ id: s.id, label: s.label, status: "good", detail: `Your website links to your ${s.label} page.` }));
  if (!found.some((s) => s.id === "facebook" || s.id === "instagram")) {
    items.push({ id: "social-links", label: "Social profiles linked", status: "fix", detail: "Your website doesn't link to a Facebook or Instagram page. Linked profiles help customers and AI tools confirm you're the real business." });
  }
  return items;
}

export function analyzeContact(ctx: AuditContext): AuditItem[] {
  if (!ctx.email) return [];
  return [
    PERSONAL_EMAIL.test(ctx.email)
      ? { id: "email", label: "Business email address", status: "fix", detail: `You use a personal address (${ctx.email.split("@")[1]}). An address at your own domain looks more established and builds trust.` }
      : { id: "email", label: "Business email address", status: "good", detail: "You use an email address at your own business domain." },
  ];
}

export type PlaceResult = {
  name: string;
  rating?: number;
  reviews?: number;
  hasHours: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;
  photos: number;
  mapsUrl?: string;
};

/** Google Business Profile findings. `place` is null when no profile was found; undefined when the lookup isn't set up. */
export function analyzeGoogle(place: PlaceResult | null | undefined, ctx: AuditContext): AuditSection {
  const base = { id: "google" as const, title: "Google Business Profile" };
  if (place === undefined) {
    return { ...base, items: [{ id: "gbp", label: "Google profile", status: "info", detail: "We'll review your Google Business Profile by hand and include what we find." }] };
  }
  if (place === null) {
    return {
      ...base,
      items: [{ id: "gbp", label: "Google profile", status: "fix", detail: `We couldn't find a Google Business Profile for ${ctx.businessName} in ${ctx.city}. It's what shows on Google Maps and in the local results, so it's usually the first thing to fix.` }],
    };
  }
  const items: AuditItem[] = [{ id: "gbp", label: "Google profile", status: "good", detail: `Found "${place.name}" on Google.` }];
  if (place.rating !== undefined && place.reviews !== undefined) {
    const ok = place.reviews >= 20 && place.rating >= 4.3;
    items.push({
      id: "reviews",
      label: "Reviews",
      status: ok ? "good" : "fix",
      detail: ok
        ? `${place.rating.toFixed(1)} stars from ${place.reviews} reviews.`
        : `${place.rating.toFixed(1)} stars from ${place.reviews} reviews. More recent reviews help you stand out against nearby competitors.`,
    });
  } else {
    items.push({ id: "reviews", label: "Reviews", status: "fix", detail: "No Google reviews yet. Reviews are one of the biggest factors in who Google and AI recommend." });
  }
  items.push(place.hasHours
    ? { id: "hours", label: "Business hours", status: "good", detail: "Your hours are listed." }
    : { id: "hours", label: "Business hours", status: "fix", detail: "No hours listed, so Google may show you as closed or skip you." });
  items.push(place.hasPhone
    ? { id: "gbp-phone", label: "Phone number", status: "good", detail: "Your phone number is listed." }
    : { id: "gbp-phone", label: "Phone number", status: "fix", detail: "No phone number on your profile." });
  items.push(place.hasWebsite
    ? { id: "gbp-website", label: "Website link", status: "good", detail: "Your profile links to your website." }
    : { id: "gbp-website", label: "Website link", status: "fix", detail: "Your profile doesn't link to a website." });
  items.push(place.photos >= 10
    ? { id: "photos", label: "Photos", status: "good", detail: `${place.photos}+ photos on your profile.` }
    : { id: "photos", label: "Photos", status: "fix", detail: `${place.photos} photo${place.photos === 1 ? "" : "s"} on your profile. Profiles with recent job photos get more calls.` });
  return { ...base, items };
}

/** Counts for the summary: how many checks passed out of those that could be scored. */
export function auditScore(audit: SiteAudit): { good: number; total: number } {
  const scored = audit.sections.flatMap((s) => s.items).filter((i) => i.status !== "info");
  return { good: scored.filter((i) => i.status === "good").length, total: scored.length };
}

/** The finding ids marked "fix", for package suggestions. */
export const fixIds = (audit: SiteAudit | null) =>
  new Set((audit?.sections ?? []).flatMap((s) => s.items).filter((i) => i.status === "fix").map((i) => i.id));

/** The instant on-screen summary shown right after the audit form is sent: labels and status only, no details. */
export type AuditSnapshot = {
  good: number;
  total: number;
  competitors?: MapsCompetitor[];
  sections: { id: AuditSection["id"]; title: string; items: { id: string; label: string; status: AuditStatus }[] }[];
};

/**
 * Builds the instant summary. A website we couldn't load is shown as "we'll review" rather than "to fix",
 * since a person checks it by hand (some sites block automated visits).
 */
export function auditSnapshot(audit: SiteAudit, ctx: Pick<AuditContext, "website">): AuditSnapshot {
  const sections = audit.sections.map((s) => ({
    id: s.id,
    title: s.title,
    items: s.items.map((i) => ({
      id: i.id,
      label: i.label,
      status: s.id === "website" && i.id === "website" && ctx.website ? ("info" as const) : i.status,
    })),
  }));
  const scored = sections.flatMap((s) => s.items).filter((i) => i.status !== "info");
  return { good: scored.filter((i) => i.status === "good").length, total: scored.length, sections, competitors: audit.competitors };
}

/** One part of the Turbo Score, e.g. "Google profile 20 / 30". */
export type ScorePart = { id: "google" | "website" | "reviews" | "ai"; label: string; points: number; max: number; note: string };
/** The Turbo Score: one 0-100 number that sums up the audit, plus the parts it's made of. */
export type TurboScore = { score: number; parts: ScorePart[]; weakest: ScorePart | null };

/** How much each part counts toward 100. */
export const SCORE_WEIGHTS = { google: 30, website: 25, reviews: 20, ai: 25 } as const;

const share = (items: AuditItem[]) => {
  const scored = items.filter((i) => i.status !== "info");
  return scored.length ? { good: scored.filter((i) => i.status === "good").length, total: scored.length } : null;
};

/**
 * Combines the audit checks and the AI answers into one 0-100 Turbo Score.
 * Parts we couldn't check (for example a Google lookup that isn't set up) are left out and the rest scaled to 100,
 * so a business is never marked down for something we didn't look at.
 */
export function turboScore(audit: SiteAudit, ai?: { named: number; total: number }): TurboScore {
  const parts: ScorePart[] = [];
  const google = audit.sections.find((s) => s.id === "google");
  const gbp = google?.items.find((i) => i.id === "gbp");

  if (gbp && gbp.status !== "info") {
    const profile = share(google!.items.filter((i) => i.id !== "reviews"));
    const max = SCORE_WEIGHTS.google;
    const points = gbp.status === "fix" || !profile ? 0 : (profile.good / profile.total) * max;
    const missing = google!.items.filter((i) => i.id !== "reviews" && i.status === "fix").map((i) => i.label.toLowerCase());
    parts.push({
      id: "google",
      label: "Google profile",
      points,
      max,
      note: gbp.status === "fix" ? "No Google profile found." : missing.length ? `To fix: ${missing.join(", ")}.` : "Complete.",
    });

    // Reviews: up to 12 points for count (20+ reviews is full) and 8 for rating (3.5 stars or less is none, 4.8+ is full).
    const reviews = google!.items.find((i) => i.id === "reviews");
    const m = reviews?.detail.match(/([\d.]+) stars from (\d+) reviews/);
    const rating = m ? Number(m[1]) : 0;
    const count = m ? Number(m[2]) : 0;
    const rPoints = gbp.status === "fix" ? 0 : Math.min(count / 20, 1) * 12 + Math.min(Math.max((rating - 3.5) / 1.3, 0), 1) * 8;
    parts.push({
      id: "reviews",
      label: "Reviews",
      points: rPoints,
      max: SCORE_WEIGHTS.reviews,
      note: count ? `${rating.toFixed(1)} stars from ${count} review${count === 1 ? "" : "s"}.` : "No Google reviews yet.",
    });
  }

  const web = share(audit.sections.filter((s) => s.id !== "google").flatMap((s) => s.items));
  if (web) {
    const toFix = web.total - web.good;
    parts.push({
      id: "website",
      label: "Website",
      points: (web.good / web.total) * SCORE_WEIGHTS.website,
      max: SCORE_WEIGHTS.website,
      note: toFix ? `${web.good} of ${web.total} checks look good.` : "All checks look good.",
    });
  }

  if (ai && ai.total > 0) {
    // Being named in half the answers or more earns full points.
    parts.push({
      id: "ai",
      label: "AI search",
      points: Math.min(ai.named / ai.total / 0.5, 1) * SCORE_WEIGHTS.ai,
      max: SCORE_WEIGHTS.ai,
      note: `Named in ${ai.named} of ${ai.total} AI answers.`,
    });
  }

  const order: ScorePart["id"][] = ["google", "website", "reviews", "ai"];
  parts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const max = parts.reduce((n, p) => n + p.max, 0);
  const earned = parts.reduce((n, p) => n + p.points, 0);
  const rounded = parts.map((p) => ({ ...p, points: Math.round(p.points) }));
  const weakest = rounded.length ? rounded.reduce((a, b) => (b.points / b.max < a.points / a.max ? b : a)) : null;
  return { score: max ? Math.round((earned / max) * 100) : 0, parts: rounded, weakest: weakest && weakest.points < weakest.max ? weakest : null };
}
