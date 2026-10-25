"use client";

import { useState } from "react";

type Option = { name: string; kind: "package" | "addon" | "plan" };

const groups: { kind: Option["kind"]; label: string }[] = [
  { kind: "package", label: "Packages" },
  { kind: "plan", label: "Monthly plans" },
  { kind: "addon", label: "Add-ons" },
];

/** Checkboxes for the lead's recommended packages, sent as repeated `recommendedPackage` fields. */
export function PackagePicker({ options, selected, suggested }: { options: Option[]; selected: string[]; suggested: string[] }) {
  const [picked, setPicked] = useState<string[]>(selected);
  const toggle = (name: string) => setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));
  // Keep any saved value that is no longer an offering, so saving doesn't silently drop it.
  const extra = picked.filter((n) => !options.some((o) => o.name === n));

  return (
    <fieldset className="text-sm">
      <legend className="font-semibold">Recommended package</legend>
      <details className="mt-1 rounded-md border border-line bg-white">
        <summary className="cursor-pointer px-3 py-2">{picked.length ? picked.join(", ") : "Choose one or more..."}</summary>
        <div className="space-y-3 border-t border-line px-3 py-3">
          {suggested.length > 0 && (
            <button type="button" onClick={() => setPicked(suggested)} className="rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-white">
              Use suggested
            </button>
          )}
          {groups.map((g) => (
            <div key={g.kind}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{g.label}</p>
              {options.filter((o) => o.kind === g.kind).map((o) => (
                <label key={o.name} className="mt-1 flex items-center gap-2 font-normal">
                  <input type="checkbox" checked={picked.includes(o.name)} onChange={() => toggle(o.name)} />
                  {o.name}
                </label>
              ))}
            </div>
          ))}
          {extra.map((n) => (
            <label key={n} className="flex items-center gap-2 font-normal">
              <input type="checkbox" checked onChange={() => toggle(n)} /> {n}
            </label>
          ))}
        </div>
      </details>
      {picked.map((n) => <input key={n} type="hidden" name="recommendedPackage" value={n} />)}
    </fieldset>
  );
}
