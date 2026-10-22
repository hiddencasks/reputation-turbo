import type { Metadata } from "next";
import { site } from "@/lib/site";
import { ButtonLink, Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "About Us",
  description: "Reputation Turbo is a digital presence agency in Spring Valley serving contractors and home service businesses across San Diego County.",
};

const principles = [
  { title: "Honest audits", body: "We only report what we can verify. No invented rankings, traffic numbers or scare tactics." },
  { title: "You own it", body: "Your domain, hosting, email and profiles stay in your name and on your bill. We work with delegated access, never your passwords." },
  { title: "Plain English", body: "Every recommendation comes with a reason you can understand and a price you know upfront." },
  { title: "Built to be fast", body: "We use modern tools, including AI, to do the heavy lifting, and a person reviews every deliverable before you see it." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="A local agency for local businesses"
        intro={`${site.name} is a new digital presence and online reputation agency based in ${site.address.city}, serving ${site.serviceArea}.`}
      />
      <section className="py-14">
        <Container className="grid gap-12 md:grid-cols-2">
          <div className="space-y-4 text-lg">
            <p>
              Many of the best contractors and service companies around San Diego are busy doing great work, and their online
              presence hasn&apos;t kept up. An outdated website, an incomplete Google listing or a handful of reviews can send
              customers to a competitor before they ever call.
            </p>
            <p>
              We started {site.name} to fix that. We build professional websites, set up and improve Google Business Profiles,
              tidy up social profiles, and put simple systems in place to collect reviews and respond to new leads.
            </p>
            <p className="font-display text-2xl italic text-navy">{site.tagline}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map((p) => (
              <div key={p.title} className="rounded-lg border border-line p-5">
                <h2 className="font-display text-xl font-bold text-navy">{p.title}</h2>
                <p className="mt-1 text-sm text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
        <Container className="mt-12">
          <ButtonLink href="/free-audit">Get Your Free Online Audit</ButtonLink>
        </Container>
      </section>
    </>
  );
}
