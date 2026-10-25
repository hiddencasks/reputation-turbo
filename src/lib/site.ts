// Public business details used across the site, emails and legal pages.
export const site = {
  name: "Reputation Turbo",
  tagline: "Get Found. Build Trust. Grow Your Business.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "info@reputationturbo.com",
  phoneDisplay: "(619) 609-4409",
  phoneHref: "tel:+16196094409",
  /** Off for now so calls don't interrupt the owner's other job. Turn on to show the phone number everywhere again. */
  showPhone: false,
  /** 15-minute video call booking page (Cal.com, checks Google, Outlook and Apple calendars). */
  bookingUrl: "https://cal.com/reputationturbo/15min",
  bookingLabel: "Book a 15-min video call",
  /** Shown wherever we promise when the free audit arrives. Set to "" to stop promising a time. */
  auditTurnaround: "within 2 business days",
  address: {
    line1: "3911 N. Cordoba Ave. Ste. K",
    city: "Spring Valley",
    region: "CA",
    postal: "91977",
  },
  serviceArea: "San Diego County, especially East County",
  cities: [
    "El Cajon",
    "La Mesa",
    "Spring Valley",
    "Santee",
    "Lakeside",
    "Rancho San Diego",
    "Lemon Grove",
    "Chula Vista",
    "San Diego",
  ],
  industries: [
    "Concrete contractors",
    "General contractors",
    "Landscapers",
    "Tree services",
    "Plumbers",
    "Electricians",
    "HVAC",
    "Roofers",
    "Painters",
    "Flooring",
    "Fencing",
    "Cleaning",
    "Pressure washing",
    "Pool services",
  ],
} as const;

/**
 * Links to Reputation Turbo's profiles on other sites (Google Business Profile,
 * Yelp, LinkedIn, Facebook, BBB...). They're added to the structured data AI
 * tools read, so those tools can tell every profile belongs to the same business.
 */
/** The AI assistants named across the site, in this order. */
export const aiAssistants = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot"] as const;
export const aiAssistantList = "ChatGPT, Claude, Gemini, Perplexity and Copilot";
/** The assistants the free audit's AI check actually asks (see lib/ai-visibility/providers.ts). Keep claims about the check to these. */
export const checkedAssistantList = "ChatGPT, Gemini, Perplexity and Claude";

export const profiles: string[] = [];

/** "El Cajon" -> "el-cajon" */
export function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function cityFromSlug(slug: string): (typeof site.cities)[number] | undefined {
  return site.cities.find((c) => citySlug(c) === slug);
}

export const addressOneLine = `${site.address.line1}, ${site.address.city}, ${site.address.region} ${site.address.postal}`;
