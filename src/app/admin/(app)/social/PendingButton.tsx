"use client";

import { useFormStatus } from "react-dom";

/** A submit button that greys out and shows a working label while its form's server action runs. */
export function PendingButton({ children, pendingText, className }: { children: React.ReactNode; pendingText: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} transition active:scale-95 disabled:cursor-wait disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
