import type { Metadata } from "next";
import { ButtonLink, Container, PageHeader } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

// Where Stripe sends people after they pay.
export default function ThankYouPage() {
  return (
    <>
      <PageHeader eyebrow="Payment received" title="Thank you!" intro="Your payment went through, and Stripe is emailing you a receipt." />
      <section className="py-14">
        <Container className="max-w-2xl space-y-4 text-lg">
          <p>
            {site.founderFirstName} will email you within 1 business day with a link to your private client page. It has a short
            checklist (a few questions, a place for your logo and photos, and easy account steps) so we can get started.
          </p>
          <p>Want to talk it through sooner? Book a quick video call any time.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink href={site.bookingUrl}>Book a 15-min video call</ButtonLink>
            <ButtonLink href="/" variant="secondary">Back to the homepage</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
