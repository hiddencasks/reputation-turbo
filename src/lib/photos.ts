// Photos used on the public site. Put the file in /public/images and fill in its entry;
// sections with no photo yet fall back to a layout without one.
export type Photo = { src: string; alt: string };

export const photos: {
  hero: Photo | null;
  servicesHero: Photo | null;
  founder: Photo | null;
  trades: (Photo & { label: string })[];
} = {
  hero: null,
  servicesHero: null,
  founder: null,
  trades: [],
};
