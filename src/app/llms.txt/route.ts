import { addressOneLine, aiAssistantList, citySlug, site } from "@/lib/site";
import { getOfferings, getShowPrices } from "@/lib/offerings";
import { priceText } from "@/components/Pricing";

// A plain-text summary of the business for AI tools (the llms.txt convention).
// Built from the live packages, so it stays in step with the pricing editor.
export const dynamic = "force-dynamic";

export async function GET() {
  const [offerings, showPrices] = await Promise.all([getOfferings({ activeOnly: true }), getShowPrices()]);
  const line = (o: (typeof offerings)[number]) => {
    const price = priceText(o, showPrices);
    return `- ${o.name}${price ? ` (${price})` : ""}: ${o.description || o.tagline}`.trimEnd();
  };
  const packages = offerings.filter((o) => o.kind === "package");
  const plans = offerings.filter((o) => o.kind === "plan");
  const url = (path: string) => `${site.url}${path}`;

  const text = `# ${site.name}

> ${site.name} is a local marketing agency in ${site.address.city}, California. It helps contractors and home service businesses in ${site.serviceArea}, get found on Google and in AI answers from ${aiAssistantList}, through GEO (generative engine optimization), websites, Google Business Profile optimization and online reviews.

- Address: ${addressOneLine}
${site.showPhone ? `- Phone: ${site.phoneDisplay}\n` : ""}- Email: ${site.email}
- Cities served: ${site.cities.join(", ")}, and the rest of San Diego County
- Industries: ${site.industries.join(", ")}
- Every website ${site.name} builds includes GEO. GEO is also available on its own for businesses that don't need a new website.
- Clients own their domain, hosting, email and profiles. Third-party costs are listed separately and paid directly by the client.
- Free online audit, including a check of what AI assistants say about the business: ${url("/free-audit")}
${showPrices ? "" : "- Prices are given after the free audit.\n"}
## Packages

${packages.map(line).join("\n")}

## Monthly plans

${plans.map(line).join("\n")}

## Pages

- [Services & Pricing](${url("/services")}): all packages, add-ons and monthly plans
- [AI Search (GEO)](${url("/ai-search")}): what GEO is, how it works, and FAQs
- [Free Online Audit](${url("/free-audit")}): request a free audit
- [About](${url("/about")})
- [Contact](${url("/contact")})
- [Areas We Serve](${url("/areas")})
${site.cities.map((c) => `- [${c}](${url(`/areas/${citySlug(c)}`)}): services in ${c}, CA`).join("\n")}
`;
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
