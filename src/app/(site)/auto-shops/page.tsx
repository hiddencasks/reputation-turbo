import type { Metadata } from "next";
import Link from "next/link";
import { aiAssistantList, checkedAssistantList, citySlug, site } from "@/lib/site";
import { businessJsonLd, faqJsonLd, type Faq } from "@/lib/structured-data";
import { buildQuestions } from "@/lib/ai-visibility/questions";
import { ButtonLink, Container, Eyebrow, PageHeader, cardHover } from "@/components/ui";
import { IconBadge, type IconName } from "@/components/Icon";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";

// The second group we serve after contractors and home services: smog, repair and tire shops.
// Add a case study section here once a client's results are live and they've agreed to be named.

export const metadata: Metadata = {
  title: "Google, Reviews & AI Search for Auto Shops in San Diego County",
  description: `Reputation Turbo helps San Diego County smog check stations, auto repair shops and tire shops get found on Google, Maps and in AI answers from ${aiAssistantList}. Free online audit.`,
  alternates: { canonical: "/auto-shops" },
};

// Drivers usually need a shop today, so what they check first is different from a homeowner hiring a contractor.
const checks: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Are you open right now?",
    body: "Hours, holiday hours and walk-in or appointment details on Google, kept current so drivers don't show up to a locked door.",
    icon: "calendar",
  },
  {
    title: "What will it cost?",
    body: "Clear prices and specials on your website and Google profile, like smog check prices by vehicle year or a tire install special.",
    icon: "search",
  },
  {
    title: "Can I trust this shop?",
    body: "Steady, recent reviews that mention the service and the city, with replies from the owner. A simple way to ask every happy customer.",
    icon: "star",
  },
  {
    title: "Is it close and easy to find?",
    body: "An accurate pin, directions, photos of the storefront and the bays, and service pages for the cities your customers drive in from.",
    icon: "pin",
  },
];

const services: { title: string; body: string; href: string; icon: IconName }[] = [
  {
    title: "Google Business Profile",
    body: "The right categories, every service with its price, hours, photos and weekly posts, so you show up on Google and Maps for the searches that matter.",
    href: "/services",
    icon: "pin",
  },
  {
    title: "Reviews that keep coming",
    body: "A review link and QR card for the counter, plus request texts your staff can send after every job.",
    href: "/services",
    icon: "star",
  },
  {
    title: "A website that works on phones",
    body: "Prices, specials, hours and one-tap call and directions, with GEO included so Google and AI assistants understand what you offer.",
    href: "/services",
    icon: "browser",
  },
  {
    title: "Show up in AI answers (GEO)",
    body: `We check what ${checkedAssistantList} say when drivers ask for a shop near them, then fix what they rely on.`,
    href: "/ai-search",
    icon: "sparkle",
  },
];

const faqs: Faq[] = [
  {
    q: "Do you work with auto shops?",
    a: `Yes. Along with contractors and home service pros, we work with smog check stations, auto repair shops, tire shops and other local auto businesses across ${site.serviceArea}.`,
  },
  {
    q: "How do drivers find a smog check or repair shop now?",
    a: `Most search on Google or Maps, and more of them ask AI assistants like ${aiAssistantList} for a shop near them. They usually pick from the first few names they see, based on reviews, hours, price and distance.`,
  },
  {
    q: "Should I put my prices online?",
    a: "For services with a set price, like a smog check or a tire install, showing the price usually helps. Drivers comparing shops tend to call the one that answers their question before they ask it. We'll recommend what to show based on your shop.",
  },
  {
    q: "Can you check what AI says about my shop?",
    a: `Yes. Our free online audit asks ${checkedAssistantList} the questions your customers ask, shows whether your shop is named and who is named instead, and checks your website, Google profile and reviews.`,
  },
  {
    q: "Do I need a new website?",
    a: "Not necessarily. Many shops get more calls just from a complete Google profile and steady reviews. If your site is missing, outdated or hard to use on a phone, every website we build includes GEO.",
  },
  {
    q: "Who owns the website and accounts?",
    a: "You do. Your domain, hosting, email and profiles are in your name and paid directly by you, and your website stays up and stays yours, with or without a monthly plan.",
  },
];

export default function AutoShopsPage() {
  const examples = [
    "Where can I get a smog check in El Cajon, CA on a Saturday?",
    buildQuestions("Auto repair shops", "La Mesa")[1],
    buildQuestions("Tire shops", "Santee")[0],
  ];

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Local marketing for auto shops in San Diego County",
    serviceType: ["Google Business Profile optimization", "Online reviews", "Web design", "Generative engine optimization (GEO)"],
    audience: { "@type": "BusinessAudience", audienceType: "Smog check stations, auto repair shops and tire shops" },
    areaServed: { "@type": "AdministrativeArea", name: "San Diego County, CA" },
    provider: businessJsonLd(),
  };

  return (
    <>
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd(faqs)} />
      <PageHeader
        eyebrow="Smog · Repair · Tires"
        title="Get your auto shop found"
        intro={`We help smog check stations, auto repair shops and tire shops across San Diego County show up on Google, Maps and in AI answers from ${aiAssistantList}, so more drivers pick your shop.`}
      />

      <section className="py-14">
        <Container className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>How drivers search now</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy">They need a shop today, not next week</h2>
            <p className="mt-3 text-ink">
              Someone with a registration notice or a flat tire picks from the first few shops they see. More of them ask AI
              assistants for a recommendation and get back two or three names. If your shop isn&apos;t one of them, that driver
              goes down the street.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/free-audit?trade=Auto%20repair%20shops">Get Your Free Turbo Score</ButtonLink>
              <ButtonLink href="/free-audit?focus=ai-search" variant="secondary">Check What AI Says About You</ButtonLink>
            </div>
          </div>
          <div className="rounded-lg border-l-4 border-orange bg-navy-50 p-6">
            <p className="text-sm font-semibold text-muted">Questions drivers ask AI:</p>
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
          <Eyebrow>What drivers check</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">Four questions before they pull in</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {checks.map((c) => (
              <div key={c.title} className="rounded-xl border border-line bg-white p-6">
                <IconBadge name={c.icon} />
                <h3 className="mt-4 font-display text-xl font-bold text-navy">{c.title}</h3>
                <p className="mt-2 text-sm text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">How we help auto shops</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Link key={s.title} href={s.href} className={`block rounded-xl border border-line bg-white p-6 ${cardHover}`}>
                <IconBadge name={s.icon} />
                <h3 className="mt-4 font-display text-xl font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </Link>
            ))}
          </div>
          <h3 className="mt-10 font-display text-2xl font-bold text-navy">Shops we work with</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {site.autoIndustries.map((i) => (
              <li key={i}>
                <Link
                  href={`/free-audit?trade=${encodeURIComponent(i)}`}
                  className="block rounded-full bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy transition hover:-translate-y-0.5 hover:bg-orange hover:text-white"
                >
                  {i}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/free-audit?trade=Other"
                className="block rounded-full bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy transition hover:-translate-y-0.5 hover:bg-orange hover:text-white"
              >
                Other auto services
              </Link>
            </li>
          </ul>
        </Container>
      </section>

      <section className="bg-navy-50 py-14">
        <Container>
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">Common questions from shop owners</h2>
          <FaqList faqs={faqs} />
          <div className="mt-10 rounded-lg bg-orange p-8 text-white">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">See how your shop looks online</h2>
            <p className="mt-2 text-white/90">Free, personalized, and reviewed by a real person before it reaches you.</p>
            <ButtonLink href="/free-audit?trade=Auto%20repair%20shops" variant="dark" className="mt-6">Get Your Free Turbo Score</ButtonLink>
          </div>
          <p className="mt-8 text-sm text-muted">
            Serving auto shops in{" "}
            {site.cities.map((c, i) => (
              <span key={c}>
                <Link href={`/areas/${citySlug(c)}`} className="text-navy underline decoration-orange underline-offset-2 hover:text-orange">{c}</Link>
                {i < site.cities.length - 1 ? ", " : ""}
              </span>
            ))}{" "}
            and the rest of San Diego County.
          </p>
        </Container>
      </section>
    </>
  );
}
