import { site } from "@/lib/site";
import type { Faq } from "@/lib/structured-data";
import { Icon } from "./Icon";
import { ButtonLink } from "./ui";

/**
 * Questions that open on click, with a "Still have questions?" box beside them.
 * Closed answers are still in the page, so search engines and AI tools read them all.
 */
export function FaqList({ faqs, aside = true }: { faqs: Faq[]; aside?: boolean }) {
  return (
    <div className={`mt-6 grid gap-6 ${aside ? "lg:grid-cols-[1.7fr_1fr] lg:items-start" : ""}`}>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {faqs.map((f, i) => (
          <details key={f.q} open={i === 0} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-navy-50 sm:px-6 [&::-webkit-details-marker]:hidden">
              <h3 className="font-display text-xl font-bold text-navy">{f.q}</h3>
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange/10 text-2xl leading-none text-orange transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="px-5 pb-5 text-muted sm:px-6">{f.a}</p>
          </details>
        ))}
      </div>
      {aside && <StillHaveQuestions />}
    </div>
  );
}

export function StillHaveQuestions() {
  return (
    <aside className="rounded-xl bg-navy p-6 text-white sm:p-8">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-orange">
        <Icon name="chat" />
      </span>
      <h3 className="mt-4 font-display text-2xl font-bold">Still have questions?</h3>
      <p className="mt-2 text-white/80">
        Book a quick video call and talk it through, or start with a free audit and see exactly where you stand.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {site.showPhone ? (
          <ButtonLink href={site.phoneHref}>Call {site.phoneDisplay}</ButtonLink>
        ) : (
          <ButtonLink href={site.bookingUrl} target="_blank" rel="noopener">
            <Icon name="video" className="h-5 w-5" /> {site.bookingLabel}
          </ButtonLink>
        )}
        <ButtonLink href="/free-audit" variant="ghostLight">Get a Free Audit</ButtonLink>
      </div>
      <p className="mt-4 text-sm text-white/60">
        Or email <a href={`mailto:${site.email}`} className="underline hover:text-white">{site.email}</a>
      </p>
    </aside>
  );
}
