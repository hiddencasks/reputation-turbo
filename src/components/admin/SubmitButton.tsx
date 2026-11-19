"use client";

import { Suspense, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";

type Props = Omit<ComponentProps<"button">, "type" | "children"> & {
  children: ReactNode;
  /** Label while the action runs, e.g. "Saving…". */
  pendingText?: ReactNode;
  /** Short confirmation shown for a few seconds after it finishes, e.g. "Saved". Leave out when the page itself changes. */
  doneText?: ReactNode;
  /** For plain search forms that just change the page address instead of running a server action. */
  navigates?: boolean;
};

/** Calls onChange whenever the page address's query changes (kept separate so useSearchParams sits inside Suspense). */
function OnSearchChange({ onChange }: { onChange: () => void }) {
  const params = useSearchParams().toString();
  const first = useRef(true);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    latest.current();
  }, [params]);
  return null;
}

function Spinner() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The dashboard's submit button. It presses in when clicked, then greys out with a
 * spinner and a working label while its form's server action runs (so it can't be
 * clicked twice), and flashes a short confirmation when it's done.
 */
export function SubmitButton({ children, pendingText = "Working…", doneText, navigates, className = "", disabled, onClick, formAction, name, value, ...rest }: Props) {
  const status = useFormStatus();
  const [clicked, setClicked] = useState(false);
  const [done, setDone] = useState(false);

  // Which button started it: the one clicked, or (for Enter key / multi-button forms) the one whose action or name/value matches.
  const matches =
    clicked ||
    (formAction ? status.action === formAction : name ? status.data?.get(name) === String(value ?? "") : true);
  const active = navigates ? clicked : status.pending && matches;
  const busy = navigates ? clicked : status.pending;

  // When this button's work finishes, forget the click and flash the confirmation (state adjusted during render, not in an effect).
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setDone(false);
    else {
      setClicked(false);
      if (doneText) setDone(true);
    }
  }
  // Forget a click whose form never started or already finished, so it can't mark the wrong button later.
  const [wasPending, setWasPending] = useState(status.pending);
  if (status.pending !== wasPending) {
    setWasPending(status.pending);
    if (!status.pending && !navigates) setClicked(false);
  }

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 2500);
    return () => clearTimeout(t);
  }, [done]);

  // A search form is finished once the page address changes, or after a safety timeout.
  useEffect(() => {
    if (!navigates || !clicked) return;
    const t = setTimeout(() => setClicked(false), 10000);
    return () => clearTimeout(t);
  }, [navigates, clicked]);

  return (
    <button
      {...rest}
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={disabled || busy}
      aria-busy={active || undefined}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && e.currentTarget.form?.checkValidity() !== false) setClicked(true);
      }}
      className={`${className} transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${active ? "!cursor-wait" : ""}`}
    >
      <span className="inline-flex items-center gap-2">
        {active ? (
          <>
            <Spinner />
            {pendingText}
          </>
        ) : done ? (
          <>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg>
            {doneText}
          </>
        ) : (
          children
        )}
      </span>
      {navigates ? (
        <Suspense fallback={null}>
          <OnSearchChange onChange={() => setClicked(false)} />
        </Suspense>
      ) : null}
    </button>
  );
}
