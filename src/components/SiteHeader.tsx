import Link from "next/link";
import { site } from "@/lib/site";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { DesktopNav, MobileMenu } from "./SiteNav";
import { ButtonLink } from "./ui";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0">
          <Logo className="h-8 w-auto sm:h-12" />
        </Link>

        <DesktopNav />

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
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
