"use client";

import { useEffect, useState } from "react";
import { aiAssistants } from "@/lib/site";
import { Icon } from "./Icon";

/** Counts from 0 up to `to` once, unless the visitor prefers reduced motion. */
function useCountUp(to: number, ms = 1600, delay = 300) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (t: number) => {
      const p = reduced ? 1 : Math.min(1, Math.max(0, (t - start) / ms));
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay]);
  return n;
}

/** Shows items one at a time: returns how many are visible so far. */
function useStagger(count: number, step = 350, delay = 600) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = Array.from({ length: count }, (_, i) => setTimeout(() => setShown(i + 1), reduced ? 0 : delay + i * step));
    return () => timers.forEach(clearTimeout);
  }, [count, step, delay]);
  return shown;
}

function ExampleChip() {
  return <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-muted">Example</span>;
}

/* Homepage hero: a made-up business's online check-up, showing what the free audit looks at. */

const checkRows: { label: string; detail: string; ok: boolean }[] = [
  { label: "Website works on phones", detail: "Loads in 2.1s", ok: true },
  { label: "Google Business Profile", detail: "Missing hours & photos", ok: false },
  { label: "Reviews", detail: "4.6★ from 23 reviews", ok: true },
  { label: "Top 3 on Google Maps", detail: "Ranked #7 nearby", ok: false },
];

export function HeroScorecard() {
  const score = useCountUp(41);
  const shown = useStagger(checkRows.length + 1, 300, 900);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <figure className="mx-auto w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-2xl ring-4 ring-white/10 sm:p-6" aria-label="Example online check-up score for a made-up business">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white"><Icon name="chart" className="h-4 w-4" /></span>
        <span className="text-sm font-semibold">Online check-up</span>
        <span className="ml-auto"><ExampleChip /></span>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-navy-50)" strokeWidth="12" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-orange)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-extrabold leading-none text-navy">{score}</span>
            <span className="text-xs font-semibold text-muted">out of 100</span>
          </div>
        </div>
        <div>
          <p className="font-display text-2xl font-bold leading-tight text-navy">Mesa Ridge Roofing</p>
          <p className="text-sm text-muted">Roofer · Santee</p>
          <p className="mt-2 inline-block rounded-full bg-orange/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-orange-600">Customers can&apos;t find you easily</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {checkRows.map((row, i) => (
          <li key={row.label} className={`flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 transition-all duration-500 ${i < shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${row.ok ? "bg-green-600" : "bg-orange"}`}>
              {row.ok ? <Icon name="check" className="h-3 w-3" /> : <span className="text-xs font-bold">!</span>}
            </span>
            <span className="font-semibold">{row.label}</span>
            <span className="ml-auto text-right text-xs text-muted">{row.detail}</span>
          </li>
        ))}
        <li className={`rounded-lg border-2 border-orange px-3 py-2 transition-all duration-500 ${checkRows.length < shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">!</span>
            <span className="font-semibold">Named by AI assistants</span>
            <span className="ml-auto text-xs font-bold text-orange-600">0 of 5</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
            {aiAssistants.map((a) => (
              <span key={a} className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-muted">{a} <span className="text-orange-600">✕</span></span>
            ))}
          </div>
        </li>
      </ul>
    </figure>
  );
}
