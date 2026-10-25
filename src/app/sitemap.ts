import type { MetadataRoute } from "next";
import { citySlug, site } from "@/lib/site";

const paths = ["", "/services", "/ai-search", "/about", "/free-audit", "/contact", "/privacy", "/terms", "/areas"];

export default function sitemap(): MetadataRoute.Sitemap {
  const cities = site.cities.map((c) => `/areas/${citySlug(c)}`);
  return [...paths, ...cities].map((p) => ({ url: `${site.url}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
}
