import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const body = Barlow({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const heading = Barlow_Condensed({ variable: "--font-heading", subsets: ["latin"], weight: ["600", "700", "800"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Websites, Google Profiles & Reviews for San Diego Contractors`,
    template: `%s | ${site.name}`,
  },
  description:
    "Reputation Turbo helps San Diego County contractors and home service businesses get found online, build trust and win more jobs. Start with a free online audit.",
  openGraph: { siteName: site.name, type: "website", locale: "en_US" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
