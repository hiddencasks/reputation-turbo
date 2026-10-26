"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { navLinks } from "@/lib/nav";
import { site } from "@/lib/site";


function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
      {navLinks.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 py-1 font-medium hover:text-orange ${active ? "border-orange text-navy" : "border-transparent text-ink"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone menu. Marks the page you're on and closes itself after you pick a page. */
export function MobileMenu() {
  const pathname = usePathname() ?? "";
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);

  const onAudit = isActive(pathname, "/free-audit");

  return (
    <details ref={ref} className="relative lg:hidden">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md ring-1 ring-line [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Menu</span>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </summary>
      <nav aria-label="Mobile" className="absolute right-0 mt-2 w-64 rounded-lg border border-line bg-white p-2 shadow-lg">
        {navLinks.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded border-l-4 px-3 py-2.5 ${
                active ? "border-orange bg-navy-50 font-bold text-navy" : "border-transparent font-medium hover:bg-navy-50"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        <div className="my-2 border-t border-line" />
        <Link
          href="/free-audit"
          aria-current={onAudit ? "page" : undefined}
          className={`block rounded-md border-2 border-orange px-3 py-2 text-center font-semibold ${
            onAudit ? "bg-orange text-white" : "text-orange-600 hover:bg-orange hover:text-white"
          }`}
        >
          Get a Free Audit
        </Link>
        {site.showPhone ? (
          <a href={site.phoneHref} className="block rounded px-3 py-2.5 text-center font-semibold text-navy">
            Call {site.phoneDisplay}
          </a>
        ) : (
          <a href={site.bookingUrl} target="_blank" rel="noopener" className="block rounded px-3 py-2.5 text-center font-semibold text-navy">
            {site.bookingLabel}
          </a>
        )}
      </nav>
    </details>
  );
}
