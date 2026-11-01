import type { NextConfig } from "next";
import { googleReviewUrl } from "./src/lib/site";

const nextConfig: NextConfig = {
  // Pages that read the database opt into per-request rendering with
  // `export const dynamic = "force-dynamic"`; everything else is static.
  cacheComponents: false,
  poweredByHeader: false,
  // Fonts and logo that the social post images are drawn with.
  outputFileTracingIncludes: {
    "/social-image/[file]": ["./src/assets/fonts/*.ttf", "./public/brand/logo-full-white.png"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Hidden for now. The pages still exist; delete a line here (and add it back to the
  // menu in SiteHeader.tsx and the sitemap) to bring one back.
  async redirects() {
    return [
      { source: "/our-work", destination: "/", permanent: false },
      { source: "/one-sheet", destination: "/", permanent: false },
      // Short link to text or email customers: reputationturbo.com/review opens Google's review box.
      { source: "/review", destination: googleReviewUrl, permanent: false },
      { source: "/reviews", destination: googleReviewUrl, permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
