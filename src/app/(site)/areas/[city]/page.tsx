import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { aiAssistantList, checkedAssistantList, cityFromSlug, citySlug, site } from "@/lib/site";
import { businessJsonLd, faqJsonLd, type Faq } from "@/lib/structured-data";
import { buildQuestions } from "@/lib/ai-visibility/questions";
import { ButtonLink, Container, Eyebrow, PageHeader, cardHover } from "@/components/ui";
import { IconBadge, type IconName } from "@/components/Icon";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";

// One page per city in site.ts; any other city is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return site.cities.map((c) => ({ city: citySlug(c) }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const city = cityFromSlug((await params).city);
  if (!city) return {};
  return {
    title: `GEO, Websites & Reviews in ${city}, CA`,
    description: `Reputation Turbo helps ${city} contractors and home service businesses get found on Google and in AI answers from ${aiAssistantList}, with websites, Google profiles and reviews. Free online audit.`,
    alternates: { canonical: `/areas/${citySlug(city)}` },
  };
}

const services: { title: string; body: string; href: string; icon: IconName }[] = [
  { title: "Show up in AI answers (GEO)", body: `We check what ${checkedAssistantList} say when {city} customers ask for your trade, then fix what they rely on.`, href: "/ai-search", icon: "sparkle" },
  { title: "Websites with GEO included", body: "Fast, mobile-friendly websites with service pages for {city} and the areas around it, built for Google and AI search.", href: "/services", icon: "browser" },
  { title: "Google Business Profile", body: "A complete, accurate Google listing so you appear when people nearby search on Google and Maps.", href: "/services", icon: "pin" },
  { title: "Reviews & lead capture", body: "Simple ways to ask happy customers for reviews that mention {city}, and fast replies to new leads.", href: "/services", icon: "star" },
];

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const city = cityFromSlug((await params).city);
  if (!city) notFound();

  // A different mix of trades on each city page, so each page's examples are its own.
  const index = site.cities.indexOf(city);
  const trades = [0, 1, 2].map((n) => site.industries[(index * 3 + n * 4) % site.industries.length]);
  const examples = trades.map((t, n) => buildQuestions(t, city)[n % 4]);
  const others = site.cities.filter((c) => c !== city);

  const faqs: Faq[] = [
    {
      q: `Do you work with businesses in ${city}?`,
      a: `Yes. We're based in ${site.address.city} and work with contractors and home service businesses in ${city} and across San Diego County.`,
    },
    {
      q: `Can you check what AI says about my ${city} business?`,
      a: `Yes. Our free online audit asks AI assistants like ${checkedAssistantList} the questions ${city} customers ask about your trade, and shows you whether you're named and who is named instead.`,
    },
    {
      q: "Do I need a new website?",
      a: "Not necessarily. We can improve your Google profile, reviews and AI visibility with the website you have. If it's outdated or missing, every website we build includes GEO.",
    },
    {
      q: "Who owns the website and accounts?",
      a: "You do. Your domain, hosting, email and profiles are in your name and paid directly by you.",
    },
  ];

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `GEO, websites and online reputation in ${city}, CA`,
    serviceType: ["Generative engine optimization (GEO)", "Small business websites", "Google Business Profile optimization", "Online reviews"],
    areaServed: { "@type": "City", name: `${city}, CA` },
    provider: businessJsonLd(),
  };

  return (
    <>
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd(faqs)} />
      <PageHeader
        eyebrow={`Serving ${city}, CA`}
        title={`Get found in ${city}`}
        intro={`We help ${city} contractors and home service businesses show up on Google and in AI answers from ${aiAssistantList}, so more local customers find you, trust you and call.`}
      />

      <section className="py-14">
        <Container className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>How {city} customers search now</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy">They&apos;re asking AI who to hire</h2>
            <p className="mt-3 text-ink">
              Instead of scrolling through search results, more people ask {aiAssistantList} for a
              recommendation and get back a few names. If yours isn&apos;t one of them, those customers may never see you.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/free-audit?focus=ai-search">Check What AI Says About You</ButtonLink>
              <ButtonLink href="/ai-search" variant="secondary">What Is GEO?</ButtonLink>
            </div>
          </div>
          <div className="rounded-lg border-l-4 border-orange bg-navy-50 p-6">
            <p className="text-sm font-semibold text-muted">Questions {city} customers ask AI:</p>
            <ul className="mt-3 space-y-3">
              {examples.map((q) => (
                <li key={q} className="rounded-md bg-white p-3 italic text-ink shadow-sm">&ldquo;{q}&rdquo;</li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="bg-navy-50 py-14">
        <Container>
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">How we help {city} businesses</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Link key={s.title} href={s.href} className={`block rounded-xl border border-line bg-white p-6 ${cardHover}`}>
                <IconBadge name={s.icon} />
                <h3 className="mt-4 font-display text-xl font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body.replaceAll("{city}", city)}</p>
              </Link>
            ))}
          </div>
          <h3 className="mt-10 font-display text-2xl font-bold text-navy">Trades we work with</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {site.industries.map((i) => (
              <li key={i} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-navy">{i}</li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">Working with us in {city}</h2>
          <FaqList faqs={faqs} />
          <div className="mt-10 rounded-lg bg-orange p-8 text-white">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">See how your {city} business looks online</h2>
            <p className="mt-2 text-white/90">Free, personalized, and reviewed by a real person before it reaches you.</p>
            <ButtonLink href="/free-audit" variant="dark" className="mt-6">Get Your Free Audit</ButtonLink>
          </div>
          <p className="mt-8 text-sm text-muted">
            Also serving:{" "}
            {others.map((c, i) => (
              <span key={c}>
                <Link href={`/areas/${citySlug(c)}`} className="text-navy underline decoration-orange underline-offset-2 hover:text-orange">{c}</Link>
                {i < others.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </Container>
      </section>
    </>
  );
}
