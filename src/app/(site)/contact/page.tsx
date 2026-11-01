import type { Metadata } from "next";
import { addressOneLine, site } from "@/lib/site";
import { getOfferings } from "@/lib/offerings";
import { ContactForm } from "@/components/forms";
import { Icon } from "@/components/Icon";
import { ButtonLink, Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Book a call, email or message Reputation Turbo in Spring Valley, CA.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ plan?: string | string[] }> }) {
  // Monthly plan buttons link here with ?plan=<slug> and the message starts with that plan.
  const slug = (await searchParams).plan;
  const plan = typeof slug === "string" ? (await getOfferings({ activeOnly: true })).find((o) => o.slug === slug) : undefined;
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Let's talk"
        intro={
          site.showPhone
            ? "Questions about a project or our services? Send a message or give us a call."
            : "Questions about a project or our services? Send a message or book a quick video call."
        }
      />
      <section className="py-14">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            {site.showPhone ? (
              <div>
                <h2 className="font-display text-xl font-bold text-navy">Phone</h2>
                <a href={site.phoneHref} className="text-2xl font-semibold text-orange hover:underline">{site.phoneDisplay}</a>
              </div>
            ) : (
              <div>
                <h2 className="font-display text-xl font-bold text-navy">Video call</h2>
                <p className="mt-1 text-muted">Pick a time that works for you. It takes 15 minutes.</p>
                <ButtonLink href={site.bookingUrl} target="_blank" rel="noopener" className="mt-3">
                  <Icon name="video" className="h-5 w-5" /> {site.bookingLabel}
                </ButtonLink>
              </div>
            )}
            <div>
              <h2 className="font-display text-xl font-bold text-navy">Email</h2>
              <a href={`mailto:${site.email}`} className="text-lg hover:text-orange">{site.email}</a>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-navy">Mailing address</h2>
              <p>{addressOneLine}</p>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-navy">Worked with us?</h2>
              <p className="mt-1 text-muted">A quick Google review helps other local business owners find us. Thank you!</p>
              <ButtonLink href="/review" prefetch={false} target="_blank" rel="noopener" variant="secondary" className="mt-3">
                <Icon name="star" className="h-5 w-5" /> Leave us a Google review
              </ButtonLink>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-navy">Service area</h2>
              <p>{site.cities.join(", ")} and the rest of San Diego County.</p>
            </div>
          </div>
          <div className="rounded-lg border border-line p-6 shadow-sm sm:p-8">
            <ContactForm message={plan ? `I'm interested in the ${plan.name} monthly plan.` : undefined} />
          </div>
        </Container>
      </section>
    </>
  );
}
