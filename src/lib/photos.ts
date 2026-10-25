// Photos used on the public site. Put the file in /public/images and fill in its entry;
// sections with no photo yet fall back to a layout without one.
export type Photo = { src: string; alt: string };

export const photos: {
  hero: Photo | null;
  servicesHero: Photo | null;
  aiSearchHero: Photo | null;
  founder: Photo | null;
  trades: (Photo & { label: string })[];
} = {
  hero: { src: "/images/hero-contractor.jpg", alt: "A contractor smiling at his phone in front of a new concrete driveway in a sunny San Diego neighborhood" },
  servicesHero: { src: "/images/services-desk.jpg", alt: "A new business website shown on a desktop computer and a phone on a desk at dusk" },
  aiSearchHero: { src: "/images/ai-search-landscaper.jpg", alt: "A landscaper smiling at his phone in front of a freshly landscaped front yard" },
  founder: null,
  trades: [],
};
