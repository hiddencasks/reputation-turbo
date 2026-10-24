"use client";

import { useActionState } from "react";
import { createProspect, type ProspectState } from "../../actions";

const initial: ProspectState = { errors: {}, values: {} };

const fields = [
  { name: "businessName", label: "Business name", required: true },
  { name: "trade", label: "Type of business", required: true, list: "prospect-trades" },
  { name: "city", label: "City", required: true, list: "prospect-cities" },
  { name: "website", label: "Website" },
  { name: "firstName", label: "Contact first name" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
];

/** Adds a business you want to reach out to, and runs its AI check so you have something to send. */
export function ProspectForm({ industries, cities, canCheck }: { industries: readonly string[]; cities: readonly string[]; canCheck: boolean }) {
  const [state, action, pending] = useActionState(createProspect, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Add a prospect">
      {fields.map((f) => (
        <label key={f.name} className="text-sm font-semibold">
          {f.label}
          {!f.required && <span className="font-normal text-muted"> (optional)</span>}
          <input
            name={f.name}
            type={f.type ?? "text"}
            list={f.list}
            defaultValue={state.values[f.name] ?? ""}
            aria-invalid={state.errors[f.name] ? true : undefined}
            className={`mt-1 w-full rounded-md border bg-white px-3 py-2 font-normal ${state.errors[f.name] ? "border-red-600" : "border-line"}`}
          />
          {state.errors[f.name] && <span className="mt-1 block text-xs font-medium text-red-700">{state.errors[f.name]}</span>}
        </label>
      ))}
      <datalist id="prospect-trades">{industries.map((i) => <option key={i} value={i} />)}</datalist>
      <datalist id="prospect-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1">
        {canCheck && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="runCheck" defaultChecked /> Run AI check now
          </label>
        )}
        <button disabled={pending} className="rounded-md bg-orange px-4 py-2 font-semibold text-white disabled:opacity-60">
          {pending ? "Adding..." : "Add prospect"}
        </button>
      </div>
    </form>
  );
}
