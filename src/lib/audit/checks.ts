/**
 * The non-AI parts of the free online audit: the website, the Google Business Profile,
 * social profiles and contact details. Each finding is "good", "fix" or "info" with a
 * plain-English detail the owner can read before approving the report.
 */
export type AuditStatus = "good" | "fix" | "info";
export type AuditItem = { id: string; label: string; status: AuditStatus; detail: string };
export type AuditSection = { id: "website" | "google" | "social" | "contact"; title: string; items: AuditItem[]; note?: string };
export type SiteAudit = { sections: AuditSection[] };

export type AuditContext = { businessName: string; website: string; email: string; city: string; trade: string };

const PERSONAL_EMAIL = /@(gmail|yahoo|hotmail|outlook|aol|icloud|me|live|msn|comcast|att|sbcglobal|cox)\.(com|net)$/i;

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;/g, " ")
    .replace(/\s+/g, " ");

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

const LOCAL_TYPES = /LocalBusiness|HomeAndConstructionBusiness|Contractor|Plumber|Electrician|RoofingContractor|HVACBusiness|GeneralContractor|HousePainter|Locksmith|MovingCompany|LandscapingBusiness|ProfessionalService/;

/** Website findings from the home page HTML. `finalUrl` is where the request ended up after redirects. */
export function analyzeWebsite(html: string, finalUrl: string, ctx: AuditContext, loadMs?: number): AuditItem[] {
  const items: AuditItem[] = [];
  const body = text(html);
  const lower = body.toLowerCase();

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

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
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
    /href=["']tel:/i.test(html)
      ? { id: "call", label: "Tap to call", status: "good", detail: "Visitors on phones can tap your number to call." }
      : { id: "call", label: "Tap to call", status: "fix", detail: "There's no tap-to-call link, so phone visitors have to copy your number by hand." },
  );

  items.push(
    /<form[\s>]/i.test(html) || /href=["'][^"']*contact/i.test(html)
      ? { id: "contact", label: "Easy to contact", status: "good", detail: "There's a contact form or contact page." }
      : { id: "contact", label: "Easy to contact", status: "fix", detail: "No contact form or contact page was found on the home page." },
  );

  const types = schemaTypes(html);
  items.push(
    types.some((t) => LOCAL_TYPES.test(t))
      ? { id: "schema", label: "Business details for Google and AI", status: "good", detail: `The page includes structured business details (${types.join(", ")}).` }
      : { id: "schema", label: "Business details for Google and AI", status: "fix", detail: "No structured business details. These tell Google and AI assistants your services, area and hours in a format they read directly." },
  );

  if (ctx.city) {
    items.push(
      lower.includes(ctx.city.toLowerCase())
        ? { id: "area", label: "Service area on the page", status: "good", detail: `The home page mentions ${ctx.city}.` }
        : { id: "area", label: "Service area on the page", status: "fix", detail: `The home page doesn't mention ${ctx.city}. Naming the areas you serve helps you show up in local searches.` },
    );
  }

  items.push(
    /faq|frequently asked/i.test(body)
      ? { id: "faq", label: "Answers common questions", status: "good", detail: "The site has a questions section, which AI assistants often quote." }
      : { id: "faq", label: "Answers common questions", status: "fix", detail: "No FAQ found. Plain-language answers to common customer questions are what AI assistants quote." },
  );

  return items;
}

const SOCIAL: { id: string; label: string; re: RegExp }[] = [
  { id: "facebook", label: "Facebook", re: /https?:\/\/(www\.)?facebook\.com\/(?!sharer|share|dialog|tr\b)[^"'\s>]+/i },
  { id: "instagram", label: "Instagram", re: /https?:\/\/(www\.)?instagram\.com\/[^"'\s>]+/i },
  { id: "yelp", label: "Yelp", re: /https?:\/\/(www\.)?yelp\.com\/biz\/[^"'\s>]+/i },
  { id: "nextdoor", label: "Nextdoor", re: /https?:\/\/(www\.)?nextdoor\.com\/[^"'\s>]+/i },
];

/** Social profiles linked from the website. Without a website we can't tell, so these are informational. */
export function analyzeSocial(html: string | null): AuditItem[] {
  if (html === null) {
    return [{ id: "social", label: "Social profiles", status: "info", detail: "We'll check your Facebook, Instagram and Yelp profiles by hand and include what we find." }];
  }
  const found = SOCIAL.filter((s) => s.re.test(html));
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
