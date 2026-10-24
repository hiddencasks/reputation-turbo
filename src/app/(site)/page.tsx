import Link from "next/link";
import { citySlug, site } from "@/lib/site";
import { businessJsonLd, faqJsonLd, type Faq } from "@/lib/structured-data";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";

const services: { title: string; body: string; href?: string }[] = [
  {
    title: "Show up in AI answers (GEO)",
    body: "Customers now ask ChatGPT and Google's AI who to hire. We make sure those assistants know your business and can recommend it.",
    href: "/ai-search",
  },
  {
    title: "Websites with GEO included",
    body: "Fast, mobile-friendly websites built for Google and AI search: clear services, real photos of your work, and click-to-call on every page.",
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
  { n: "1", title: "Free online audit", body: "We review your website, Google listing, social profiles and what AI assistants say about you, and show you what's working and what to fix, with evidence." },
  { n: "2", title: "A clear plan", body: "You get a straightforward recommendation and price. Your domain, hosting and email costs are listed separately and paid directly by you." },
  { n: "3", title: "We build and launch", body: "We set it up, you review and approve, and we launch. You own every account when we're done." },
];

// Common questions, shown on the page and published as structured data for AI tools to quote.
const faqs: Faq[] = [
  {
    q: "What does the free online audit include?",
    a: "We review your website, Google Business Profile, social profiles and reviews, and ask AI assistants like ChatGPT the questions your customers ask to see whether they recommend you. A real person checks every finding before it reaches you, and it's free with no obligation.",
  },
  {
    q: "What is GEO, and do I need it?",
    a: "GEO (generative engine optimization) is making sure AI assistants can find your business, describe it correctly and recommend it. More customers now ask AI who to hire, so if you rely on local customers finding you, it's worth checking where you stand. Every website we build includes it.",
  },
  {
    q: "Do I need a new website?",
    a: "Not necessarily. If your current site works, we can improve your Google profile, reviews and AI visibility without rebuilding it. If it's outdated or missing, our website packages include GEO from day one.",
  },
  {
    q: "How much does it cost?",
    a: "Every package has a clear, upfront price, and your domain, hosting and email costs are listed separately and paid directly by you. See Services & Pricing, or start with the free audit and we'll recommend the right package.",
  },
  {
    q: "Do I own my website and accounts?",
    a: "Yes. Your domain, hosting, business email, Google profile and social accounts are in your name, so you stay in control even if you stop working with us.",
  },
  {
    q: "Can you guarantee I'll be number one on Google or ChatGPT?",
    a: "No, and nobody honestly can. We fix the things search engines and AI assistants rely on, show you the evidence, and track whether it's working.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={businessJsonLd()} />
      <JsonLd data={faqJsonLd(faqs)} />
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 h-full w-1/2 -skew-x-[20deg] bg-gradient-to-l from-orange/25 to-transparent" />
        <Container className="relative py-16 sm:py-24">
          <Eyebrow>San Diego County · East County</Eyebrow>
          <h1 className="mt-3 max-w-3xl font-display text-5xl font-extrabold italic uppercase leading-[0.95] sm:text-7xl">
            Get Found. <span className="text-orange">Build Trust.</span> Grow Your Business.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85 sm:text-xl">
            Reputation Turbo helps contractors and home service businesses get found on Google and in AI answers like ChatGPT,
            with websites built for both, complete Google profiles and steady streams of reviews.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/free-audit" className="text-lg">Get Your Free Online Audit</ButtonLink>
            <ButtonLink href={site.phoneHref} variant="ghostLight" className="text-lg">Call {site.phoneDisplay}</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="bg-navy-50 py-16 sm:py-20">
        <Container className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>The new way customers search</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold text-navy">Customers are asking AI who to hire. Are you in the answer?</h2>
            <p className="mt-4 text-ink">
              Instead of scrolling through search results, more people now ask ChatGPT or Google&apos;s AI answers for a
              recommendation and get back just a few names. Making sure your business is one of them is called{" "}
              <strong>GEO</strong>, generative engine optimization. It&apos;s built into every website we make, and available on
              its own if you don&apos;t need a new website.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/ai-search">Learn About GEO</ButtonLink>
              <ButtonLink href="/free-audit?focus=ai-search" variant="secondary">Check What AI Says About You</ButtonLink>
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-muted">A customer asks:</p>
            <p className="mt-1 rounded-md bg-navy-50 p-3 italic text-ink">&ldquo;Who&apos;s the best plumber in El Cajon?&rdquo;</p>
            <p className="mt-4 text-sm font-semibold text-muted">The AI answers with a short list. Is your business on it?</p>
            <ul className="mt-2 space-y-2">
              {["Business A", "Business B", "Your business?"].map((b, i) => (
                <li key={b} className={`flex items-center gap-3 rounded-md border p-3 ${i === 2 ? "border-orange font-semibold text-orange" : "border-line text-ink"}`}>
                  <span className="font-display text-xl font-extrabold italic">{i + 1}</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Everything customers check before they call you</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <div key={s.title} className="rounded-lg border border-line p-6">
                <div className="h-1 w-10 -skew-x-[30deg] bg-orange" />
                <h3 className="mt-4 font-display text-2xl font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-muted">{s.body}</p>
                {s.href && (
                  <Link href={s.href} className="mt-3 inline-block font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4 hover:text-orange">
                    Learn about AI search
                  </Link>
                )}
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
            <p className="mt-6 text-muted">
              Serving{" "}
              {site.cities.map((c, i) => (
                <span key={c}>
                  <Link href={`/areas/${citySlug(c)}`} className="text-navy underline decoration-orange underline-offset-2 hover:text-orange">{c}</Link>
                  {i < site.cities.length - 1 ? ", " : ""}
                </span>
              ))}{" "}
              and the rest of San Diego County.
            </p>
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

      <section className="bg-navy-50 py-16 sm:py-20">
        <Container>
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Common questions</h2>
          <FaqList faqs={faqs} />
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
