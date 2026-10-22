import Link from "next/link";
import { site } from "@/lib/site";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";

const services = [
  {
    title: "Websites that win jobs",
    body: "Fast, mobile-friendly websites built around how your customers search and call: clear services, real photos of your work, and click-to-call on every page.",
  },
  {
    title: "Google Business Profile & local SEO",
    body: "Complete, accurate Google listings and service pages for the cities you work in, so nearby customers find you before your competitors.",
  },
  {
    title: "Reviews & lead capture",
    body: "Simple review request systems, contact forms that reach you, and fast responses to new leads, so good work turns into more work.",
  },
];

const steps = [
  { n: "1", title: "Free online audit", body: "We review your website, Google listing and social profiles, and show you what's working and what to fix, with evidence." },
  { n: "2", title: "A clear plan", body: "You get a straightforward recommendation and price. Your domain, hosting and email costs are listed separately and paid directly by you." },
  { n: "3", title: "We build and launch", body: "We set it up, you review and approve, and we launch. You own every account when we're done." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 h-full w-1/2 -skew-x-[20deg] bg-gradient-to-l from-orange/25 to-transparent" />
        <Container className="relative py-16 sm:py-24">
          <Eyebrow>San Diego County · East County</Eyebrow>
          <h1 className="mt-3 max-w-3xl font-display text-5xl font-extrabold italic uppercase leading-[0.95] sm:text-7xl">
            Get Found. <span className="text-orange">Build Trust.</span> Grow Your Business.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85 sm:text-xl">
            Reputation Turbo helps contractors and home service businesses look as good online as their work does in person,
            with professional websites, complete Google profiles and steady streams of reviews.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/free-audit" className="text-lg">Get Your Free Online Audit</ButtonLink>
            <ButtonLink href={site.phoneHref} variant="ghostLight" className="text-lg">Call {site.phoneDisplay}</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Everything customers check before they call you</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className="rounded-lg border border-line p-6">
                <div className="h-1 w-10 -skew-x-[30deg] bg-orange" />
                <h3 className="mt-4 font-display text-2xl font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-muted">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8">
            <Link href="/services" className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4 hover:text-orange">
              See all services and packages
            </Link>
          </p>
        </Container>
      </section>

      <section className="bg-navy-50 py-16 sm:py-20">
        <Container>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Three steps, no guesswork</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-lg bg-white p-6 shadow-sm">
                <span className="font-display text-5xl font-extrabold italic text-orange">{s.n}</span>
                <h3 className="mt-2 font-display text-2xl font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="grid gap-12 md:grid-cols-2">
          <div>
            <Eyebrow>Who we help</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold text-navy">Built for local service businesses</h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {site.industries.map((i) => (
                <li key={i} className="rounded-full bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy">{i}</li>
              ))}
            </ul>
            <p className="mt-6 text-muted">Serving {site.cities.join(", ")} and the rest of San Diego County.</p>
          </div>
          <div className="rounded-lg border-l-4 border-orange bg-navy-50 p-8">
            <h2 className="font-display text-3xl font-bold text-navy">You own everything</h2>
            <p className="mt-3 text-ink">
              Your domain, website hosting, business email, Google profile and social accounts are in your name and paid
              directly by you. We charge only for our work, and we list third-party costs separately so there are no surprises.
            </p>
            <h2 className="mt-8 font-display text-3xl font-bold text-navy">Straight talk</h2>
            <p className="mt-3 text-ink">
              We&apos;re a new San Diego agency, so you won&apos;t see made-up testimonials or inflated promises here. Our audits
              stick to what we can verify, and we explain every recommendation in plain English.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-orange py-14 text-white">
        <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold italic uppercase">See how your business looks online</h2>
            <p className="mt-2 text-lg text-white/90">Free, personalized, and reviewed by a real person before it reaches you.</p>
          </div>
          <ButtonLink href="/free-audit" variant="dark" className="text-lg">Get Your Free Audit</ButtonLink>
        </Container>
      </section>
    </>
  );
}
