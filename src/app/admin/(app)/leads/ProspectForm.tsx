"use client";

import { useActionState, useState } from "react";
import { createProspect, type ProspectState } from "../../actions";

type Field = { name: string; label: string; required?: boolean; type?: string; list?: string; placeholder?: string };

const business: Field[] = [
  { name: "businessName", label: "Business name", required: true },
  { name: "trade", label: "Type of business", required: true, list: "prospect-trades" },
  { name: "city", label: "City", required: true, list: "prospect-cities" },
  { name: "website", label: "Website", placeholder: "theirbusiness.com" },
];

const contact: Field[] = [
  { name: "firstName", label: "First name" },
  { name: "lastName", label: "Last name" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
];

const kinds = [
  { id: "prospect", label: "A business I'm reaching out to", hint: "Goes in New Prospect. Run the audit, approve it, then send the link in your message." },
  { id: "customer", label: "A customer who asked me for an audit", hint: "For someone who called, texted or asked in person. Goes in Audit In Progress, like a website request." },
];

/**
 * Adds a lead by hand, either a prospect for outreach or a customer who asked
 * for an audit, and can start the full audit right away.
 */
export function ProspectForm({ industries, cities, canCheck }: { industries: readonly string[]; cities: readonly string[]; canCheck: boolean }) {
  const [state, action, pending] = useActionState(createProspect, initial);
  const [kind, setKind] = useState(state.values.kind || "prospect");

  const input = (f: Field) => (
    <label key={f.name} className="text-sm font-semibold">
      {f.label}
      {!f.required && <span className="font-normal text-muted"> (optional)</span>}
      <input
        name={f.name}
        type={f.type ?? "text"}
        list={f.list}
        placeholder={f.placeholder}
        defaultValue={state.values[f.name] ?? ""}
        aria-invalid={state.errors[f.name] ? true : undefined}
        className={`mt-1 w-full rounded-md border bg-white px-3 py-2 font-normal ${state.errors[f.name] ? "border-red-600" : "border-line"}`}
      />
      {state.errors[f.name] && <span className="mt-1 block text-xs font-medium text-red-700">{state.errors[f.name]}</span>}
    </label>
  );

  return (
    <form action={action} className="space-y-6" aria-label="Add a lead">
      <fieldset>
        <legend className="font-semibold text-navy">Who is this for?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {kinds.map((k) => (
            <label key={k.id} className={`flex cursor-pointer gap-3 rounded-md border p-3 ${kind === k.id ? "border-orange bg-orange/5" : "border-line bg-white"}`}>
              <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="mt-1" />
              <span>
                <span className="block font-semibold text-navy">{k.label}</span>
                <span className="block text-sm text-muted">{k.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-semibold text-navy">Business</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">{business.map(input)}</div>
      </fieldset>

      <fieldset>
        <legend className="font-semibold text-navy">Contact person</legend>
        <p className="text-sm text-muted">
          {kind === "customer" ? "Add their email so you can send the report from the dashboard." : "All optional. Without an email you can still copy the report link into a text or DM."}
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">{contact.map(input)}</div>
      </fieldset>

      <label className="block text-sm font-semibold">
        Notes <span className="font-normal text-muted">(optional)</span>
        <textarea
          name="note"
          rows={3}
          defaultValue={state.values.note ?? ""}
          placeholder="Where you met, what they asked about, best time to call..."
          className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 font-normal"
        />
      </label>

      <datalist id="prospect-trades">{industries.map((i) => <option key={i} value={i} />)}</datalist>
      <datalist id="prospect-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>

      <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending} className="rounded-md bg-orange px-5 py-2.5 font-semibold text-white disabled:opacity-60">
          {pending ? "Adding..." : "Add lead"}
        </button>
        {canCheck && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="runCheck" defaultChecked /> Run the full audit now
            <span className="text-muted">(website, Google and AI check; uses paid AI calls)</span>
          </label>
        )}
      </div>
    </form>
  );
}

const initial: ProspectState = { errors: {}, values: {} };
