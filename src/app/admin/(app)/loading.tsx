/** Shown right away while a dashboard page loads, so a click never looks like it did nothing. */
export default function Loading() {
  return (
    <div role="status" className="flex items-center gap-3 p-6 text-navy">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="font-semibold">Loading…</span>
    </div>
  );
}
