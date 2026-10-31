import type { MetadataRoute } from "next";
import { citySlug, site } from "@/lib/site";
import { isLive, posts } from "@/lib/blog";

// Re-checked every hour so scheduled blog posts are added on their date.
export const revalidate = 3600;

const paths = ["", "/services", "/ai-search", "/about", "/free-audit", "/contact", "/privacy", "/terms", "/areas", "/blog"];

export default function sitemap(): MetadataRoute.Sitemap {
  const cities = site.cities.map((c) => `/areas/${citySlug(c)}`);
  const pages: MetadataRoute.Sitemap = [...paths, ...cities].map((p) => ({ url: `${site.url}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
  const blog: MetadataRoute.Sitemap = posts
    .filter((p) => isLive(p))
    .map((p) => ({ url: `${site.url}/blog/${p.slug}`, lastModified: p.publishAt, changeFrequency: "yearly", priority: 0.6 }));
  return [...pages, ...blog];
}
