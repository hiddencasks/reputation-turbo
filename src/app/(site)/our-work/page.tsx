import type { Metadata } from "next";
import { ButtonLink, Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Our Work",
  description: "Website and online presence projects by Reputation Turbo.",
};

export default function OurWorkPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our work"
        title="Projects"
        intro="We're a new agency, and our first client projects are underway. We'll share them here, with each owner's permission, as they launch."
      />
      <section className="py-14">
        <Container>
          <div className="rounded-lg border-2 border-dashed border-line p-10 text-center">
            <h2 className="font-display text-3xl font-bold text-navy">Demonstration sites coming soon</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              We&apos;re building sample websites for local trades so you can see our approach. Each one will be clearly labeled
              as a demonstration, not a client project.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/free-audit">Get a Free Audit</ButtonLink>
              <ButtonLink href="/contact" variant="secondary">Talk to Us</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
