import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const paths = ["", "/services", "/ai-search", "/about", "/our-work", "/free-audit", "/contact", "/one-sheet", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
}
