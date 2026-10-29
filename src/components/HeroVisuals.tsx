"use client";

import { useEffect, useState } from "react";
import { aiAssistants } from "@/lib/site";
import { Icon } from "./Icon";

/** Counts from 0 up to `to` once, unless the visitor prefers reduced motion. */
function useCountUp(to: number, ms = 1600, delay = 300) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / ms));
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(count);
      return;
    }
    const timers = Array.from({ length: count }, (_, i) => setTimeout(() => setShown(i + 1), delay + i * step));
    return () => timers.forEach(clearTimeout);
  }, [count, step, delay]);
  return shown;
}

function ExampleChip() {
  return <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-muted">Example</span>;
}

/* ---------- Concept A: online check-up scorecard ---------- */

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

/* ---------- Concept B: Google Maps style top-3 climb ---------- */

const mapPros = ["Canyon Crew Plumbing", "Summit Plumbing & Rooter", "Valley Standard Plumbing", "Lakeside Pipe Pros", "Grossmont Drain Co."];

export function HeroMapClimb() {
  // "Your business" starts at #6 and climbs one spot at a time to #3.
  const [rank, setRank] = useState(6);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRank(3);
      return;
    }
    const timers = [5, 4, 3].map((n, i) => setTimeout(() => setRank(n), 1200 + i * 900));
    return () => timers.forEach(clearTimeout);
  }, []);
  const rows = [...mapPros];
  rows.splice(rank - 1, 0, "You");
  return (
    <figure className="mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-4 ring-white/10" aria-label="Example of a business climbing into the top 3 of local map results">
      {/* Simple drawn map: streets, a park and pins. */}
      <div className="relative h-40 bg-[#eef2f6]">
        <svg aria-hidden="true" viewBox="0 0 400 160" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <rect x="250" y="20" width="90" height="55" rx="8" fill="#d9ecd9" />
          <path d="M0 110 C120 90 220 130 400 95" stroke="#fff" strokeWidth="14" fill="none" />
          <path d="M0 110 C120 90 220 130 400 95" stroke="#ffd9a8" strokeWidth="6" fill="none" />
          <path d="M140 0 L170 160 M60 0 L40 160 M320 0 L300 160 M0 45 L400 30" stroke="#fff" strokeWidth="6" fill="none" />
        </svg>
        {[
          [18, 30], [72, 22], [48, 62], [86, 58], [30, 76],
        ].map(([x, y], i) => (
          <span key={i} className="absolute -translate-x-1/2 -translate-y-full text-navy/40" style={{ left: `${x}%`, top: `${y}%` }}>
            <Icon name="pin" className="h-6 w-6" />
          </span>
        ))}
        <span className={`absolute -translate-x-1/2 -translate-y-full transition-all duration-700 ${rank <= 3 ? "text-orange" : "text-navy/50"}`} style={{ left: "58%", top: "48%" }}>
          <Icon name="pin" className={`transition-all duration-700 ${rank <= 3 ? "h-11 w-11 drop-shadow-lg" : "h-7 w-7"}`} />
        </span>
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted shadow">plumber near El Cajon</span>
        <span className="absolute right-3 top-3"><ExampleChip /></span>
      </div>
      <ol className="relative divide-y divide-line px-4 py-2 text-sm">
        {rows.slice(0, 6).map((name, i) => {
          const you = name === "You";
          const top3 = i < 3;
          return (
            <li key={name} className={`flex items-center gap-3 py-2 transition-all duration-500 ${you ? "-mx-2 rounded-lg bg-orange/10 px-2" : ""} ${!top3 && !you ? "opacity-50" : ""}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${top3 ? "bg-navy text-white" : "bg-navy-50 text-muted"}`}>{i + 1}</span>
              <span className={`font-semibold ${you ? "text-orange-600" : ""}`}>{you ? "Your business" : name}</span>
              {you && i < 3 && <span className="ml-auto rounded-full bg-orange px-2 py-0.5 text-[11px] font-bold uppercase text-white">Top 3</span>}
              {!you && <span className="ml-auto text-xs text-muted"><span className="text-orange">★</span> {(4.9 - i * 0.1).toFixed(1)}</span>}
            </li>
          );
        })}
      </ol>
      <p className="border-t border-line bg-navy-50/60 px-4 py-2.5 text-xs text-muted">Most calls go to the top 3. Example businesses, not real ones.</p>
    </figure>
  );
}

/* ---------- Concept C: AI answer across all five assistants ---------- */

const questions = [
  { q: "Who's the best roofer in Santee?", pros: ["Mesa Ridge Roofing", "Mission Trails Roof Co.", "Santee Tile & Shingle"] },
  { q: "Good concrete contractor in La Mesa?", pros: ["Grossmont Concrete", "Helix Flatwork", "La Mesa Stone & Slab"] },
  { q: "Who can fix my AC in El Cajon today?", pros: ["Valley Air Pros", "East County Cooling", "Fletcher Hills HVAC"] },
];

export function HeroAiAnswer() {
  const [qi, setQi] = useState(0);
  const [typed, setTyped] = useState(0);
  const [reduced, setReduced] = useState(false);
  const q = questions[qi];
  const done = typed >= q.q.length;
  const shown = useAnswerStagger(done, qi);

  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  useEffect(() => {
    if (reduced) {
      setTyped(q.q.length);
      return;
    }
    if (!done) {
      const t = setTimeout(() => setTyped((n) => n + 1), 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setQi((i) => (i + 1) % questions.length);
      setTyped(0);
    }, 4200);
    return () => clearTimeout(t);
  }, [typed, done, q.q.length, reduced]);

  return (
    <figure className="mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-4 ring-white/10" aria-label="Example of AI assistants recommending three local businesses">
      <div className="flex flex-wrap gap-1 border-b border-line bg-navy-50/60 px-3 pt-3">
        {aiAssistants.map((a, i) => (
          <span key={a} className={`rounded-t-lg px-2.5 py-1.5 text-xs font-semibold ${i === qi % aiAssistants.length ? "bg-white text-navy shadow-[0_-1px_0_0_var(--color-line)]" : "text-muted"}`}>{a}</span>
        ))}
      </div>
      <div className="space-y-3 p-4">
        <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-navy px-3.5 py-2 text-[15px] text-white">
          {q.q.slice(0, typed)}
          {!done && <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-white" />}
        </p>
        <div className="space-y-2">
          {q.pros.map((p, i) => (
            <div key={p} className={`flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm transition-all duration-500 ${i < shown ? "opacity-100" : "translate-y-1 opacity-0"}`}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
              <span className="font-semibold">{p}</span>
              <span className="ml-auto text-xs text-muted"><span className="text-orange">★</span> {(4.9 - i * 0.1).toFixed(1)}</span>
            </div>
          ))}
          <div className={`flex items-center gap-3 rounded-lg border-2 border-dashed border-orange bg-orange/5 px-3 py-2 text-sm transition-all duration-500 ${shown > 3 ? "opacity-100" : "opacity-0"}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">?</span>
            <span className="font-semibold text-orange-600">Where&apos;s your business?</span>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs text-muted">
        <ExampleChip /> Example businesses, not real ones.
      </p>
    </figure>
  );
}

function useAnswerStagger(ready: boolean, key: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!ready) return;
    const timers = [1, 2, 3, 4].map((n) => setTimeout(() => setShown(n), 250 + n * 350));
    return () => timers.forEach(clearTimeout);
  }, [ready, key]);
  return shown;
}
