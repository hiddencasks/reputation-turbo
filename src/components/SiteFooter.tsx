import Link from "next/link";
import { addressOneLine, site } from "@/lib/site";
import { Logo } from "./Logo";
import { navLinks } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="no-print mt-auto bg-navy text-white/80">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <Logo tone="light" className="text-2xl" />
          <p className="mt-3 font-display text-lg italic text-white">{site.tagline}</p>
          <p className="mt-3 text-sm">Serving {site.serviceArea}.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/free-audit" className="hover:text-orange">Free Online Audit</Link>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-orange">{l.label}</Link>
          ))}
          <Link href="/areas" className="hover:text-orange">Areas We Serve</Link>
          <Link href="/privacy" className="hover:text-orange">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-orange">Terms of Use</Link>
        </nav>
        <address className="text-sm not-italic leading-7">
          <a href={site.phoneHref} className="block font-semibold text-white hover:text-orange">{site.phoneDisplay}</a>
          <a href={`mailto:${site.email}`} className="block hover:text-orange">{site.email}</a>
          <span className="block">{addressOneLine}</span>
        </address>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs sm:px-6">
          © {new Date().getFullYear()} {site.name}. You own your website, domain and accounts.
        </p>
      </div>
    </footer>
  );
}
