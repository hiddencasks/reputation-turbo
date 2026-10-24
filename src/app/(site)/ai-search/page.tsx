import type { Metadata } from "next";
import { getOfferings, getShowPrices } from "@/lib/offerings";
import { OfferingCard } from "@/components/Pricing";
import { ButtonLink, Container, Eyebrow, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "AI Search Visibility (GEO)",
  description:
    "Get your business mentioned when customers ask ChatGPT, Google's AI answers and other AI assistants who to hire. AI search visibility (GEO) for San Diego County service businesses.",
};

// Offerings shown on this page; prices and wording are managed in the dashboard.
const geoSlugs = ["ai-search-setup", "ai-visibility-plan"];

const questions = [
  "Who's the best concrete contractor in El Cajon?",
  "I need an emergency plumber in La Mesa tonight. Who should I call?",
  "Which roofers near Santee have good reviews?",
];

const signals = [
  { title: "Your website", body: "Clear service pages, service areas, hours and FAQs written so an AI can read them and quote them correctly." },
  { title: "Your listings", body: "The same name, address, phone and services on Google, Yelp, Bing, Apple Maps and industry directories." },
  { title: "Your reviews", body: "Recent reviews that mention the work you do and where you do it. AI assistants lean on them heavily." },
  { title: "Structured data", body: "Behind-the-scenes code (schema markup) that tells search engines and AI exactly who you are and what you offer." },
];

const steps = [
  { n: "1", title: "We ask the AIs", body: "We ask ChatGPT, Google's AI answers, Perplexity and others the questions your customers ask, and record who gets recommended." },
  { n: "2", title: "We show you the results", body: "You see where you show up, where you don't, which competitors are named instead, and anything the AI gets wrong about you." },
  { n: "3", title: "We fix the gaps", body: "We update your website, listings, FAQs and structured data, and help you get the reviews that AI assistants trust." },
  { n: "4", title: "We keep checking", body: "On the monthly plan we re-run the same questions every month so you can see the changes over time." },
];

export default async function AiSearchPage() {
  const [offerings, showPrices] = await Promise.all([getOfferings({ activeOnly: true }), getShowPrices()]);
  const geoOfferings = offerings.filter((o) => geoSlugs.includes(o.slug));

  return (
    <>
      <PageHeader
        eyebrow="AI search visibility (GEO)"
        title="Show up when customers ask AI"
        intro="More people now ask ChatGPT or Google's AI answers who to hire instead of scrolling through search results. We make sure your business is part of the answer."
      />

      <section className="py-14">
        <Container className="grid gap-12 md:grid-cols-2">
          <div>
            <Eyebrow>What is GEO?</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy">SEO for AI answers</h2>
            <p className="mt-3 text-ink">
              GEO stands for <strong>generative engine optimization</strong>. SEO helps you rank in Google&apos;s list of links.
              GEO helps AI assistants like ChatGPT, Google&apos;s AI answers, Gemini, Perplexity and Copilot find your business,
              understand what you do, and recommend you by name.
            </p>
            <p className="mt-3 text-ink">
              When an AI gives one short answer instead of ten links, being named matters more. If it names your competitor,
              the customer may never see you.
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-orange bg-navy-50 p-6">
            <h2 className="font-display text-2xl font-bold text-navy">Questions your customers are asking AI</h2>
            <ul className="mt-4 space-y-3">
              {questions.map((q) => (
                <li key={q} className="rounded-md bg-white p-3 italic text-ink shadow-sm">&ldquo;{q}&rdquo;</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">Do you know what the AI says when someone asks about your trade in your city?</p>
          </div>
        </Container>
      </section>

      <section className="bg-navy-50 py-14">
        <Container>
          <Eyebrow>What AI assistants look at</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">The signals we improve</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {signals.map((s) => (
              <div key={s.title} className="rounded-lg bg-white p-6">
                <div className="h-1 w-10 -skew-x-[30deg] bg-orange" />
                <h3 className="mt-4 font-display text-xl font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">From invisible to recommended</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="rounded-lg border border-line p-6">
                <span className="font-display text-5xl font-extrabold italic text-orange">{s.n}</span>
                <h3 className="mt-2 font-display text-xl font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {geoOfferings.length > 0 && (
        <section className="bg-navy-50 py-14">
          <Container>
            <Eyebrow>Options</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy">One-time setup, optional monthly tracking</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {geoOfferings.map((o) => (
                <div key={o.id} className="grid rounded-lg bg-white">
                  <OfferingCard o={o} showPrices={showPrices} />
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="py-14">
        <Container className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold text-navy">Straight talk</h2>
            <p className="mt-3 text-ink">
              Nobody controls what AI assistants say, and anyone who guarantees you a top spot is overpromising. AI answers also
              change from day to day. What we can do is fix the things these tools rely on, show you exactly what they say about
              you, and track whether it improves.
            </p>
          </div>
          <div className="rounded-lg bg-orange p-8 text-white">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">Find out what AI says about you</h2>
            <p className="mt-2 text-white/90">Every free online audit now includes an AI search check.</p>
            <ButtonLink href="/free-audit" variant="dark" className="mt-6">Get Your Free Audit</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
