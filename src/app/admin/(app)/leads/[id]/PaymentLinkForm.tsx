"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { PaymentLinkState } from "../../../actions";

type Option = { value: string; label: string };
type Props = {
  action: (prev: PaymentLinkState, formData: FormData) => Promise<PaymentLinkState>;
  groups: { label: string; options: Option[] }[];
};

/** Makes a Stripe payment link and shows it right here to copy, without reloading the lead page. */
export function PaymentLinkForm({ action, groups }: Props) {
  const [state, formAction] = useActionState(action, { error: "", url: "", label: "" });
  const [copied, setCopied] = useState(false);
  const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2";

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <label className="text-sm font-semibold">Payment link for
        <select name="what" required className={input} defaultValue="">
          <option value="" disabled>Choose…</option>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
          <option value="custom">Something else (type a name and amount)</option>
        </select>
      </label>
      <label className="text-sm font-semibold">Name (optional)
        <input name="name" placeholder="e.g. Founding client deposit" className={input} />
      </label>
      <label className="text-sm font-semibold">Amount $ (optional)
        <input name="amount" inputMode="decimal" placeholder="Uses the price" className={input} />
      </label>
      <SubmitButton pendingText="Making link…" className="rounded-md bg-navy px-4 py-2 font-semibold text-white">Make payment link</SubmitButton>
      <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" name="monthly" /> Charge monthly (only for &quot;Something else&quot;)</label>
      {state.error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-4">{state.error}</p>}
      {state.url && (
        <div className="rounded-md bg-green-50 p-3 text-sm sm:col-span-4">
          <p className="font-semibold text-green-800">Payment link ready: {state.label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a href={state.url} target="_blank" rel="noreferrer" className="break-all font-semibold text-navy underline">{state.url}</a>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(state.url).then(() => setCopied(true), () => setCopied(false))}
              className="rounded-md border border-line bg-white px-3 py-1 font-semibold text-navy"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted sm:col-span-4">
        Copy the link into an email or text. When they pay, it shows up here, the lead moves to Won for project payments, and you get an email.
        For a founding client, type the discounted amount, or let them use your Stripe promotion code at checkout.
      </p>
    </form>
  );
}
