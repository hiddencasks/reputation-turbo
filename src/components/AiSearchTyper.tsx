"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { aiAssistants } from "@/lib/site";
import { Icon } from "./Icon";

const reduceQuery = "(prefers-reduced-motion: reduce)";
const allowsMotion = () => !window.matchMedia(reduceQuery).matches;
function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia(reduceQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * An AI-style search box that types real customer questions one after another, lighting up a
 * different assistant for each. With reduced motion it shows every question as a plain list.
 */
export function AiSearchTyper({ questions }: { questions: string[] }) {
  // false on the server and with reduced motion, so the plain list is the starting point.
  const motion = useSyncExternalStore(subscribeMotion, allowsMotion, () => false);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!motion) return;
    const full = questions[index];
    if (typed.length < full.length) {
      const t = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), 35);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setTyped("");
      setIndex((i) => (i + 1) % questions.length);
    }, 2200);
    return () => clearTimeout(t);
  }, [motion, typed, index, questions]);

  const active = aiAssistants[index % aiAssistants.length];

  return (
    <div>
      <div className="flex flex-wrap gap-2" aria-hidden={motion ? "true" : undefined}>
        {aiAssistants.map((a) => (
          <span
            key={a}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-300 ${
              motion && a === active ? "bg-orange text-white" : "bg-white text-navy ring-1 ring-inset ring-line"
            }`}
          >
            {a}
          </span>
        ))}
      </div>

      {motion ? (
        <>
          <div className="mt-4 flex items-center gap-3 rounded-full border-2 border-navy bg-white px-5 py-4 shadow-md">
            <Icon name="sparkle" className="h-5 w-5 shrink-0 text-orange" />
            <p className="min-h-[3rem] flex-1 text-lg text-ink sm:min-h-0" aria-hidden="true">
              {typed}
              <span className="caret ml-0.5 inline-block h-5 w-0.5 translate-y-1 bg-navy" />
            </p>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white">
              <Icon name="arrow" className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-sm text-muted" aria-hidden="true">
            Asking {active}...
          </p>
          {/* Screen readers get the whole list instead of the animation. */}
          <ul className="sr-only">
            {questions.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </>
      ) : (
        <ul className="mt-4 space-y-3">
          {questions.map((q) => (
            <li key={q} className="flex items-center gap-3 rounded-full border border-line bg-white px-5 py-3 text-ink shadow-sm">
              <Icon name="search" className="h-4 w-4 shrink-0 text-orange" />
              {q}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
