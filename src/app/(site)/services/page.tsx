import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getOfferings, getShowPrices, isGeo, type Offering } from "@/lib/offerings";
import { photos } from "@/lib/photos";
import { aiAssistantList } from "@/lib/site";
import { faqJsonLd, type Faq } from "@/lib/structured-data";
import { AfterLaunch, GeoSteps, OfferingCard, priceText } from "@/components/Pricing";
import { FaqList } from "@/components/FaqList";
import { Icon, IconBadge, type IconName } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { AiRow } from "@/components/marketing";
import { ButtonLink, Container, Eyebrow, cardHover } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Services & Pricing",
  description: `Websites, Google Business Profile optimization, local SEO, AI search visibility (GEO) for ${aiAssistantList}, branding and review systems for San Diego County service businesses.`,
};

const picker: { title: string; body: string; icon: IconName; href: string }[] = [
  { title: "I need a new website", body: "A fast, phone-friendly website with GEO built in.", icon: "browser", href: "#business-website-launch" },
  { title: "I like my website, help me get found", body: "Google profile, reviews and listings, no rebuild.", icon: "pin", href: "#starter-online-presence" },
  { title: "Just AI visibility", body: "Get recommended by AI assistants, nothing else.", icon: "sparkle", href: "#geo" },
];

const thirdParty: { item: string; cost: string; icon: IconName }[] = [
  { item: "Domain name", icon: "globe", cost: "About $10 to $22 per year, paid to your registrar" },
  { item: "Website hosting", icon: "server", cost: "Often $0 per month on the hosting we recommend" },
  { item: "Business email", icon: "mail", cost: "About $7 to $8.40 per user per month with Google Workspace" },
  { item: "Optional tools (booking, chat)", icon: "puzzle", cost: "Varies by tool, paid to the provider" },
];

// Add-ons grouped for scanning. Anything new added in the dashboard lands in "More".
const addonGroups: { title: string; icon: IconName; slugs: string[] }[] = [
  { title: "Branding", icon: "palette", slugs: ["logo-creation", "brand-identity-kit"] },
  { title: "Website extras", icon: "layout", slugs: ["additional-page", "service-area-page", "photo-gallery", "booking-integration", "extra-revision"] },
  { title: "Automation", icon: "bolt", slugs: ["review-automation", "ai-chatbot", "ai-lead-response"] },
  { title: "Content", icon: "pen", slugs: ["social-post-pack", "blog-post", "extra-local-seo"] },
];

function groupAddons(addons: Offering[]) {
  const groups = addonGroups.map((g) => ({ ...g, items: addons.filter((a) => g.slugs.includes(a.slug)) }));
  const rest = addons.filter((a) => !addonGroups.some((g) => g.slugs.includes(a.slug)));
  if (rest.length) groups.push({ title: "More", icon: "puzzle", slugs: [], items: rest });
  return groups.filter((g) => g.items.length > 0);
}

function faqsFor(showPrices: boolean): Faq[] {
  return [
    {
      q: "How much does it cost?",
      a: showPrices
        ? "The prices on this page are for our work. Your domain, hosting and email are separate, paid directly by you, and listed below. If your project needs something different, we'll give you a clear quote before any work starts."
        : "Every project gets a clear, upfront quote before any work starts. Your domain, hosting and email are separate and paid directly by you. Start with a free audit and we'll recommend the right package.",
    },
    {
      q: "Do I have to sign up for a monthly plan?",
      a: "No. Every package is a one-time project. Monthly plans are optional, and you can add one after launch if you want us to keep things updated.",
    },
    {
      q: "Can you work with my existing website?",
      a: "Yes. If your website works, we can improve your Google profile, reviews, listings and AI visibility without rebuilding it.",
    },
    {
      q: "Who owns the website and accounts?",
      a: "You do. Your domain, hosting, email, Google profile and social accounts are in your name, so you stay in control even if you stop working with us.",
    },
  ];
}

export default async function ServicesPage() {
  const [offerings, showPrices] = await Promise.all([getOfferings({ activeOnly: true }), getShowPrices()]);
  const geo = offerings.filter(isGeo);
  const rest = offerings.filter((o) => !isGeo(o));
  const packages = rest.filter((o) => o.kind === "package");
  const addons = rest.filter((o) => o.kind === "addon");
  const plans = rest.filter((o) => o.kind === "plan");
  const geoSetup = geo.find((o) => o.kind === "package");
  const geoPlan = geo.find((o) => o.kind === "plan");
  const faqs = faqsFor(showPrices);
  const hero = photos.servicesHero;

  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />
      <section className="relative overflow-hidden bg-navy text-white">
        {hero && (
          <>
            <Image src={hero.src} alt={hero.alt} fill priority sizes="100vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/40" />
          </>
        )}
        {!hero && (
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 h-full w-1/2 -skew-x-[20deg] bg-gradient-to-l from-orange/25 to-transparent" />
        )}
        <Container className="relative py-16 sm:py-24">
          <Eyebrow>Services & Pricing</Eyebrow>
          <h1 className="mt-2 max-w-3xl font-display text-5xl font-extrabold italic uppercase leading-[0.95] sm:text-6xl">Pick the help you need</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">
            {showPrices
              ? "Websites with GEO included, or GEO on its own. Clear, upfront pricing for our work. Third-party costs like your domain and email are listed separately and paid directly by you."
              : "Websites with GEO included, or GEO on its own. Every business starts in a different place, so start with a free audit and we'll recommend the right package with a clear, upfront price."}
          </p>
          <div className="mt-6">
            <AiRow />
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <Eyebrow>Which fits you?</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Start with where you are today</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {picker.map((p) => (
              <Link key={p.title} href={p.href} className={`group flex items-start gap-4 rounded-xl border border-line bg-white p-5 ${cardHover}`}>
                <IconBadge name={p.icon} />
                <span>
                  <span className="block font-display text-xl font-bold leading-tight text-navy">{p.title}</span>
                  <span className="mt-1 block text-sm text-muted">{p.body}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-navy group-hover:text-orange">
                    See the package <Icon name="arrow" className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section id="packages" className="scroll-mt-24 bg-navy-50 py-16">
        <Container>
          <Eyebrow>Step 1 · One-time project</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Packages, with GEO built in</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Every website we build is ready for Google and for AI assistants like {aiAssistantList}, with structured data and an
            AI-friendly FAQ. Premium adds our full GEO setup. Each package is a one-time project.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {packages.map((o, i) => (
              <OfferingCard key={o.id} o={o} showPrices={showPrices} featured={i === 1} badge={i === 1 ? "Recommended" : undefined} tag="One-time project" siblings={packages} />
            ))}
          </div>
          <p className="mt-8 text-muted">
            Need something different?{" "}
            <Link href="/contact" className="font-semibold text-navy underline decoration-orange underline-offset-4 hover:text-orange">
              Ask for a custom quote
            </Link>
            .
          </p>
        </Container>
      </section>

      {geo.length > 0 && (
        <section id="geo" className="scroll-mt-24 bg-navy py-16 text-white">
          <Container>
            <Eyebrow>GEO without a new website</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold">Get recommended by AI, no rebuild needed</h2>
            <p className="mt-2 max-w-2xl text-white/85">
              Happy with your current website, or don&apos;t need one? We work with what you already have, including your Google
              Business Profile, listings and reviews, so {aiAssistantList} can find, understand and recommend you.
            </p>
            <GeoSteps setup={geoSetup} plan={geoPlan} showPrices={showPrices} />
            <div className="mt-8">
              <ButtonLink href="/ai-search" variant="ghostLight">How AI Search Works</ButtonLink>
            </div>
          </Container>
        </section>
      )}

      <AfterLaunch plans={plans} showPrices={showPrices} className="border-t-4 border-orange bg-navy-800" />

      {addons.length > 0 && (
        <section className="py-16">
          <Container>
            <Eyebrow>Add-ons</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold text-navy">Add exactly what you need</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {groupAddons(addons).map((g) => (
                <div key={g.title} className="rounded-xl border border-line bg-white p-6">
                  <div className="flex items-center gap-3">
                    <IconBadge name={g.icon} />
                    <h3 className="font-display text-2xl font-bold text-navy">{g.title}</h3>
                  </div>
                  <ul className="mt-4 divide-y divide-line">
                    {g.items.map((o) => {
                      const price = priceText(o, showPrices);
                      return (
                        <li key={o.id} className="flex items-start justify-between gap-4 py-3">
                          <div>
                            <p className="font-semibold text-navy">{o.name}</p>
                            {o.description && <p className="text-sm text-muted">{o.description}</p>}
                          </div>
                          {price && <p className="shrink-0 text-right font-semibold text-ink">{price}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="bg-navy-50 py-16">
        <Container>
          <Eyebrow>Your costs, your accounts</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Third-party costs you pay directly</h2>
          <p className="mt-2 max-w-2xl text-muted">
            These are not part of our fees. The accounts are in your name, so you stay in control even if you stop working with us.
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {thirdParty.map((t) => (
              <div key={t.item} className="relative rounded-xl bg-white p-5">
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                  <Icon name="key" className="h-3.5 w-3.5" /> You own it
                </span>
                <IconBadge name={t.icon} />
                <dt className="mt-3 font-semibold text-navy">{t.item}</dt>
                <dd className="mt-1 text-sm text-muted">{t.cost}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">Pricing questions</h2>
          <FaqList faqs={faqs} />
        </Container>
      </section>

      <section className="bg-orange py-14 text-white">
        <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold italic uppercase">Not sure which one you need?</h2>
            <p className="mt-2 text-lg text-white/90">Start with a free audit and we&apos;ll recommend the right package.</p>
          </div>
          <ButtonLink href="/free-audit" variant="dark" className="text-lg">Get Your Free Audit</ButtonLink>
        </Container>
      </section>
    </>
  );
}
