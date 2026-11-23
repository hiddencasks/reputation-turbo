"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { TimeFormState } from "./actions";

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Ticking clock for a running timer. */
export function Elapsed({ since }: { since: string }) {
  const start = new Date(since).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono tabular-nums">{now === null ? "0:00:00" : clock(now - start)}</span>;
}

export function TimerButtons({ running, since, start, stop }: { running: boolean; since?: string; start: () => Promise<void>; stop: () => Promise<void> }) {
  return running ? (
    <form action={stop} className="flex items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-900">
        <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
        {since ? <Elapsed since={since} /> : null}
      </span>
      <SubmitButton pendingText="Stopping…" className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">Stop</SubmitButton>
    </form>
  ) : (
    <form action={start}>
      <SubmitButton pendingText="Starting…" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-semibold text-white">Start timer</SubmitButton>
    </form>
  );
}

export function AddTimeForm({ action }: { action: (prev: TimeFormState, formData: FormData) => Promise<TimeFormState> }) {
  const [state, formAction] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold">Time
        <input name="minutes" required placeholder="45 or 1:30" className="mt-1 block w-28 rounded-md border border-line bg-white px-2 py-1.5 text-sm font-normal" />
      </label>
      <label className="min-w-40 flex-1 text-xs font-semibold">What for (optional)
        <input name="note" maxLength={300} className="mt-1 block w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm font-normal" />
      </label>
      <SubmitButton pendingText="Adding…" doneText="Added" className="rounded-md px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-line">Add time</SubmitButton>
      {state.error && <p role="alert" className="w-full text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

export function CopyLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} aria-label="Portal link" className="min-w-0 flex-1 rounded-md border border-line bg-navy-50 px-3 py-2 text-sm" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        className="rounded-md px-3 py-2 text-sm font-semibold text-navy ring-1 ring-line transition active:scale-95"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
