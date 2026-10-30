import Image from "next/image";
import Link from "next/link";
import { aiAssistantList, checkedAssistantList, citySlug, site } from "@/lib/site";
import { getShowPrices } from "@/lib/offerings";
import { photos } from "@/lib/photos";
import { businessJsonLd, faqJsonLd, type Faq } from "@/lib/structured-data";
import { FaqList } from "@/components/FaqList";
import { Icon, IconBadge, type IconName } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { AiChatDemo, AiRow, AuditPreview, LaunchPreview, PlanPreview, StepFlow } from "@/components/marketing";
import { ButtonLink, Container, Eyebrow, cardHover } from "@/components/ui";
import { HeroScorecard } from "@/components/HeroVisuals";

// Reads the "Show prices" setting for the pricing question.
export const dynamic = "force-dynamic";

// What customers check before they call, in the order they usually do it, and how we help with each.
const services: { check: string; body: string; icon: IconName; href: string; link: string }[] = [
  {
    check: "They ask AI who to hire",
    body: `We make sure ${aiAssistantList} know your business and recommend it.`,
    icon: "sparkle",
    href: "/ai-search",
    link: "How AI search works",
  },
  {
    check: "They look you up on Google",
    body: "We complete your Google Business Profile and add service pages for every city you work in.",
    icon: "pin",
    href: "/services",
    link: "Google & local SEO",
  },
  {
    check: "They read your reviews",
    body: "We set up simple review requests so happy customers leave fresh, specific reviews.",
    icon: "star",
    href: "/services",
    link: "Review systems",
  },
  {
    check: "They visit your website and call",
    body: "We build a new site or upgrade yours so it's fast, works on phones, and makes calling or booking one tap.",
    icon: "browser",
    href: "/services",
    link: "Website packages",
  },
];

function faqsFor(showPrices: boolean): Faq[] {
  return [
    {
      q: "What does the free online audit include?",
      a: `We review your website, Google Business Profile, social profiles and reviews, and ask AI assistants like ${checkedAssistantList} the questions your customers ask to see whether they recommend you. A real person checks every finding before it reaches you. ${site.auditTurnaround ? `It arrives ${site.auditTurnaround} and is` : "It's"} free, with no obligation.`,
    },
    {
      q: "What is GEO, and do I need it?",
      a: `GEO (generative engine optimization) is making sure AI assistants like ${aiAssistantList} can find your business, describe it correctly and recommend it. More customers now ask AI who to hire, so if you rely on local customers finding you, it's worth checking where you stand. Every website we build includes it.`,
    },
    {
      q: "Do I need a new website?",
      a: "Not necessarily. We can build you a new website from scratch, or improve the one you already have. If your site works, we can boost your Google profile, reviews and AI visibility without rebuilding it.",
    },
    {
      q: "How much does it cost?",
      a: showPrices
        ? "Every package has a clear, upfront price on our Services & Pricing page, and your domain, hosting and email costs are listed separately and paid directly by you. Not sure what you need? Start with the free audit and we'll recommend the right package."
        : "Every project gets a clear, upfront quote before any work starts. Your domain, hosting and email are paid directly by you. Start with the free audit and we'll recommend the right package.",
    },
    {
      q: "Do I own my website and accounts?",
      a: "Yes. Your domain, hosting, business email, Google profile and social accounts are in your name, so you stay in control even if you stop working with us.",
    },
    {
      q: "Can you guarantee I'll be number one on Google or in AI answers?",
      a: "No, and nobody honestly can. We fix the things search engines and AI assistants rely on, show you the evidence, and track whether it's working.",
    },
  ];
}

export default async function HomePage() {
  const faqs = faqsFor(await getShowPrices());
  return (
    <>
      <JsonLd data={businessJsonLd()} />
      <JsonLd data={faqJsonLd(faqs)} />
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 h-full w-1/2 -skew-x-[20deg] bg-gradient-to-l from-orange/25 to-transparent" />
        <Container className="relative grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <Eyebrow>San Diego County · East County</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-5xl font-extrabold italic uppercase leading-[0.95] sm:text-7xl">
              Get Found. <span className="text-orange">Build Trust.</span> Grow Your Business.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/85 sm:text-xl">
              We help contractors and home service businesses get found on Google and AI search. We&apos;ll build you a new
              website from scratch or upgrade the one you already have.
            </p>
            <div className="mt-6">
              <AiRow />
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/free-audit" className="flex-col !gap-0 sm:whitespace-nowrap text-lg leading-tight">
                <span>Get Your Free Online Audit</span>
                <span className="mt-0.5 text-sm font-normal text-white/85">See where your business stands <strong className="font-extrabold italic uppercase text-navy">right now &rarr;</strong></span>
              </ButtonLink>
              {site.showPhone ? (
                <ButtonLink href={site.phoneHref} variant="ghostLight" className="text-lg">Call {site.phoneDisplay}</ButtonLink>
              ) : (
                <ButtonLink href={site.bookingUrl} target="_blank" rel="noopener" variant="ghostLight" className="text-lg sm:whitespace-nowrap">
                  <Icon name="video" className="h-5 w-5" /> {site.bookingLabel}
                </ButtonLink>
              )}
            </div>
            <p className="mt-3 text-sm text-white/60">Takes about 60 seconds</p>
          </div>
          <HeroScorecard />
        </Container>
      </section>

      <section className="bg-navy-50 py-16 sm:py-20">
        <Container className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>The new way customers search</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold text-navy">Customers are asking AI who to hire. Are you in the answer?</h2>
            <p className="mt-4 text-ink">
              Instead of scrolling through search results, more people now ask AI assistants like {aiAssistantList} for a
              recommendation and get back just a few names. Making sure your business is one of them is called{" "}
              <strong>GEO</strong>, generative engine optimization. It&apos;s built into every website we make, and available on
              its own if you don&apos;t need a new website.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/ai-search">Learn About GEO</ButtonLink>
              <ButtonLink href="/free-audit?focus=ai-search" variant="secondary">Check What AI Says About You</ButtonLink>
            </div>
          </div>
          <AiChatDemo />
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Everything customers check before they call you</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Link key={s.check} href={s.href} className={`group flex flex-col rounded-xl border border-line bg-white p-6 ${cardHover}`}>
                <IconBadge name={s.icon} />
                <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-navy">{s.check}</h3>
                <p className="mt-2 flex-1 text-muted">{s.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold text-navy group-hover:text-orange">
                  {s.link} <Icon name="arrow" className="h-4 w-4" />
                </span>
              </Link>
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
          <StepFlow
            steps={[
              {
                title: "Free online audit",
                body: "We review your website, Google listing, social profiles and what AI assistants say about you, and show you what's working and what to fix, with evidence.",
                icon: "search",
                badge: "Free",
                preview: <AuditPreview />,
              },
              {
                title: "A clear plan",
                body: "You get a straightforward recommendation and price. Your domain, hosting and email costs are listed separately and paid directly by you.",
                icon: "chat",
                preview: <PlanPreview />,
              },
              {
                title: "We build and launch",
                body: "We set it up, you review and approve, and we launch. You own every account when we're done.",
                icon: "bolt",
                preview: <LaunchPreview />,
              },
            ]}
          />
          <div className="mt-10">
            <ButtonLink href="/free-audit" className="text-lg">Start With a Free Audit</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          {photos.trades.length > 0 && (
            <ul className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {photos.trades.map((t) => (
                <li key={t.label}>
                  <Link
                    href={`/free-audit?trade=${encodeURIComponent(t.trade)}`}
                    className="group relative block overflow-hidden rounded-xl transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-orange focus-visible:ring-2 focus-visible:ring-orange"
                  >
                    <Image src={t.src} alt={t.alt} width={640} height={800} sizes="(min-width: 1024px) 180px, (min-width: 640px) 33vw, 50vw" className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent p-3 pt-8 text-white">
                      <span className="block font-display text-lg font-bold">{t.label}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-white/85 group-hover:text-orange">
                        Get a free audit <Icon name="arrow" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <Eyebrow>Who we help</Eyebrow>
              <h2 className="mt-2 font-display text-4xl font-bold text-navy">Built for local service businesses</h2>
              <ul className="mt-6 flex flex-wrap gap-2">
                {[...site.industries, "Other"].map((i) => (
                  <li key={i}>
                    <Link
                      href={`/free-audit?trade=${encodeURIComponent(i)}`}
                      className="block rounded-full bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy transition hover:-translate-y-0.5 hover:bg-orange hover:text-white"
                    >
                      {i}
                    </Link>
                  </li>
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
            <div className="grid gap-4 rounded-2xl bg-navy p-4 sm:p-6">
              <div className="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
                <IconBadge name="key" tone="dark" />
                <h2 className="mt-4 font-display text-3xl font-bold text-white">You own everything</h2>
                <p className="mt-2 text-white/80">
                  Your domain, website hosting, business email, Google profile and social accounts are in your name and paid
                  directly by you. We charge only for our work, and we list third-party costs separately so there are no surprises.
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
                <IconBadge name="handshake" tone="dark" />
                <h2 className="mt-4 font-display text-3xl font-bold text-white">Straight talk</h2>
                <p className="mt-2 text-white/80">
                  {site.name} was founded by a career entrepreneur and business owner, so we know what it takes to win local
                  customers. You won&apos;t see made-up testimonials or inflated promises here. Our audits stick to what we can
                  verify, and we explain every recommendation in plain English.
                </p>
              </div>
            </div>
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
