// Photos used on the public site. Put the file in /public/images and fill in its entry;
// sections with no photo yet fall back to a layout without one.
export type Photo = { src: string; alt: string };

export const photos: {
  hero: Photo | null;
  servicesHero: Photo | null;
  aiSearchHero: Photo | null;
  founder: Photo | null;
  /** `trade` must match an entry in site.industries so the free audit form can preselect it. */
  trades: (Photo & { label: string; trade: string })[];
} = {
  hero: { src: "/images/hero-contractor.jpg", alt: "A contractor smiling at his phone in front of a new concrete driveway in a sunny San Diego neighborhood" },
  servicesHero: { src: "/images/services-desk.jpg", alt: "A new business website shown on a desktop computer and a phone on a desk at dusk" },
  aiSearchHero: { src: "/images/ai-search-landscaper.jpg", alt: "A landscaper smiling at his phone in front of a freshly landscaped front yard" },
  founder: { src: "/images/founder-alvin.jpg", alt: "Alvin Shamoun, founder of Reputation Turbo, smiling in a navy button-up shirt" },
  trades: [
    { label: "Concrete", trade: "Concrete contractors", src: "/images/trade-concrete.jpg", alt: "A concrete contractor watching concrete pour from a mixer truck into driveway forms" },
    { label: "Landscaping & trees", trade: "Landscapers", src: "/images/trade-landscaping.jpg", alt: "A tree trimmer on a ladder trimming a palm tree" },
    { label: "Plumbing", trade: "Plumbers", src: "/images/trade-plumbing.jpg", alt: "A plumber working under a kitchen sink" },
    { label: "Roofing", trade: "Roofers", src: "/images/trade-roofing.jpg", alt: "A roofer placing clay tiles on a stucco home" },
    { label: "HVAC", trade: "HVAC", src: "/images/trade-hvac.jpg", alt: "An HVAC technician servicing an outdoor AC unit" },
    { label: "Electrical", trade: "Electricians", src: "/images/trade-electrical.jpg", alt: "An electrician working at a home's breaker panel" },
  ],
};
