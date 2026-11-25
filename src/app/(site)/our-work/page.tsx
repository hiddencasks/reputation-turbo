import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Container, Eyebrow, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Our Work",
  description: "Real website, Google profile and AI search projects by Reputation Turbo for local businesses in San Diego County, shared with each owner's permission.",
  alternates: { canonical: "/our-work" },
};

// Real client projects only, each shared with the owner's permission. Add "after" numbers once a re-audit is done.
const projects = [
  {
    name: "Smoggy Joe's",
    kind: "Smog check station · San Diego",
    image: { src: "/images/case-smoggy-joes.jpg", alt: "The new Smoggy Joe's website: Honest smog checks. Free retest if you don't pass.", width: 1280, height: 730 },
    summary:
      "A STAR Certified smog station on Market St. with a 4.9-star Google rating, but no website and no mention in AI answers.",
    done: ["New website at smoggyjoes.com", "Business email on its own domain", "Every Google review replied to", "Bing, Yelp and Apple Maps fixed", "Review QR card for the counter"],
    before: "Before: no website, named in 0 of 16 AI answers",
    after: "After: 30-day re-check coming in late December",
    caseStudy: "/auto-shops#case-study",
    site: "https://smoggyjoes.com",
  },
];

export default function OurWorkPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our work"
        title="Real projects for local businesses"
        intro="Websites, Google profiles, reviews and AI search work for local businesses in San Diego County. Every project here is shared with the owner's permission."
      />
      <section className="py-14">
        <Container className="grid gap-8">
          {projects.map((p) => (
            <article key={p.name} className="grid overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-[1.1fr_1fr]">
              <a href={p.site} target="_blank" rel="noopener" className="group flex items-center bg-navy-50 p-4 sm:p-6">
                <Image src={p.image.src} alt={p.image.alt} width={p.image.width} height={p.image.height} sizes="(min-width: 1024px) 600px, 100vw" className="w-full rounded-lg shadow-lg ring-1 ring-line transition duration-500 group-hover:scale-[1.02]" />
              </a>
              <div className="p-6 sm:p-8">
                <Eyebrow>{p.kind}</Eyebrow>
                <h2 className="mt-2 font-display text-3xl font-bold text-navy">{p.name}</h2>
                <p className="mt-3 text-ink">{p.summary}</p>
                <ul className="mt-4 grid gap-2 text-sm text-ink sm:grid-cols-2">
                  {p.done.map((d) => (
                    <li key={d} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-orange" />{d}</li>
                  ))}
                </ul>
                <div className="mt-5 rounded-lg bg-navy-50 p-4 text-sm">
                  <p className="font-semibold text-navy">{p.before}</p>
                  <p className="mt-1 text-muted">{p.after}</p>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={p.caseStudy}>Read the case study</ButtonLink>
                  <ButtonLink href={p.site} target="_blank" rel="noopener" variant="secondary">Visit the site</ButtonLink>
                </div>
              </div>
            </article>
          ))}

          <div className="rounded-2xl bg-navy p-8 text-white sm:p-10">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">Want to see where your business stands?</h2>
            <p className="mt-2 max-w-2xl text-white/85">
              Every project starts the same way: a free audit of your website, Google profile, reviews and what AI assistants say
              about you. <Link href="/auto-shops" className="underline decoration-orange underline-offset-2 hover:text-orange">See how we help auto shops</Link>.
            </p>
            <ButtonLink href="/free-audit" className="mt-6">Get Your Free Turbo Score</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
