import Link from "next/link";
import type { Offering } from "@/lib/offerings";
import { Icon } from "./Icon";
import { ButtonLink, cardHover, formatPrice } from "./ui";

export function priceText(o: Offering, showPrices: boolean): string | null {
  if (!showPrices) return null;
  const base = formatPrice(o.price_cents);
  if (!o.price_suffix) return o.kind === "package" ? `Starting at ${base}` : base;
  return o.price_suffix.startsWith("/") ? `${base}${o.price_suffix}` : `${base} ${o.price_suffix}`;
}

/** Packages go to the free audit with the package noted; monthly plans go to the contact form with the plan noted. */
export const ctaHref = (o: Offering) =>
  o.kind === "plan"
    ? `/contact?plan=${o.slug}`
    : `/free-audit?package=${o.slug}${o.slug.startsWith("ai-") ? "&focus=ai-search" : ""}`;

/** "Everything in X" points to X's card when it's on the same page, and says what X is when it isn't. */
function Deliverable({ text, offerings }: { text: string; offerings: Offering[] }) {
  const m = /^Everything in (.+)$/.exec(text);
  const target = m && offerings.find((o) => o.name === m[1]);
  if (!m) return <>{text}</>;
  if (target) {
    return (
      <>
        Everything in{" "}
        <Link href={`#${target.slug}`} className="font-semibold text-navy underline decoration-orange underline-offset-2">
          {target.name}
        </Link>
      </>
    );
  }
  if (m[1] === "Starter Online Presence") {
    return <>Google Business Profile, social profile and review link setup (our Starter package)</>;
  }
  return <>{text}</>;
}

export function OfferingCard({
  o,
  showPrices,
  featured = false,
  badge,
  tag,
  cta = true,
  siblings = [],
}: {
  o: Offering;
  showPrices: boolean;
  featured?: boolean;
  /** Orange tag on the top edge, like "Recommended". */
  badge?: string;
  /** Small label above the name, like "One-time project". */
  tag?: string;
  cta?: boolean;
  /** The other cards on the page, so "Everything in X" can link to X. */
  siblings?: Offering[];
}) {
  const price = priceText(o, showPrices);
  return (
    <div
      id={o.slug}
      className={`relative flex h-full scroll-mt-28 flex-col rounded-xl border bg-white p-6 text-ink ${cardHover} ${
        featured ? "border-orange ring-2 ring-orange" : "border-line"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-orange px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
          {badge}
        </span>
      )}
      {tag && <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{tag}</p>}
      <h3 className="mt-1 font-display text-2xl font-bold text-navy">{o.name}</h3>
      {o.tagline && <p className="text-sm font-semibold uppercase tracking-wide text-orange">{o.tagline}</p>}
      {price && <p className="mt-3 font-display text-3xl font-extrabold text-ink">{price}</p>}
      {o.description && <p className="mt-3 text-muted">{o.description}</p>}
      {o.deliverables.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {o.deliverables.map((d) => (
            <li key={d} className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 -skew-x-[20deg] bg-orange" />
              <span>
                <Deliverable text={d} offerings={siblings} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {o.revision_rounds != null && <p className="mt-4 text-sm text-muted">Includes {o.revision_rounds} revision rounds.</p>}
      {cta && (
        <div className="mt-auto pt-6">
          <ButtonLink href={ctaHref(o)} variant={featured ? "primary" : "dark"} className="w-full">
            {o.kind !== "plan" ? "Get My Free Audit" : o.slug === "ai-visibility-plan" ? "Add Monitoring" : "Ask About This Plan"}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

/** GEO as two steps: the one-time setup, then optional monthly monitoring. */
export function GeoSteps({ setup, plan, showPrices }: { setup?: Offering; plan?: Offering; showPrices: boolean }) {
  if (!setup && !plan) return null;
  return (
    <div className="mt-8 grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr]">
      {setup && (
        <div className="flex flex-col">
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-[0.18em] text-orange">Step 1 · One-time project</p>
          <OfferingCard o={setup} showPrices={showPrices} featured />
        </div>
      )}
      {setup && plan && (
        <div aria-hidden="true" className="flex items-center justify-center text-orange md:pt-8">
          <Icon name="arrow" className="h-10 w-10 rotate-90 md:rotate-0" />
        </div>
      )}
      {plan && (
        <div className="flex flex-col">
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-[0.18em] text-orange">Step 2 · Monthly, optional</p>
          <p className="mb-3 text-sm opacity-80">After your setup, we keep checking and improving every month.</p>
          <OfferingCard o={plan} showPrices={showPrices} />
        </div>
      )}
    </div>
  );
}

/** Monthly plans, shown as the step after a one-time project. */
export function AfterLaunch({ plans, showPrices, className = "bg-navy" }: { plans: Offering[]; showPrices: boolean; className?: string }) {
  if (plans.length === 0) return null;
  return (
    <section className={`py-16 text-white ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-orange">Step 2 · After launch</p>
        <h2 className="mt-2 font-display text-4xl font-bold">After launch, keep it working</h2>
        <p className="mt-2 max-w-2xl text-white/85">
          Monthly plans are optional and never required. Add one after launch if you want us to keep things updated for you.
        </p>
        <div className={`mt-8 grid gap-6 ${plans.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {plans.map((o) => (
            <OfferingCard key={o.id} o={o} showPrices={showPrices} tag="Monthly, optional" siblings={plans} />
          ))}
        </div>
      </div>
    </section>
  );
}
