import type { Metadata } from "next";
import { getOfferings, getShowPrices } from "@/lib/offerings";
import { aiAssistantList, checkedAssistantList } from "@/lib/site";
import { AfterLaunch, OfferingCard } from "@/components/Pricing";
import { AiSearchTyper } from "@/components/AiSearchTyper";
import { ButtonLink, Container, Eyebrow, PageHeader } from "@/components/ui";
import { FaqList } from "@/components/FaqList";
import { Icon, IconBadge, type IconName } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import { faqJsonLd, type Faq } from "@/lib/structured-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "AI Search Visibility (GEO)",
  description: `Get your business recommended when customers ask ${aiAssistantList} who to hire. AI search visibility (GEO) for San Diego County service businesses.`,
};

const questions = [
  "Who's the best concrete contractor in El Cajon?",
  "I need an emergency plumber in La Mesa tonight. Who should I call?",
  "Which roofers near Santee have good reviews?",
  "Who installs AC units in Spring Valley?",
  "Best landscaper in Chula Vista for a backyard remodel?",
  "Is there a good electrician near Lemon Grove?",
  "Who does house painting in La Mesa for a fair price?",
  "Top-rated pest control in El Cajon?",
];

const signals: { title: string; body: string; icon: IconName }[] = [
  { title: "Your website", icon: "browser", body: "Clear service pages, service areas, hours and FAQs written so an AI can read them and quote them correctly." },
  { title: "Your listings", icon: "pin", body: "The same name, address, phone and services on Google, Yelp, Bing, Apple Maps and industry directories." },
  { title: "Your reviews", icon: "star", body: "Recent reviews that mention the work you do and where you do it. AI assistants lean on them heavily." },
  { title: "Structured data", icon: "code", body: "Behind-the-scenes code (schema markup) that tells search engines and AI exactly who you are and what you offer." },
];

const faqs: Faq[] = [
  {
    q: "What is GEO?",
    a: `GEO stands for generative engine optimization. It's the work of making sure AI assistants like ${aiAssistantList} can find your business, describe it correctly and recommend it when customers ask who to hire.`,
  },
  {
    q: "Is GEO replacing SEO?",
    a: "No. They overlap. AI assistants draw on many of the same things Google does: your website, your listings and your reviews. GEO adds the work aimed at how AI tools choose and describe businesses, so the two work best together.",
  },
  {
    q: "Do I need a new website?",
    a: "No. If you're happy with your website, or don't have one, our GEO Setup works with what you already have, including your Google Business Profile. If your site is outdated, every website we build includes GEO.",
  },
  {
    q: "Which AI tools do you check?",
    a: `We ask ${checkedAssistantList} the questions your customers ask, and record what each one says.`,
  },
  {
    q: "How soon will I see a difference?",
    a: "It varies, and nobody can promise a date. Some fixes, like correcting your listings, can show up within weeks. Others take longer while AI tools refresh what they know. With monthly monitoring we re-check every month so you can see what changes.",
  },
];

const steps: { title: string; body: string; icon: IconName }[] = [
  { title: "We ask the AIs", icon: "chat", body: `We ask ${checkedAssistantList} the questions your customers ask, and record who gets recommended.` },
  { title: "We show you the results", icon: "chart", body: "You see where you show up, where you don't, which competitors are named instead, and anything the AI gets wrong about you." },
  { title: "We fix the gaps", icon: "wrench", body: "We update your website, listings, FAQs and structured data, and help you get the reviews that AI assistants trust." },
  { title: "We keep checking", icon: "refresh", body: "With monthly monitoring we re-run the same questions every month so you can see the changes over time." },
];

// One-time ways to get GEO: on its own, or included with a new website.
const packageSlugs = ["ai-search-setup", "business-website-launch", "premium-digital-presence"];

export default async function AiSearchPage() {
  const [offerings, showPrices] = await Promise.all([getOfferings({ activeOnly: true }), getShowPrices()]);
  const packages = packageSlugs.map((slug) => offerings.find((o) => o.slug === slug)).filter((o) => o !== undefined);
  const monitoring = offerings.find((o) => o.slug === "ai-visibility-plan");
  const carePlans = offerings.filter((o) => o.kind === "plan" && o.slug !== "ai-visibility-plan");

  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />
      <PageHeader
        eyebrow="AI search visibility (GEO)"
        title="Show up when customers ask AI"
        intro={`More people now ask ${aiAssistantList} who to hire instead of scrolling through search results. We make sure your business is part of the answer. GEO is built into every website we make, or available on its own.`}
      />

      <section className="py-16">
        <Container className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>What is GEO?</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold text-navy">SEO for AI answers</h2>
            <p className="mt-3 text-ink">
              GEO stands for <strong>generative engine optimization</strong>. SEO helps you rank in Google&apos;s list of links.
              GEO helps AI assistants like {aiAssistantList} find your business, understand what you do, and recommend you by name.
            </p>
            <p className="mt-3 text-ink">
              When an AI gives one short answer instead of ten links, being named matters more. If it names your competitor,
              the customer may never see you.
            </p>
          </div>
          <div className="rounded-2xl bg-navy-50 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-navy">Questions your customers are asking AI</h2>
            <div className="mt-4">
              <AiSearchTyper questions={questions} />
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <p className="font-display text-xl font-bold text-navy">Find out what AI says about your business</p>
              <ButtonLink href="/free-audit?focus=ai-search" className="mt-3">Get My Free Audit</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-navy-50 py-16">
        <Container>
          <Eyebrow>What AI assistants look at</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">The signals we improve</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {signals.map((s) => (
              <div key={s.title} className="rounded-xl border border-line bg-white p-6">
                <IconBadge name={s.icon} />
                <h3 className="mt-4 font-display text-xl font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">From invisible to recommended</h2>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-start">
            <div>
              <Reveal as="ol" className="grid gap-8 sm:grid-cols-2">
                {/* On wider screens the steps run in a loop: 1 → 2 across the top, down to 3, across to 4, back up to 1. */}
                {steps.map((s, i) => (
                  <li
                    key={s.title}
                    className={`relative rounded-xl border border-line bg-white p-6 ${i === 2 ? "sm:order-4" : i === 3 ? "sm:order-3" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange text-white shadow">
                        <Icon name={s.icon} className="h-6 w-6" />
                      </span>
                      <span className="font-display text-sm font-bold uppercase tracking-[0.18em] text-orange">Step {i + 1}</span>
                    </div>
                    <h3 className="mt-3 font-display text-xl font-bold text-navy">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.body}</p>
                    {i === 0 && <Icon name="arrow" className="absolute -right-7 top-9 hidden h-6 w-6 text-orange sm:block" />}
                    {i === 1 && (
                      <Icon name="arrow" className="absolute -bottom-7 left-1/2 hidden h-6 w-6 -translate-x-1/2 rotate-90 text-orange sm:block" />
                    )}
                    {i === 2 && <Icon name="arrow" className="absolute -left-7 top-9 hidden h-6 w-6 rotate-180 text-orange sm:block" />}
                    {i === 3 && (
                      <Icon name="arrow" className="absolute -top-7 left-1/2 hidden h-6 w-6 -translate-x-1/2 -rotate-90 text-orange sm:block" />
                    )}
                  </li>
                ))}
              </Reveal>
              <p className="mt-6 flex items-center gap-3 rounded-full border-2 border-dashed border-orange px-5 py-3 text-sm font-semibold text-navy">
                <Icon name="refresh" className="h-5 w-5 shrink-0 text-orange" />
                After step 4 we start again at step 1, every month on the monthly plan.
              </p>
            </div>
            <figure className="rounded-2xl bg-navy p-6 text-white shadow-xl">
              <figcaption className="flex items-center justify-between">
                <span className="font-display text-xl font-bold">Before and after</span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">Example</span>
              </figcaption>
              <p className="mt-2 text-sm text-white/75">How often a business is named when we ask AI assistants the same 10 customer questions.</p>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex justify-between text-sm"><span>Before</span><strong>Named in 1 of 10</strong></div>
                  <div className="mt-1.5 h-3 rounded-full bg-white/15"><div className="h-3 w-[10%] rounded-full bg-white/60" /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm"><span>After</span><strong className="text-orange">Named in 6 of 10</strong></div>
                  <div className="mt-1.5 h-3 rounded-full bg-white/15"><div className="h-3 w-[60%] rounded-full bg-orange" /></div>
                </div>
              </div>
              <p className="mt-5 text-xs text-white/60">An illustration, not a promise or a real client&apos;s result. Every business starts in a different place.</p>
            </figure>
          </div>
        </Container>
      </section>

      {packages.length > 0 && (
        <section className="bg-navy-50 py-16">
          <Container>
            <Eyebrow>Step 1 · One-time project</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold text-navy">Three ways to get started</h2>
            <p className="mt-2 max-w-2xl text-muted">
              Keep your current website and add GEO, or get a new website with GEO included. Each is a one-time project, and you
              own every account.
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {packages.map((o) => (
                <OfferingCard key={o.id} o={o} showPrices={showPrices} featured={o.slug === "ai-search-setup"} badge={o.slug === "ai-search-setup" ? "No new website needed" : undefined} tag="One-time project" siblings={packages} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {monitoring && (
        <section className="bg-navy py-16 text-white">
          <Container>
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <Eyebrow>Step 2 · After your setup</Eyebrow>
                <h2 className="mt-2 font-display text-4xl font-bold">Keep it working every month</h2>
                <p className="mt-3 text-white/85">
                  After your setup, we keep checking and improving every month. AI answers change often, so monitoring re-asks
                  the same customer questions, shows you what changed, and keeps fixing what the AI gets wrong.
                </p>
                <p className="mt-3 text-white/85">Optional, and never required.</p>
              </div>
              <OfferingCard o={monitoring} showPrices={showPrices} tag="Monthly, optional" />
            </div>
          </Container>
        </section>
      )}
      {!monitoring && <AfterLaunch plans={carePlans} showPrices={showPrices} />}

      <section className="py-16">
        <Container>
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">GEO, explained</h2>
          <FaqList faqs={faqs} />
        </Container>
      </section>

      <section className="bg-navy-50 py-16">
        <Container className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold text-navy">Straight talk</h2>
            <p className="mt-3 text-ink">
              Nobody controls what AI assistants say, and anyone who guarantees you a top spot is overpromising. AI answers also
              change from day to day. What we can do is fix the things these tools rely on, show you exactly what they say about
              you, and track whether it improves.
            </p>
          </div>
          <div className="rounded-xl bg-orange p-8 text-white">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">Find out what AI says about you</h2>
            <p className="mt-2 text-white/90">Every free online audit includes an AI search check.</p>
            <ButtonLink href="/free-audit?focus=ai-search" variant="dark" className="mt-6">Get Your Free Audit</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
