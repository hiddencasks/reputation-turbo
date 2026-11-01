import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads / CRM" },
  { href: "/admin/leads/new", label: "Add a lead" },
  { href: "/admin/finder", label: "Find prospects" },
  { href: "/admin/social", label: "Social posts" },
  { href: "/admin/pricing", label: "Pricing" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOwner();
  return (
    <div className="flex min-h-screen flex-col bg-navy-50 md:flex-row">
      <aside className="bg-navy text-white md:w-60 md:shrink-0">
        <div className="flex items-center justify-between gap-4 p-4 md:block">
          <Link href="/admin"><Logo tone="light" className="h-8 w-auto" /></Link>
          <p className="hidden truncate text-xs text-white/60 md:mt-2 md:block">{session.email}</p>
        </div>
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:pb-0">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded px-3 py-2 text-sm font-medium hover:bg-white/10">
              {n.label}
            </Link>
          ))}
          <Link href="/" className="whitespace-nowrap rounded px-3 py-2 text-sm text-white/70 hover:bg-white/10">View website</Link>
          <form action={logout}>
            <button className="w-full whitespace-nowrap rounded px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10">Sign out</button>
          </form>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
