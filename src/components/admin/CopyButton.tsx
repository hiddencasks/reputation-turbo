"use client";

import { useState } from "react";

/** Copies a piece of text, like a caption, to the clipboard. */
export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          },
          () => setCopied(false),
        )
      }
      className={className || "rounded-md border border-navy px-3 py-1.5 text-sm font-semibold text-navy"}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
