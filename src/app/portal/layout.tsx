import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Your client page", robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-50">
      <header className="bg-navy">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/portal"><Logo tone="light" className="h-8 w-auto" /></Link>
          <a href={`mailto:${site.email}`} className="text-sm font-semibold text-white/80 hover:text-white">{site.email}</a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="py-6 text-center text-xs text-muted">{site.name} · We never ask for your passwords.</footer>
    </div>
  );
}
