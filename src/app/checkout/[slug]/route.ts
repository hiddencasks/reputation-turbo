import { getOfferings, getShowPrices } from "@/lib/offerings";
import { site } from "@/lib/site";
import { checkoutTerms, createCheckout, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// "Buy now" / "Pay deposit" buttons post here; we send the visitor on to Stripe's secure checkout page.
// A form POST (not a link) so nothing is created by link prefetching or crawlers.
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const back = (why: string) => Response.redirect(`${site.url}/services?checkout=${why}#packages`, 303);
  if (!stripeEnabled() || !(await getShowPrices())) return back("off");
  const offering = (await getOfferings({ activeOnly: true })).find((o) => o.slug === slug);
  const terms = offering && checkoutTerms(offering);
  if (!offering || !terms) return back("missing");
  try {
    return Response.redirect(await createCheckout(offering, terms), 303);
  } catch (e) {
    console.error("Stripe checkout failed:", e instanceof Error ? e.message : e);
    return back("error");
  }
}
