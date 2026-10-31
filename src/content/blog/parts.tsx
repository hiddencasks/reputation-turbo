import Link from "next/link";
import type { ReactNode } from "react";

/** A highlighted tip or example inside a post. */
export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="rounded-lg border-l-4 border-orange bg-navy-50 p-5 not-italic">
      {title && <p className="font-display text-lg font-bold text-navy">{title}</p>}
      <div className="mt-1 space-y-2">{children}</div>
    </aside>
  );
}

/** A question a customer might type into an AI assistant. */
export function AskExample({ children }: { children: ReactNode }) {
  return <li className="rounded-md bg-white p-3 italic text-ink shadow-sm">&ldquo;{children}&rdquo;</li>;
}

/** Link to another page on the site. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-navy decoration-orange underline-offset-2 hover:text-orange">
      {children}
    </Link>
  );
}
