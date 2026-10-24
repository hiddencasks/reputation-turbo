// Finds business names in AI answers and decides whether a given business was named.

const suffixes = /\b(llc|l\.l\.c|inc|incorporated|co|corp|corporation|company|ltd|the)\b\.?/g;

/** Lowercase letters and digits only, with "&" read as "and" and legal suffixes dropped. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(suffixes, " ")
    .replace(/[^a-z0-9]+/g, "");
}

/** "https://www.lopezconcrete.com/about" -> "lopezconcrete" */
export function domainStem(website: string): string {
  if (!website) return "";
  try {
    const host = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname;
    const parts = host.replace(/^www\./, "").split(".");
    return parts.length > 1 ? parts.slice(0, -1).join("") : parts[0];
  } catch {
    return "";
  }
}

/**
 * Whether an AI answer names the business, by its name or its website.
 * Very short names only count as a match when they appear as a whole word.
 */
export function mentions(answer: string, businessName: string, website = ""): boolean {
  const name = normalizeName(businessName);
  const text = normalizeName(answer);
  if (name.length >= 5 && text.includes(name)) return true;
  if (name.length > 0 && name.length < 5) {
    const words = businessName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${words}\\b`, "i").test(answer)) return true;
  }
  const stem = domainStem(website);
  return stem.length >= 5 && answer.toLowerCase().replace(/[^a-z0-9.]+/g, "").includes(stem);
}

const notBusinesses = /^(google|yelp|angi|angie'?s list|homeadvisor|thumbtack|bbb|better business bureau|nextdoor|facebook|houzz|reviews?|tips?|summary|note|conclusion|why|what|how|location|services?|pricing|contact|phone|website|address|rating|hours|pros|cons|top|best|recommendations?)$/i;

/**
 * A fallback for when no extraction model is configured: pulls likely business
 * names from list items and bold text, which is how AI assistants usually format
 * recommendations. It errs toward leaving names out rather than inventing them.
 */
export function heuristicBusinesses(answer: string): string[] {
  const found: string[] = [];
  const add = (raw: string) => {
    const name = raw
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[*_`#]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[:.,;–—-]+$/, "")
      .trim();
    if (name.length < 3 || name.length > 60 || name.split(" ").length > 7 || notBusinesses.test(name)) return;
    if (!/^[A-Z0-9]/.test(name)) return;
    if (!found.some((f) => normalizeName(f) === normalizeName(name))) found.push(name);
  };
  for (const m of answer.matchAll(/\*\*([^*\n]{2,80})\*\*/g)) add(m[1]);
  if (found.length === 0) {
    for (const m of answer.matchAll(/^\s*(?:\d+[.)]|[-*•])\s+([^:\n(–—]{2,80})/gm)) add(m[1]);
  }
  return found;
}

export type Competitor = { name: string; count: number };

/** Counts how many answers name each business, leaving out the business being checked. */
export function tallyCompetitors(answers: { businesses: string[] }[], businessName: string, website = "", limit = 8): Competitor[] {
  const own = normalizeName(businessName);
  const stem = domainStem(website);
  const counts = new Map<string, Competitor>();
  for (const a of answers) {
    const seen = new Set<string>();
    for (const b of a.businesses) {
      const key = normalizeName(b);
      if (!key || seen.has(key)) continue;
      if ((own && (key === own || (own.length >= 5 && key.includes(own)))) || (stem.length >= 5 && key.includes(stem))) continue;
      seen.add(key);
      const c = counts.get(key) ?? { name: b, count: 0 };
      c.count += 1;
      counts.set(key, c);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
}

/** Strips Markdown so answers read cleanly in reports and emails. */
export function plainText(answer: string): string {
  return answer
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
