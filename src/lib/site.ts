// Public business details used across the site, emails and legal pages.
export const site = {
  name: "Reputation Turbo",
  tagline: "Get Found. Build Trust. Grow Your Business.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "info@reputationturbo.com",
  phoneDisplay: "(619) 609-4409",
  phoneHref: "tel:+16196094409",
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
  ],
} as const;

/**
 * Links to Reputation Turbo's profiles on other sites (Google Business Profile,
 * Yelp, LinkedIn, Facebook, BBB...). They're added to the structured data AI
 * tools read, so those tools can tell every profile belongs to the same business.
 */
export const profiles: string[] = [];

/** "El Cajon" -> "el-cajon" */
export function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function cityFromSlug(slug: string): (typeof site.cities)[number] | undefined {
  return site.cities.find((c) => citySlug(c) === slug);
}

export const addressOneLine = `${site.address.line1}, ${site.address.city}, ${site.address.region} ${site.address.postal}`;
