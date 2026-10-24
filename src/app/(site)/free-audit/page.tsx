import type { Metadata } from "next";
import { AuditForm } from "@/components/forms";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Free Online Audit",
  description: "Get a free, personalized review of your website, Google listing and online reputation from Reputation Turbo.",
};

const checks = [
  "Website: loads properly, works on phones, speed, security (HTTPS) and contact options",
  "Search basics: page titles and descriptions Google shows",
  "Google listing: business details, website link, phone, reviews and rating",
  "Social profiles: whether they're easy to find and consistent",
  "Lead capture: how easy it is for a customer to reach you",
  "AI search: whether ChatGPT and Google's AI answers mention you when customers ask for your service nearby",
];

export default function FreeAuditPage() {
  return (
    <>
      <PageHeader
        eyebrow="Free online audit"
        title="See how customers see you"
        intro="Tell us about your business and we'll send a personalized audit of your online presence. It's free, with no obligation."
      />
      <section className="py-14">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-3xl font-bold text-navy">What we check</h2>
            <ul className="mt-4 space-y-3">
              {checks.map((c) => (
                <li key={c} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 -skew-x-[20deg] bg-orange" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <h2 className="mt-10 font-display text-3xl font-bold text-navy">What you get</h2>
            <p className="mt-3 text-muted">
              Your strengths, your biggest opportunities, and the evidence behind each one, followed by practical next steps.
              A real person reviews every audit before it&apos;s sent, and we never make up numbers.
            </p>
          </div>
          <div className="rounded-lg border border-line p-6 shadow-sm sm:p-8">
            <AuditForm />
          </div>
        </Container>
      </section>
    </>
  );
}
