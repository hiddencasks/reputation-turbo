import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages that read the database opt into per-request rendering with
  // `export const dynamic = "force-dynamic"`; everything else is static.
  cacheComponents: false,
  poweredByHeader: false,
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
