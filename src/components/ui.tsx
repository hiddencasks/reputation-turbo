import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-base font-semibold transition-colors disabled:opacity-60";
const variants = {
  primary: "bg-orange text-white hover:bg-orange-600",
  secondary: "bg-white text-navy ring-1 ring-inset ring-navy/20 hover:bg-navy-50",
  dark: "bg-navy text-white hover:bg-navy-800",
  ghostLight: "text-white ring-1 ring-inset ring-white/40 hover:bg-white/10",
};
export type ButtonVariant = keyof typeof variants;

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link {...props} className={`${base} ${variants[variant]} ${className}`} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button {...props} className={`${base} ${variants[variant]} ${className}`} />;
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-orange">{children}</p>;
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: ReactNode }) {
  return (
    <section className="bg-navy text-white">
      <Container className="py-14 sm:py-20">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-2 font-display text-4xl font-extrabold italic uppercase sm:text-5xl">{title}</h1>
        {intro && <div className="mt-4 max-w-2xl text-lg text-white/85">{intro}</div>}
      </Container>
    </section>
  );
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;
}

/** Lift and orange border on hover, shared by every card that should react to the mouse. */
export const cardHover = "transition duration-200 hover:-translate-y-1 hover:border-orange hover:shadow-lg hover:ring-1 hover:ring-orange";
