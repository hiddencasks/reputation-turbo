import type { Metadata } from "next";
import { addressOneLine, site } from "@/lib/site";
import { getOfferings, getShowPrices } from "@/lib/offerings";
import { priceText } from "@/components/Pricing";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "One-Sheet",
  description: "A one-page overview of Reputation Turbo's services for San Diego County service businesses.",
};

const steps = ["Free online audit", "Clear plan and price", "We build, you approve, we launch"];

export default async function OneSheetPage() {
  const [offerings, showPrices] = await Promise.all([getOfferings({ activeOnly: true }), getShowPrices()]);
  const packages = offerings.filter((o) => o.kind === "package");

  return (
    <div className="bg-navy-50 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-6 flex w-full max-w-[8.5in] flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">A one-page overview you can print, save as a PDF, or share.</p>
        <PrintButton />
      </div>

      <article className="mx-auto w-full max-w-[8.5in] bg-white shadow-lg print:shadow-none">
        <header className="flex flex-col gap-3 bg-navy px-8 py-7 text-white sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Logo tone="light" className="text-3xl" />
            <p className="mt-2 font-display text-xl italic">{site.tagline}</p>
          </div>
          <p className="text-sm text-white/80">Websites · Google Profiles · Reviews · Branding</p>
        </header>

        <div className="space-y-6 px-8 py-7">
          <p className="text-lg">
            We help contractors and home service businesses in {site.serviceArea}, look as good online as their work does in
            person, so more of the right customers find them, trust them and call.
          </p>

          <section>
            <h2 className="font-display text-2xl font-bold text-navy">What we do</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {packages.map((o) => (
                <div key={o.id} className="rounded-md border border-line p-4">
                  <h3 className="font-display text-lg font-bold leading-tight text-navy">{o.name}</h3>
                  {priceText(o, showPrices) && <p className="font-semibold text-orange">{priceText(o, showPrices)}</p>}
                  <p className="mt-1 text-sm text-muted">{o.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm">
              <strong className="text-navy">Add-ons:</strong> logo creation, brand identity kits, extra pages, service-area
              pages, social media post packs, review request automation, AI chat and lead response, and monthly care plans.
            </p>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h2 className="font-display text-2xl font-bold text-navy">How it works</h2>
              <ol className="mt-2 space-y-2">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className="font-display text-3xl font-extrabold italic text-orange">{i + 1}</span>
                    <span className="font-medium">{s}</span>
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h2 className="font-display text-2xl font-bold text-navy">Who we help</h2>
              <p className="mt-2 text-sm">{site.industries.join(" · ")}</p>
            </section>
          </div>

          <section className="rounded-md border-l-4 border-orange bg-navy-50 p-4">
            <h2 className="font-display text-xl font-bold text-navy">You own everything</h2>
            <p className="text-sm">
              Your domain, hosting, email, Google profile and social accounts stay in your name, paid directly by you. We charge
              only for our work and list third-party costs separately.
            </p>
          </section>
        </div>

        <footer className="flex flex-col gap-2 bg-orange px-8 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-2xl font-extrabold italic uppercase">Get your free online audit</p>
            <p className="text-sm">reputationturbo.com/free-audit</p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="text-lg font-bold">{site.phoneDisplay}</p>
            <p>{site.email}</p>
            <p>{addressOneLine}</p>
          </div>
        </footer>
      </article>

      <div className="no-print mx-auto mt-6 flex w-full max-w-[8.5in] justify-center px-4">
        <ButtonLink href="/free-audit">Get Your Free Audit</ButtonLink>
      </div>
    </div>
  );
}
