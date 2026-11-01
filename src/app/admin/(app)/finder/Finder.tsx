"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addFoundBusiness, searchProspects, type AddFoundState, type FinderState } from "../../actions";
import { verdictLabel, type ScoredBusiness, type Verdict } from "@/lib/finder";

const verdictStyle: Record<Verdict, string> = {
  strong: "bg-orange text-white",
  maybe: "bg-amber-100 text-amber-900",
  solid: "bg-green-100 text-green-800",
};

type Props = { industries: readonly string[]; cities: readonly string[]; canAudit: boolean; cost: string; used: number; limit: number };

export function Finder({ industries, cities, canAudit, cost, used, limit }: Props) {
  const [state, action, pending] = useActionState(searchProspects, { trade: "", city: "" } as FinderState);
  const [showSolid, setShowSolid] = useState(false);
  const results = state.results ?? [];
  const shown = showSolid ? results : results.filter((r) => r.verdict !== "solid");
  const hidden = results.length - shown.length;

  return (
    <div className="space-y-6">
      <form action={action} className="rounded-lg bg-white p-5 shadow-sm" aria-label="Search for prospects">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-semibold">
            Type of business
            <input name="trade" list="finder-trades" required defaultValue={state.trade} placeholder="Plumbers" className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold">
            City
            <input name="city" list="finder-cities" required defaultValue={state.city} placeholder="El Cajon" className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 font-normal" />
          </label>
          <button disabled={pending || used >= limit} className="self-end rounded-md bg-navy px-5 py-2 font-semibold text-white disabled:opacity-60">
            {pending ? "Searching..." : "Search Google Maps"}
          </button>
        </div>
        <datalist id="finder-trades">{industries.map((i) => <option key={i} value={i} />)}</datalist>
        <datalist id="finder-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
        <p className="mt-3 text-xs text-muted">
          Each search is one Google lookup, {cost}, and returns up to 20 businesses. {used} of {limit} searches used this month.
        </p>
      </form>

      {state.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{state.error}</p>}

      {state.results && (
        <section aria-label="Results" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-navy">
              {results.length} businesses found{results.length > 0 && <>, {results.filter((r) => r.verdict === "strong").length} strong prospects</>}
            </h2>
            {results.some((r) => r.verdict === "solid") && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showSolid} onChange={(e) => setShowSolid(e.target.checked)} />
                Show ones that look solid{hidden > 0 && ` (${hidden})`}
              </label>
            )}
          </div>
          {shown.length === 0 && <p className="rounded-lg bg-white p-6 text-muted">Every business here looks solid on Google. Try another city or trade.</p>}
          <ul className="space-y-3">
            {shown.map((b) => <Result key={`${b.rank}-${b.name}`} b={b} trade={state.trade} city={state.city} canAudit={canAudit} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Result({ b, trade, city, canAudit }: { b: ScoredBusiness; trade: string; city: string; canAudit: boolean }) {
  const [state, action, pending] = useActionState(addFoundBusiness, {} as AddFoundState);
  const leadId = state.leadId ?? b.existingLeadId;
  const summary = [
    b.reviews ? `Google: ${b.rating?.toFixed(1)} stars from ${b.reviews} reviews.` : "No Google reviews.",
    b.flags.length ? `Flags: ${b.flags.map((f) => f.label).join(", ")}.` : "",
  ].join(" ");

  return (
    <li className="rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${verdictStyle[b.verdict]}`}>{verdictLabel[b.verdict]}</span>
            <h3 className="font-semibold text-navy">{b.name}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            {b.reviews ? <>&#9733; {b.rating?.toFixed(1)} ({b.reviews} reviews)</> : "No reviews"} · #{b.rank} on Maps
            {b.address && <> · {b.address}</>}
          </p>
          <p className="mt-1 text-sm">
            {b.website ? <a href={b.website} target="_blank" rel="noreferrer" className="text-navy underline">{b.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : <span className="text-muted">No website</span>}
            {b.phone && <span className="text-muted"> · {b.phone}</span>}
            {b.mapsUrl && <> · <a href={b.mapsUrl} target="_blank" rel="noreferrer" className="text-navy underline">Google Maps</a></>}
          </p>
          {b.flags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Weak spots">
              {b.flags.map((f) => <li key={f.label} className="rounded bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy">{f.label}</li>)}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          {leadId ? (
            <>
              <p role="status" className="text-sm font-semibold text-green-800">
                {state.leadId ? (state.audit ? "Added, audit running" : "Added to leads") : "Already in your leads"}
              </p>
              <Link href={`/admin/leads/${leadId}`} className="rounded-md px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-line">Open lead</Link>
            </>
          ) : (
            <form action={action} className="flex flex-wrap gap-2 sm:justify-end">
              <input type="hidden" name="name" value={b.name} />
              <input type="hidden" name="trade" value={trade} />
              <input type="hidden" name="city" value={city} />
              <input type="hidden" name="website" value={b.website} />
              <input type="hidden" name="phone" value={b.phone} />
              <input type="hidden" name="mapsUrl" value={b.mapsUrl} />
              <input type="hidden" name="summary" value={summary} />
              <button name="audit" value="0" disabled={pending} className="rounded-md px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-line disabled:opacity-60">
                Add to leads
              </button>
              {canAudit && (
                <button name="audit" value="1" disabled={pending} className="rounded-md bg-orange px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                  {pending ? "Adding..." : "Add + run audit"}
                </button>
              )}
            </form>
          )}
          {state.error && <p role="alert" className="max-w-xs text-xs sm:text-right font-medium text-red-700">{state.error}</p>}
        </div>
      </div>
    </li>
  );
}
