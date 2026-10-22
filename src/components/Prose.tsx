import type { ReactNode } from "react";

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-3xl space-y-4 leading-relaxed [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-navy [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:underline">
      {children}
    </div>
  );
}
