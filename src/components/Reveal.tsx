"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Fades children in one after another the first time they scroll into view.
 * Without JavaScript, or with reduced motion turned on, everything simply shows.
 */
export function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "ol" | "ul" }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.9) return; // already on screen
    el.dataset.reveal = "pending";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.reveal = "shown";
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
