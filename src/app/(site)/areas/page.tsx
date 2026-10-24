import type { Metadata } from "next";
import Link from "next/link";
import { citySlug, site } from "@/lib/site";
import { ButtonLink, Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Areas We Serve",
  description: "Reputation Turbo helps contractors and home service businesses across San Diego County get found on Google and in AI answers.",
};

export default function AreasPage() {
  return (
    <>
      <PageHeader
        eyebrow="Areas we serve"
        title="Local help across San Diego County"
        intro={`We're based in ${site.address.city} and work with contractors and home service businesses throughout ${site.serviceArea}.`}
      />
      <section className="py-14">
        <Container>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.cities.map((c) => (
              <li key={c}>
                <Link href={`/areas/${citySlug(c)}`} className="block rounded-lg border border-line p-5 hover:border-orange">
                  <span className="font-display text-2xl font-bold text-navy">{c}</span>
                  <span className="mt-1 block text-sm text-muted">GEO, websites, Google profiles and reviews in {c}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-muted">Somewhere else in San Diego County? We work there too.</p>
          <div className="mt-6">
            <ButtonLink href="/free-audit">Get Your Free Audit</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
