import type { LeadSummary } from "@/lib/lead-summary";
import { markVendor } from "../../actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

const when = (d: Date) =>
  d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Where a lead came from and what they told us, shown on the board cards and in the list. */
export function LeadInfo({ leadId, createdAt, info }: { leadId: string; createdAt: Date; info: LeadSummary }) {
  return (
    <div className="mt-1.5 space-y-1.5 text-xs">
      <p className="text-muted">
        Became a lead <time dateTime={createdAt.toISOString()} className="font-medium text-navy">{when(createdAt)}</time>
      </p>
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full bg-navy-50 px-2 py-0.5 font-semibold text-navy">{info.source}</span>
        {info.ad && <span className="rounded-full bg-orange/10 px-2 py-0.5 font-semibold text-orange-600">{info.ad}</span>}
        {info.vendor && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
            {info.vendorReason === "marked" ? "Sales pitch" : "Looks like a sales pitch"}
          </span>
        )}
      </div>
      {info.message && (
        <blockquote className="line-clamp-4 whitespace-pre-wrap border-l-2 border-orange pl-2 text-ink" title={info.message}>
          <span className="font-semibold text-navy">Sent a message: </span>
          {info.message}
        </blockquote>
      )}
      {info.details.length > 0 && (
        <ul className="space-y-0.5 text-ink">
          {info.details.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
      {(info.vendor || info.message) && (
        <form action={markVendor.bind(null, leadId)}>
          <input type="hidden" name="vendor" value={info.vendor ? "false" : "true"} />
          <SubmitButton pendingText="Saving…" className="font-semibold text-muted underline hover:text-navy">
            {info.vendor ? "Not a pitch, it's a real lead" : "Mark as sales pitch"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
