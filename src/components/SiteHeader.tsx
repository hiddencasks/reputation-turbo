import Link from "next/link";
import { site } from "@/lib/site";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { ButtonLink } from "./ui";

// Our Work and One-Sheet are hidden for now (see the redirects in next.config.ts).
export const navLinks = [
  { href: "/services", label: "Services & Pricing" },
  { href: "/ai-search", label: "AI Search" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0">
          <Logo className="h-8 w-auto sm:h-12" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="font-medium text-ink hover:text-orange">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {site.showPhone ? (
            <a href={site.phoneHref} className="hidden font-semibold text-navy hover:text-orange xl:inline">
              {site.phoneDisplay}
            </a>
          ) : (
            <a href={site.bookingUrl} target="_blank" rel="noopener" className="hidden items-center gap-1.5 font-semibold text-navy hover:text-orange xl:inline-flex">
              <Icon name="video" className="h-5 w-5" /> Book a call
            </a>
          )}
          <ButtonLink href="/free-audit" className="whitespace-nowrap px-3 py-2 text-sm sm:px-4 sm:text-base">
            Free Audit
          </ButtonLink>
          <details className="relative lg:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md ring-1 ring-line [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Menu</span>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </summary>
            <nav aria-label="Mobile" className="absolute right-0 mt-2 w-64 rounded-lg border border-line bg-white p-2 shadow-lg">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded px-3 py-2.5 font-medium hover:bg-navy-50">
                  {l.label}
                </Link>
              ))}
              <Link href="/free-audit" className="mt-1 block rounded bg-orange px-3 py-2.5 font-semibold text-white">
                Get a Free Audit
              </Link>
              {site.showPhone ? (
                <a href={site.phoneHref} className="block rounded px-3 py-2.5 font-semibold text-navy">
                  Call {site.phoneDisplay}
                </a>
              ) : (
                <a href={site.bookingUrl} target="_blank" rel="noopener" className="block rounded px-3 py-2.5 font-semibold text-navy">
                  {site.bookingLabel}
                </a>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
