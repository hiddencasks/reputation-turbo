import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/site";
import { getAnswers, getPreviousCheck, type AiCheck } from "@/lib/ai-visibility/run";
import { providerLabel } from "@/lib/ai-visibility/providers";
import { plainText } from "@/lib/ai-visibility/match";
import { tradePhrase, withArticle } from "@/lib/ai-visibility/questions";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Visibility Report", robots: { index: false, follow: false } };

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "long" });

function verdict(rate: number): { title: string; body: string } {
  if (rate === 0) {
    return {
      title: "AI assistants aren't recommending you yet",
      body: "When customers asked for your kind of business in your area, none of the answers named you. Customers who use AI to choose a business may never hear about you, but the things these tools rely on can be improved.",
    };
  }
  if (rate < 0.5) {
    return {
      title: "You show up sometimes, but not reliably",
      body: "Some answers named you and most didn't. AI assistants know a little about your business, but not enough to recommend you consistently over the competitors below.",
    };
  }
  return {
    title: "AI assistants already recommend you, often",
    body: "You were named in most answers. The goal now is to keep it that way as competitors catch on, and to make sure what the AI says about you is accurate.",
  };
}

const fixes = [
  { title: "Make your website easy for AI to read", body: "Clear service and service-area pages, an FAQ written in plain language, and structured data that spells out who you are, where you work and what you do." },
  { title: "Make your listings agree everywhere", body: "The same name, address, phone, hours and services on Google, Bing, Apple Maps, Yelp and the directories AI tools pull from." },
  { title: "Get recent, specific reviews", body: "Reviews that mention the job and the city (\"repaired our AC in La Mesa\") are what AI assistants quote when they recommend a business." },
];

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{36}$/.test(token)) notFound();
  const [check] = await sql<AiCheck[]>`select * from ai_checks where report_token = ${token} and status = 'done'`;
  if (!check) notFound();
  // Reports go public only after the owner approves them; until then only the owner can preview.
  const preview = !check.approved_at;
  if (preview && !(await getSession())) notFound();

  const [answers, previous] = await Promise.all([getAnswers(check.id), getPreviousCheck(check)]);
  const answered = answers.filter((a) => !a.error);
  const rate = check.answer_count ? check.mentioned_count / check.answer_count : 0;
  const v = verdict(rate);
  const byProvider = check.providers.map((p) => {
    const rows = answered.filter((a) => a.provider === p);
    return { id: p, label: providerLabel(p), named: rows.filter((a) => a.mentioned).length, total: rows.length };
  });
  const maxCompetitor = Math.max(1, ...check.competitors.map((c) => c.count));

  return (
    <>
      {preview && (
        <p className="no-print bg-orange px-4 py-2 text-center text-sm font-semibold text-white">
          Preview: only you can see this until you approve it in the dashboard.
        </p>
      )}
      <section className="bg-navy text-white">
        <Container className="py-12 sm:py-16">
          <Eyebrow>AI visibility report</Eyebrow>
          <h1 className="mt-2 font-display text-4xl font-extrabold italic uppercase sm:text-5xl">{check.business_name}</h1>
          <p className="mt-3 text-lg text-white/85">
            What AI assistants say when customers look for {withArticle(tradePhrase(check.trade))} in {check.city}. Checked{" "}
            {fmtDate(check.finished_at ?? check.created_at)}.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div className="rounded-lg border border-line p-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Named in</p>
            <p className="font-display text-7xl font-extrabold text-navy">
              {check.mentioned_count}<span className="text-4xl text-muted"> / {check.answer_count}</span>
            </p>
            <p className="text-muted">AI answers</p>
            {previous && (
              <p className="mt-3 text-sm font-semibold text-navy">
                Last check ({fmtDate(previous.finished_at ?? previous.created_at)}): {previous.mentioned_count} of {previous.answer_count}
              </p>
            )}
            <ul className="mt-5 space-y-2 text-left text-sm">
              {byProvider.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 border-t border-line pt-2">
                  <span>{p.label}</span>
                  <span className="font-semibold">{p.named} of {p.total}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-navy">{v.title}</h2>
            <p className="mt-3 text-ink">{v.body}</p>
            {check.competitors.length > 0 && (
              <>
                <h3 className="mt-8 font-display text-2xl font-bold text-navy">Who AI recommends instead</h3>
                <p className="text-sm text-muted">How many of the {check.answer_count} answers named each business.</p>
                <ul className="mt-3 space-y-2">
                  {check.competitors.map((c) => (
                    <li key={c.name}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted">{c.count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-navy-50">
                        <div className="h-2 rounded bg-orange" style={{ width: `${(c.count / maxCompetitor) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Container>
      </section>

      <section className="bg-navy-50 py-12">
        <Container>
          <Eyebrow>The questions we asked</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">Every answer, word for word</h2>
          <div className="mt-6 space-y-6">
            {check.questions.map((q) => (
              <div key={q} className="rounded-lg bg-white p-5">
                <h3 className="font-display text-xl font-bold text-navy">&ldquo;{q}&rdquo;</h3>
                <ul className="mt-3 space-y-2">
                  {answered.filter((a) => a.question === q).map((a) => (
                    <li key={a.id}>
                      <details className="rounded-md border border-line">
                        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3">
                          <span className="font-semibold">{providerLabel(a.provider)}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${a.mentioned ? "bg-green-100 text-green-800" : "bg-red-50 text-red-800"}`}>
                            {a.mentioned ? "Named you" : "Didn't name you"}
                          </span>
                        </summary>
                        <div className="border-t border-line p-3 text-sm">
                          {a.businesses.length > 0 && <p className="mb-2 text-muted">Businesses named: {a.businesses.join(", ")}</p>}
                          <p className="whitespace-pre-wrap">{plainText(a.answer)}</p>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <Eyebrow>What we&apos;d fix first</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">How to get recommended more often</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {fixes.map((f) => (
              <div key={f.title} className="rounded-lg border border-line p-6">
                <div className="h-1 w-10 -skew-x-[30deg] bg-orange" />
                <h3 className="mt-4 font-display text-xl font-bold text-navy">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-lg bg-orange p-8 text-white">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">Want help getting named?</h2>
            <p className="mt-2 text-white/90">We&apos;ll walk you through this report and what it would take, with a clear, upfront price.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {site.showPhone ? (
                <ButtonLink href={site.phoneHref} variant="dark">Call {site.phoneDisplay}</ButtonLink>
              ) : (
                <ButtonLink href={site.bookingUrl} target="_blank" rel="noopener" variant="dark">{site.bookingLabel}</ButtonLink>
              )}
              <ButtonLink href="/ai-search" variant="ghostLight">How GEO works</ButtonLink>
            </div>
          </div>
          <p className="mt-8 text-xs text-muted">
            AI answers change over time and can differ by person, location and wording, so this is a snapshot of what{" "}
            {byProvider.map((p) => p.label).join(", ")} said on {fmtDate(check.finished_at ?? check.created_at)}. No one can
            guarantee what an AI assistant will recommend.
          </p>
        </Container>
      </section>
    </>
  );
}
