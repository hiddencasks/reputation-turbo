"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {pending ? "Deleting..." : "Yes, delete forever"}
    </button>
  );
}

/** Two-step delete: the first click only opens a warning, the second one deletes. */
export function DeleteLead({ name, action }: { name: string; action: (formData: FormData) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-md px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
        Delete lead
      </button>
    );
  }

  return (
    <form action={action} role="alertdialog" aria-labelledby="delete-lead-title" className="rounded-md border border-red-200 bg-red-50 p-4">
      <p id="delete-lead-title" className="font-semibold text-red-800">Delete {name} for good?</p>
      <p className="mt-1 text-sm text-red-800">
        This permanently removes the lead, its notes, history, audits and email log. Any report link you shared will stop working. This can&apos;t be undone.
      </p>
      <input type="hidden" name="confirm" value="delete" />
      <div className="mt-3 flex flex-wrap gap-2">
        <ConfirmButton />
        <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-navy ring-1 ring-line">
          Cancel
        </button>
      </div>
    </form>
  );
}
