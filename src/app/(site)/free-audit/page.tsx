import type { Metadata } from "next";
import { AuditForm } from "@/components/forms";
import { getOfferings } from "@/lib/offerings";
import { checkedAssistantList, site } from "@/lib/site";
import { Container, PageHeader } from "@/components/ui";

// Leaves time for the AI visibility check that starts after an audit request.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Free Online Audit",
  description: "Get a free, personalized review of your website, Google listing and online reputation from Reputation Turbo.",
};

const checks = [
  "Website: loads properly, works on phones, speed, security (HTTPS) and contact options",
  "Search basics: page titles and descriptions Google shows",
  "Google listing: business details, website link, phone, reviews and rating",
  "Social profiles: whether they're easy to find and consistent",
  "Lead capture: how easy it is for a customer to reach you",
  `AI search: whether ${checkedAssistantList} recommend you when customers ask for your service nearby`,
];

export default async function FreeAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string | string[]; package?: string | string[]; trade?: string | string[] }>;
}) {
  const params = await searchParams;
  // Links from the AI search page and outreach use ?focus=ai-search so those leads are tagged in the dashboard.
  const aiSearch = params.focus === "ai-search";
  // Package buttons add ?package=<slug> so the request notes which package the visitor was looking at.
  const slug = typeof params.package === "string" ? params.package : "";
  // The trade photos on the homepage add ?trade=<industry> to preselect the type of business.
  const trade = site.industries.find((i) => i === params.trade);
  const interest = slug ? (await getOfferings({ activeOnly: true })).find((o) => o.slug === slug)?.name : undefined;
  return (
    <>
      <PageHeader
        eyebrow="Free online audit"
        title="See how customers see you"
        intro={
          aiSearch
            ? `Tell us about your business and we'll send a personalized audit of your online presence, including what ${checkedAssistantList} say about you. It's free, with no obligation.`
            : "Tell us about your business and we'll send a personalized audit of your online presence. It's free, with no obligation."
        }
      />
      <section className="py-14">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-3xl font-bold text-navy">What we check</h2>
            <ul className="mt-4 space-y-3">
              {checks.map((c) => (
                <li key={c} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 -skew-x-[20deg] bg-orange" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <h2 className="mt-10 font-display text-3xl font-bold text-navy">What you get</h2>
            <p className="mt-3 text-muted">
              Your strengths, your biggest opportunities, and the evidence behind each one, followed by practical next steps.
              A real person reviews every audit before it&apos;s sent, and we never make up numbers.
            </p>
            {site.auditTurnaround && (
              <p className="mt-4 rounded-lg border-l-4 border-orange bg-navy-50 p-4 font-semibold text-navy">
                Your audit arrives {site.auditTurnaround}.
              </p>
            )}
          </div>
          <div className="rounded-lg border border-line p-6 shadow-sm sm:p-8">
            <AuditForm focus={aiSearch ? "ai-search" : undefined} interest={interest} trade={trade} />
          </div>
        </Container>
      </section>
    </>
  );
}
