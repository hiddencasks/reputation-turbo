import Link from "next/link";
import { site } from "@/lib/site";
import { aiChecksAvailable } from "@/lib/ai-visibility/run";
import { finderAvailable, monthlyLimit, searchesThisMonth, SEARCH_COST } from "@/lib/finder-search";
import { Finder } from "./Finder";

// Leaves time for an audit started from a result.
export const maxDuration = 300;

export default async function FinderPage() {
  const used = await searchesThisMonth();
  const limit = monthlyLimit();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Find prospects</h1>
        <p className="mt-1 max-w-3xl text-muted">
          Search Google Maps for a type of business in a city. Each result gets a quick score from its Google listing (website,
          reviews, rating, hours, photos, Maps position), weakest first, so you can pick who&apos;s worth a full audit. Nothing is
          saved and no audit runs until you click.
        </p>
      </div>
      {!finderAvailable() ? (
        <p className="rounded-lg bg-white p-6 text-muted">The Google Places key isn&apos;t set up, so the finder can&apos;t search yet.</p>
      ) : (
        <Finder
          industries={site.industries}
          cities={site.cities}
          canAudit={aiChecksAvailable()}
          cost={SEARCH_COST}
          used={used}
          limit={limit}
        />
      )}
      <p className="text-sm text-muted">
        Know who you want already? <Link href="/admin/leads/new" className="text-orange underline">Add a lead by hand</Link>.
      </p>
    </div>
  );
}
