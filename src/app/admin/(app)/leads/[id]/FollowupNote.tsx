import type { Followup } from "@/lib/followup-text";
import { followupSignature } from "@/lib/followup-text";
import { createFollowup, rewriteFollowup, saveFollowup, sendFollowupNow, skipFollowup } from "../../../actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

const time = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "2-digit" });
const when = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });

const btn = "rounded-md px-3 py-2 text-sm font-semibold";

/**
 * The personal note that follows an emailed audit report: shows what will go
 * out and when, and lets the owner edit it, send it now, rewrite it or skip it.
 */
export function FollowupNote({ followup, checkId, to, tableReady }: { followup: Followup | undefined; checkId: string; to: string; tableReady: boolean }) {
  if (!tableReady) {
    return (
      <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
        Personal follow-up notes are off until the one-time database update is run (db/updates/2026-11-followup-notes.sql).
      </div>
    );
  }

  if (!followup) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-navy-50 p-3 text-sm">
        <span className="text-muted">No personal follow-up for this report yet.</span>
        <form action={createFollowup.bind(null, checkId)}>
          <SubmitButton pendingText="Writing…" className={`${btn} bg-white text-navy ring-1 ring-line`}>Write a personal follow-up</SubmitButton>
        </form>
      </div>
    );
  }

  const f = followup;
  const editable = f.status === "scheduled" || f.status === "failed" || f.status === "draft_failed" || f.status === "skipped";
  const status: Record<Followup["status"], string> = {
    writing: "Writing a note from this audit...",
    scheduled: `Goes out automatically ${time(f.send_at)} to ${to}`,
    sending: "Sending now...",
    sent: `Sent ${f.sent_at ? when(f.sent_at) : ""} to ${to}`,
    skipped: "Not sending",
    failed: "Sending failed",
    draft_failed: "Couldn't write the note",
  };
  const tone =
    f.status === "sent" ? "bg-green-100 text-green-900" : f.status === "scheduled" ? "bg-orange/10 text-orange-600" : f.status === "failed" || f.status === "draft_failed" ? "bg-red-50 text-red-800" : "bg-navy-50 text-navy";

  return (
    <div className="mt-4 rounded-md border border-line p-4" data-testid="followup-note">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-navy">Personal follow-up from you</h3>
        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${tone}`}>{status[f.status]}</span>
      </div>
      {f.note && f.status !== "writing" && (
        <p className="mt-1 text-xs text-muted">{f.status === "scheduled" || f.status === "sent" ? `Built on: ${f.note}` : f.note}</p>
      )}

      {f.status === "sent" || f.status === "sending" || f.status === "writing" ? (
        f.body ? (
          <div className="mt-3 rounded-md bg-navy-50 p-3 text-sm">
            <p className="font-semibold">{f.subject}</p>
            <p className="mt-2 whitespace-pre-wrap">{f.body}</p>
            <p className="mt-3 whitespace-pre-wrap text-muted">{followupSignature()}</p>
          </div>
        ) : null
      ) : (
        <form className="mt-3 space-y-2">
          <label className="block text-sm font-semibold">Subject
            <input name="subject" defaultValue={f.subject} required maxLength={120} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 font-normal" />
          </label>
          <label className="block text-sm font-semibold">Note
            <textarea name="body" defaultValue={f.body} required rows={7} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 font-normal" />
          </label>
          <p className="whitespace-pre-wrap text-xs text-muted">Signed automatically:{"\n"}{followupSignature()}</p>
          {editable && (
            <div className="flex flex-wrap gap-2">
              <SubmitButton formAction={saveFollowup.bind(null, f.id)} pendingText="Saving…" doneText="Saved" className={`${btn} bg-navy text-white`}>
                {f.status === "scheduled" ? "Save changes" : "Save and send automatically"}
              </SubmitButton>
              <SubmitButton formAction={sendFollowupNow.bind(null, f.id)} pendingText="Sending…" className={`${btn} bg-orange text-white`}>Send now</SubmitButton>
              <SubmitButton formAction={rewriteFollowup.bind(null, f.id)} formNoValidate pendingText="Rewriting…" className={`${btn} text-navy ring-1 ring-line`}>Write it again</SubmitButton>
              {f.status !== "skipped" && (
                <SubmitButton formAction={skipFollowup.bind(null, f.id)} formNoValidate pendingText="Saving…" className={`${btn} text-muted underline`}>Don&apos;t send</SubmitButton>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
