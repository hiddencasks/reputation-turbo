"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishUpload, requestPortalLink, startUpload, type LinkState } from "./actions";

type Row = { name: string; progress: number; state: "uploading" | "done" | "failed"; error?: string };

function put(url: string, headers: Record<string, string>, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}

/** Picks files and sends them one at a time, showing progress for each. */
export function Uploader({ itemId, label }: { itemId: string; label: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  async function send(files: File[]) {
    setBusy(true);
    const start = rows.length;
    setRows((r) => [...r, ...files.map((f) => ({ name: f.name, progress: 0, state: "uploading" as const }))]);
    const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === start + i ? { ...row, ...patch } : row)));
    for (const [i, file] of files.entries()) {
      const meta = { name: file.name, size: file.size, type: file.type };
      try {
        const begin = await startUpload(itemId, meta);
        if (!begin.ok) throw new Error(begin.error);
        await put(begin.target.url, begin.target.headers, file, (p) => update(i, { progress: p }));
        const end = await finishUpload(itemId, begin.path, meta);
        if (!end.ok) throw new Error("We couldn't save that file. Please try again.");
        update(i, { state: "done", progress: 1 });
      } catch (err) {
        update(i, { state: "failed", error: err instanceof Error ? err.message : "Upload failed." });
      }
    }
    setBusy(false);
    router.refresh();
    // Sent files now show in the saved list above; keep only the ones that failed here.
    setRows((r) => r.filter((row) => row.state === "failed"));
  }

  return (
    <div className="mt-3">
      <input
        ref={input}
        type="file"
        multiple
        aria-label={`Add files for ${label}`}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = "";
          if (files.length) void send(files);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-2 rounded-md bg-orange px-4 py-2.5 font-semibold text-white transition active:scale-95 disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Add files"}
      </button>
      {rows.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm" aria-live="polite">
          {rows.map((r, i) => (
            <li key={i}>
              <div className="flex justify-between gap-2">
                <span className="truncate">{r.name}</span>
                <span className={r.state === "failed" ? "text-red-700" : "text-muted"}>{r.state === "done" ? "Sent" : r.state === "failed" ? "Didn't send" : `${Math.round(r.progress * 100)}%`}</span>
              </div>
              {r.state === "uploading" && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-50"><div className="h-full bg-orange transition-all" style={{ width: `${Math.round(r.progress * 100)}%` }} /></div>
              )}
              {r.error && <p className="text-xs text-red-700">{r.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LinkRequestForm() {
  const [state, action, pending] = useActionState<LinkState, FormData>(requestPortalLink, { sent: false, error: "" });
  if (state.sent) return <p role="status" className="rounded-md bg-green-50 p-4 text-green-900">If we have a project for that email, a new link is on its way. Check your inbox (and spam folder).</p>;
  return (
    <form action={action} className="space-y-3">
      <label className="block font-semibold">Your email
        <input type="email" name="email" required autoComplete="email" className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2.5" />
      </label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="rounded-md bg-orange px-5 py-2.5 font-semibold text-white transition active:scale-95 disabled:opacity-60">{pending ? "Sending…" : "Email me my link"}</button>
    </form>
  );
}
