"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { formatPhone } from "@/lib/phone";
import { clean, DAYS, intakeDef, TIMES, visible, withCities, type Field, type Fields, type HoursDay } from "@/lib/projects/intake";

export type SaveResult = { ok: boolean; done: boolean; error?: string };

const box = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2.5 text-base";
const sel = "mt-1 w-full rounded-md border border-line bg-white px-2 py-2.5 text-base";

/** One checklist item as a simple form. Every Save stores it; it can be changed any time. */
export function IntakeForm({ itemKey, itemId, cities, initial, action, compact }: {
  itemKey: string;
  itemId: string;
  cities: string[];
  initial: Fields;
  action: (formData: FormData) => Promise<SaveResult>;
  compact?: boolean;
}) {
  const base = intakeDef(itemKey);
  const def = base ? withCities(base, cities) : undefined;
  const [values, setValues] = useState<Fields>(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "dirty" | "error">("idle");
  const [message, setMessage] = useState("");
  if (!def?.fields) return null;
  const shown = clean(def, values);
  const id = (name: string) => `${itemId}-${name}`;

  const set = (name: string, value: Fields[string]) => {
    setValues((v) => ({ ...v, [name]: value }));
    setStatus("dirty");
  };

  async function submit(formData: FormData) {
    const res = await action(formData);
    if (res.ok) {
      setStatus("saved");
      setMessage(res.done ? "Saved. This item is done. You can still change it any time." : "Saved. Come back any time to finish or change it.");
    } else {
      setStatus("error");
      setMessage(res.error || "That didn't save. Please try again.");
    }
  }

  return (
    <div className="mt-3">
      {def.steps && def.steps.length > 0 && (
        <div className="mb-4 rounded-md bg-navy-50 p-4">
          <p className="font-semibold text-navy">How to do it</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {def.steps.map((step, i) => (
              <li key={i}>
                {step.text}
                {step.link && (
                  <>
                    {" "}
                    <a href={step.link.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-orange underline">
                      {step.link.label} ↗
                    </a>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <form action={submit} className="grid gap-4 sm:grid-cols-2">
        {def.fields.filter((f) => visible(f, shown)).map((field) => (
          <div key={field.name} className={"half" in field && field.half ? "" : "sm:col-span-2"}>
            <FieldInput field={field} values={shown} set={set} id={id} />
          </div>
        ))}
        <div className={`flex flex-wrap items-center gap-3 sm:col-span-2 ${compact ? "" : "border-t border-line pt-3"}`}>
          <SubmitButton pendingText="Saving…" className="rounded-md bg-navy px-5 py-2.5 font-semibold text-white">Save</SubmitButton>
          <span role="status" className={`text-sm ${status === "saved" ? "font-semibold text-green-800" : status === "error" ? "font-semibold text-red-700" : "text-muted"}`}>
            {status === "dirty" ? "Not saved yet. Tap Save to keep your changes." : status === "idle" ? "" : message}
          </span>
        </div>
      </form>
    </div>
  );
}

function FieldInput({ field, values, set, id }: { field: Field; values: Fields; set: (name: string, v: Fields[string]) => void; id: (n: string) => string }) {
  const label = "block font-medium text-navy";
  const help = "help" in field && field.help ? <p className="mt-0.5 text-sm text-muted">{field.help}</p> : null;
  const str = (n: string) => (typeof values[n] === "string" ? (values[n] as string) : "");
  const name = `f.${field.name}`;

  switch (field.type) {
    case "textarea":
      return (
        <>
          <label htmlFor={id(field.name)} className={label}>{field.label}</label>
          {help}
          <textarea id={id(field.name)} name={name} rows={4} maxLength={4000} placeholder={field.placeholder} value={str(field.name)} onChange={(e) => set(field.name, e.target.value)} className={box} />
        </>
      );
    case "text":
    case "email":
    case "tel":
    case "url":
      return (
        <>
          <label htmlFor={id(field.name)} className={label}>{field.label}</label>
          {help}
          <input
            id={id(field.name)}
            name={name}
            type={field.type}
            inputMode={field.type === "tel" ? "tel" : undefined}
            autoComplete={field.autoComplete}
            maxLength={300}
            placeholder={field.placeholder}
            value={str(field.name)}
            onChange={(e) => set(field.name, field.type === "tel" ? formatPhone(e.target.value) : e.target.value)}
            className={box}
          />
        </>
      );
    case "select":
      return (
        <>
          <label htmlFor={id(field.name)} className={label}>{field.label}</label>
          {help}
          <select id={id(field.name)} name={name} value={str(field.name)} onChange={(e) => set(field.name, e.target.value)} className={sel}>
            <option value="">Choose…</option>
            {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </>
      );
    case "radio":
      return (
        <fieldset>
          <legend className={label}>{field.label}</legend>
          {help}
          <div className="mt-2 space-y-2">
            {field.options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2.5 has-[:checked]:border-orange has-[:checked]:bg-orange/5">
                <input type="radio" name={name} value={o.value} checked={values[field.name] === o.value} onChange={() => set(field.name, o.value)} className="h-5 w-5 shrink-0 accent-orange" />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    case "checkbox":
      return (
        <>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2.5 has-[:checked]:border-green-600 has-[:checked]:bg-green-50">
            <input type="checkbox" name={name} checked={values[field.name] === true} onChange={(e) => set(field.name, e.target.checked)} className="h-5 w-5 shrink-0 accent-green-700" />
            <span className="font-medium">{field.label}</span>
          </label>
          {help}
        </>
      );
    case "checkboxes": {
      const picked = Array.isArray(values[field.name]) ? (values[field.name] as string[]) : [];
      return (
        <fieldset>
          <legend className={label}>{field.label}</legend>
          {help}
          <p className="text-sm text-muted">Tick all that apply.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {field.options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2 has-[:checked]:border-orange has-[:checked]:bg-orange/5">
                <input
                  type="checkbox"
                  name={name}
                  value={o.value}
                  checked={picked.includes(o.value)}
                  onChange={(e) => set(field.name, e.target.checked ? [...picked, o.value] : picked.filter((x) => x !== o.value))}
                  className="h-5 w-5 shrink-0 accent-orange"
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
          {field.other && (
            <div className="mt-3">
              <label htmlFor={id(`${field.name}_other`)} className="text-sm font-medium text-navy">Other (optional)</label>
              <input id={id(`${field.name}_other`)} name={`f.${field.name}_other`} maxLength={500} value={str(`${field.name}_other`)} onChange={(e) => set(`${field.name}_other`, e.target.value)} className={box} />
            </div>
          )}
        </fieldset>
      );
    }
    case "hours":
      return <HoursInput field={field} values={values} set={set} id={id} />;
  }
}

function HoursInput({ field, values, set, id }: { field: Field; values: Fields; set: (name: string, v: Fields[string]) => void; id: (n: string) => string }) {
  const raw = values[field.name];
  const week: Record<string, HoursDay> = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, HoursDay>) : {};
  const day = (d: string): HoursDay => week[d] ?? { open: "", close: "", closed: false };
  const update = (d: string, patch: Partial<HoursDay>) => set(field.name, { ...week, [d]: { ...day(d), ...patch } });
  const copyMonday = () => {
    const mon = day("mon");
    set(field.name, { ...week, tue: { ...mon }, wed: { ...mon }, thu: { ...mon }, fri: { ...mon } });
  };
  const name = (d: string, part: string) => `f.${field.name}.${d}.${part}`;

  return (
    <fieldset>
      <legend className="block font-medium text-navy">Open and close times</legend>
      <div className="mt-2 space-y-2">
        {DAYS.map((d) => {
          const v = day(d.id);
          return (
            <div key={d.id} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 rounded-md border border-line p-2 sm:grid-cols-[7rem_1fr_1fr_auto]">
              <span className="font-medium">{d.label}</span>
              {v.closed ? (
                <span className="text-muted sm:col-span-2">Closed</span>
              ) : (
                <div className="col-span-1 grid grid-cols-2 gap-2 sm:col-span-2">
                  <label className="sr-only" htmlFor={id(`${d.id}-open`)}>{d.label} opens</label>
                  <select id={id(`${d.id}-open`)} name={name(d.id, "open")} value={v.open} onChange={(e) => update(d.id, { open: e.target.value })} className={sel}>
                    <option value="">Opens…</option>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="sr-only" htmlFor={id(`${d.id}-close`)}>{d.label} closes</label>
                  <select id={id(`${d.id}-close`)} name={name(d.id, "close")} value={v.close} onChange={(e) => update(d.id, { close: e.target.value })} className={sel}>
                    <option value="">Closes…</option>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              {v.closed && (
                <>
                  <input type="hidden" name={name(d.id, "open")} value="" />
                  <input type="hidden" name={name(d.id, "close")} value="" />
                </>
              )}
              <label className="col-span-2 flex items-center gap-2 text-sm sm:col-span-1">
                <input type="checkbox" name={name(d.id, "closed")} checked={v.closed} onChange={(e) => update(d.id, { closed: e.target.checked })} className="h-5 w-5 shrink-0 accent-navy" />
                Closed
              </label>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={copyMonday} className="mt-2 text-sm font-semibold text-orange underline">Copy Monday to Tuesday through Friday</button>
    </fieldset>
  );
}
