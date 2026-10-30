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

/* Homepage hero: made-up businesses' online check-ups, cycling to show what the free audit looks at. */

type Check = { detail: string; ok: boolean };
type Example = {
  name: string;
  trade: string;
  score: number;
  website: Check;
  google: Check;
  reviews: Check;
  maps: Check;
  /** Assistants that named the business. */
  aiFound: (typeof aiAssistants)[number][];
};

const examples: Example[] = [
  {
    name: "Mesa Ridge Roofing", trade: "Roofer · Santee", score: 41,
    website: { detail: "Works on phones", ok: true }, google: { detail: "Missing hours & photos", ok: false },
    reviews: { detail: "4.6★ from 23 reviews", ok: true }, maps: { detail: "Ranked #7 nearby", ok: false }, aiFound: [],
  },
  {
    name: "Helix Concrete Co.", trade: "Concrete · La Mesa", score: 58,
    website: { detail: "Slow: 6.8s to load", ok: false }, google: { detail: "Complete", ok: true },
    reviews: { detail: "4.8★ from 61 reviews", ok: true }, maps: { detail: "Ranked #4 nearby", ok: false }, aiFound: ["Gemini"],
  },
  {
    name: "Cuyamaca Plumbing", trade: "Plumber · El Cajon", score: 33,
    website: { detail: "No website found", ok: false }, google: { detail: "Not verified", ok: false },
    reviews: { detail: "Only 9 reviews", ok: false }, maps: { detail: "Ranked #12 nearby", ok: false }, aiFound: [],
  },
  {
    name: "Jamacha Air & Heat", trade: "HVAC · Spring Valley", score: 64,
    website: { detail: "Works on phones", ok: true }, google: { detail: "Complete", ok: true },
    reviews: { detail: "Last one 8 months ago", ok: false }, maps: { detail: "Ranked #3 nearby", ok: true }, aiFound: ["Perplexity"],
  },
  {
    name: "Lakeside Tree Pros", trade: "Tree service · Lakeside", score: 47,
    website: { detail: "Hard to use on phones", ok: false }, google: { detail: "Wrong service area", ok: false },
    reviews: { detail: "4.7★ from 38 reviews", ok: true }, maps: { detail: "Ranked #5 nearby", ok: false }, aiFound: [],
  },
];

const HOLD_MS = 7000;

function verdict(score: number) {
  if (score < 50) return "Customers can't find you easily";
  return "Room to grow";
}

export function HeroScorecard() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setIndex((i) => (i + 1) % examples.length), HOLD_MS);
    return () => clearTimeout(t);
  }, [index]);
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="font-display text-2xl font-bold uppercase italic leading-tight text-white sm:text-3xl">
        What your free audit <span className="text-orange">shows you</span>
      </p>
      <p className="mt-1 text-sm text-white/70">Example check-ups for made-up local businesses.</p>
      {/* A new key restarts the count-up and the rows for each business. */}
      <ScorecardCard key={index} ex={examples[index]} />
      <div className="mt-4 flex justify-center gap-2">
        {examples.map((ex, i) => (
          <button
            key={ex.name}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show example ${i + 1}: ${ex.trade}`}
            aria-current={i === index}
            className={`h-2.5 rounded-full transition-all ${i === index ? "w-6 bg-orange" : "w-2.5 bg-white/30 hover:bg-white/60"}`}
          />
        ))}
      </div>
    </div>
  );
}

function ScorecardCard({ ex }: { ex: Example }) {
  const score = useCountUp(ex.score, 1200, 200);
  const rows: { label: string; check: Check }[] = [
    { label: "Website", check: ex.website },
    { label: "Google Business Profile", check: ex.google },
    { label: "Reviews", check: ex.reviews },
    { label: "Google Maps ranking", check: ex.maps },
  ];
  const shown = useStagger(rows.length + 1, 250, 500);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <figure className="mt-4 rounded-2xl bg-white p-5 text-ink shadow-2xl ring-4 ring-white/10 sm:p-6" aria-label={`Example online check-up for ${ex.name}, a made-up business`}>
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
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold leading-tight text-navy">{ex.name}</p>
          <p className="text-sm text-muted">{ex.trade}</p>
          <p className="mt-2 inline-block rounded-full bg-orange/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-orange-600">{verdict(ex.score)}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {rows.map((row, i) => (
          <li key={row.label} className={`flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 transition-all duration-500 ${i < shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${row.check.ok ? "bg-green-600" : "bg-orange"}`}>
              {row.check.ok ? <Icon name="check" className="h-3 w-3" /> : <span className="text-xs font-bold">!</span>}
            </span>
            <span className="font-semibold">{row.label}</span>
            <span className="ml-auto text-right text-xs text-muted">{row.check.detail}</span>
          </li>
        ))}
        <li className={`rounded-lg border-2 border-orange px-3 py-2 transition-all duration-500 ${rows.length < shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">!</span>
            <span className="font-semibold">Named by AI assistants</span>
            <span className="ml-auto text-xs font-bold text-orange-600">{ex.aiFound.length} of {aiAssistants.length}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
            {aiAssistants.map((a) => {
              const found = ex.aiFound.includes(a);
              return (
                <span key={a} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${found ? "bg-green-50 text-green-800" : "bg-navy-50 text-muted"}`}>
                  {a} {found ? <span className="text-green-700">✓</span> : <span className="text-orange-600">✕</span>}
                </span>
              );
            })}
          </div>
        </li>
      </ul>
    </figure>
  );
}
