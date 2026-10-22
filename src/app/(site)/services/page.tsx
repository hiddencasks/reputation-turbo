import type { Metadata } from "next";
import { getOfferings, getShowPrices } from "@/lib/offerings";
import { OfferingCard, priceText } from "@/components/Pricing";
import { ButtonLink, Container, Eyebrow, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Services & Pricing",
  description: "Websites, Google Business Profile optimization, local SEO, branding and review systems for San Diego County service businesses.",
};

const thirdParty = [
  { item: "Domain name", cost: "About $10 to $22 per year, paid to your registrar" },
  { item: "Website hosting", cost: "Often $0 per month on the hosting we recommend" },
  { item: "Business email", cost: "About $7 to $8.40 per user per month with Google Workspace" },
  { item: "Optional tools (booking, chat)", cost: "Varies by tool, paid to the provider" },
];

export default async function ServicesPage() {
  const [offerings, showPrices] = await Promise.all([getOfferings({ activeOnly: true }), getShowPrices()]);
  const packages = offerings.filter((o) => o.kind === "package");
  const addons = offerings.filter((o) => o.kind === "addon");
  const plans = offerings.filter((o) => o.kind === "plan");

  return (
    <>
      <PageHeader
        eyebrow="Services & Pricing"
        title="Pick the help you need"
        intro={
          showPrices
            ? "Clear, upfront pricing for our work. Third-party costs like your domain and email are listed separately and paid directly by you."
            : "Every business starts in a different place. Start with a free audit and we'll recommend the right package with a clear, upfront price."
        }
      />

      <section className="py-14">
        <Container>
          <Eyebrow>Packages</Eyebrow>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {packages.map((o, i) => (
              <OfferingCard key={o.id} o={o} showPrices={showPrices} featured={i === 1} />
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/free-audit">Start With a Free Audit</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">Ask for a Custom Quote</ButtonLink>
          </div>
        </Container>
      </section>

      {plans.length > 0 && (
        <section className="bg-navy-50 py-14">
          <Container>
            <Eyebrow>Monthly care plans</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy">Optional ongoing help</h2>
            <p className="mt-2 max-w-2xl text-muted">Never required. Add one after launch if you want us to keep things updated for you.</p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {plans.map((o) => (
                <div key={o.id} className="bg-white rounded-lg">
                  <OfferingCard o={o} showPrices={showPrices} />
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {addons.length > 0 && (
        <section className="py-14">
          <Container>
            <Eyebrow>Add-ons</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy">Add exactly what you need</h2>
            <ul className="mt-6 divide-y divide-line rounded-lg border border-line">
              {addons.map((o) => (
                <li key={o.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-navy">{o.name}</p>
                    {o.description && <p className="text-sm text-muted">{o.description}</p>}
                  </div>
                  {priceText(o, showPrices) && <p className="font-semibold text-ink">{priceText(o, showPrices)}</p>}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="bg-navy-50 py-14">
        <Container>
          <Eyebrow>Your costs, your accounts</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy">Third-party costs you pay directly</h2>
          <p className="mt-2 max-w-2xl text-muted">
            These are not part of our fees. The accounts are in your name, so you stay in control even if you stop working with us.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {thirdParty.map((t) => (
              <div key={t.item} className="rounded-lg bg-white p-4">
                <dt className="font-semibold text-navy">{t.item}</dt>
                <dd className="text-sm text-muted">{t.cost}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
    </>
  );
}
