/** A package, plan or add-on suggested for a lead, with the reason shown to the owner. */
export type Suggestion = { slug: string; reason: string };

export type RecommendInput = {
  website: string;
  /** The latest finished AI visibility check, if any. */
  aiCheck: { mentioned: number; answers: number } | null;
};

/**
 * Suggests what to offer a lead from what we know about them. These are starting points for the
 * owner, who confirms or changes them before anything is quoted.
 */
export function recommendPackages({ website, aiCheck }: RecommendInput): { suggestions: Suggestion[]; note?: string } {
  const out: Suggestion[] = [];
  const checked = aiCheck && aiCheck.answers > 0;
  const named = checked ? `named in ${aiCheck.mentioned} of ${aiCheck.answers} AI answers` : "";
  const weakAi = checked && aiCheck.mentioned / aiCheck.answers < 0.5;
  const invisible = checked && aiCheck.mentioned === 0;

  if (!website) {
    if (invisible) {
      out.push({ slug: "premium-digital-presence", reason: `No website and ${named}. Premium adds the full GEO setup on top of a new site.` });
    } else {
      out.push({ slug: "business-website-launch", reason: "No website, so customers and AI assistants have little to go on. Includes GEO basics and everything in Starter." });
    }
    out.push({ slug: "care-plan", reason: "Optional: keeps the new website updated after launch." });
  } else {
    out.push({ slug: "starter-online-presence", reason: "Already has a website, so start with their Google profile, reviews and listings instead of a rebuild." });
    if (weakAi) out.push({ slug: "ai-search-setup", reason: `Only ${named}. GEO Setup works with the website they already have.` });
  }
  if (weakAi) out.push({ slug: "ai-visibility-plan", reason: "Optional: tracks every month whether AI assistants start naming them." });

  return { suggestions: out, note: checked ? undefined : "Run an AI check for a sharper suggestion." };
}

/** Recommended packages are stored as one comma-separated text column. */
export const joinPackages = (names: string[]) => names.join(", ");
export const splitPackages = (value: string) => value.split(",").map((s) => s.trim()).filter(Boolean);
