"use client";

import Link from "next/link";

/** If a dashboard button's action fails, say so plainly instead of leaving a blank or broken page. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="max-w-xl rounded-lg border-2 border-red-200 bg-white p-6 shadow-sm">
      <h1 className="font-display text-2xl font-bold text-red-800">That didn&apos;t go through</h1>
      <p className="mt-2 text-ink">
        Something went wrong on our side, so the last action may not have been saved. Try again, and if it keeps happening, send Claude the time it happened.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted">Error code: {error.digest}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="rounded-md bg-navy px-4 py-2 font-semibold text-white transition active:scale-95">Try again</button>
        <Link href="/admin" className="rounded-md px-4 py-2 font-semibold text-navy ring-1 ring-line">Back to dashboard</Link>
      </div>
    </div>
  );
}
