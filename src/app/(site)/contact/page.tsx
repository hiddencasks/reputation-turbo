import type { Metadata } from "next";
import { addressOneLine, site } from "@/lib/site";
import { ContactForm } from "@/components/forms";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, email or message Reputation Turbo in Spring Valley, CA.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Let's talk" intro="Questions about a project or our services? Send a message or give us a call." />
      <section className="py-14">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-navy">Phone</h2>
              <a href={site.phoneHref} className="text-2xl font-semibold text-orange hover:underline">{site.phoneDisplay}</a>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-navy">Email</h2>
              <a href={`mailto:${site.email}`} className="text-lg hover:text-orange">{site.email}</a>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-navy">Mailing address</h2>
              <p>{addressOneLine}</p>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-navy">Service area</h2>
              <p>{site.cities.join(", ")} and the rest of San Diego County.</p>
            </div>
          </div>
          <div className="rounded-lg border border-line p-6 shadow-sm sm:p-8">
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  );
}
