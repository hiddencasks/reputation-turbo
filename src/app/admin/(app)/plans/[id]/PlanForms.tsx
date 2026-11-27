"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { draftPosts, finishPhotoUpload, postNow, savePostAction, startPhotoUpload, testConnection, type ActionState } from "../actions";

const input = "w-full rounded-md border border-navy-100 px-3 py-2 text-sm";

function Result({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="mt-2 whitespace-pre-line text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p aria-live="polite" className="mt-2 whitespace-pre-line text-sm text-green-800">{state.ok}</p>;
  return null;
}

export function DraftForm({ planId, month, months }: { planId: string; month: string; months: { value: string; label: string }[] }) {
  const [state, action] = useActionState(draftPosts, {});
  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="draft-month">Month</label>
        <select id="draft-month" name="month" defaultValue={month} className="rounded-md border border-navy-100 px-3 py-2 text-sm">
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <SubmitButton pendingText="Writing posts… (about a minute)" className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white">Draft posts with Claude</SubmitButton>
      </div>
      <Result state={state} />
    </form>
  );
}

export function TestConnection({ planId }: { planId: string }) {
  const [state, action] = useActionState(testConnection, {});
  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      <SubmitButton pendingText="Checking…" className="rounded-md border border-navy-100 bg-white px-3 py-2 text-sm font-semibold text-navy">Test the connection</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function PostNowButton({ planId, postId }: { planId: string; postId: string }) {
  const [state, action] = useActionState(postNow, {});
  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="postId" value={postId} />
      <SubmitButton pendingText="Posting…" className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-sm font-semibold text-navy">Post now</SubmitButton>
      <Result state={state} />
    </form>
  );
}

type EditorPost = { id: string; date: string; time: string; headline: string; subline: string; caption: string; photo: string; status: string; channel: string };

export function PostEditor({ planId, post, photos }: { planId: string; post: EditorPost; photos: { path: string; filename: string }[] }) {
  const [state, action] = useActionState(savePostAction, {});
  const [caption, setCaption] = useState(post.caption);
  const limit = post.channel === "google" ? 1500 : 2200;
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="postId" value={post.id} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">Date<input type="date" name="date" defaultValue={post.date} required className={input} /></label>
        <label className="text-sm font-medium">Time (Pacific)<input type="time" name="time" defaultValue={post.time} required className={input} /></label>
        <label className="text-sm font-medium">Photo
          <select name="photo" defaultValue={post.photo} className={input}>
            <option value="">No photo (brand color)</option>
            {photos.map((p) => <option key={p.path} value={p.path}>{p.filename}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">Big words on the image<input name="headline" defaultValue={post.headline} maxLength={80} className={input} /></label>
      <label className="block text-sm font-medium">Small line on the image (optional)<input name="subline" defaultValue={post.subline} maxLength={140} className={input} /></label>
      <label className="block text-sm font-medium">
        Post text <span className={`font-normal ${caption.length > limit ? "text-red-700" : "text-muted"}`}>({caption.length} / {limit})</span>
        <textarea name="caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={7} className={input} />
      </label>
      {post.channel === "google" ? <p className="text-xs text-muted">Google posts can&apos;t have hashtags, links or phone numbers.</p> : null}
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="save" pendingText="Saving…" doneText="Saved" className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-sm font-semibold text-navy">Save</SubmitButton>
        {post.status !== "approved" ? (
          <SubmitButton name="intent" value="approve" pendingText="Saving…" className="rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white">Save and approve</SubmitButton>
        ) : null}
      </div>
      <Result state={state} />
    </form>
  );
}

function put(url: string, headers: Record<string, string>, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(file);
  });
}

export function PhotoUploader({ planId }: { planId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  async function send(files: File[]) {
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setStatus(`Uploading ${i + 1} of ${files.length}…`);
      try {
        const begin = await startPhotoUpload(planId, { name: file.name, size: file.size, type: file.type });
        if (!begin.ok) throw new Error(begin.error);
        await put(begin.target.url, begin.target.headers, file);
        if (!(await finishPhotoUpload(planId, begin.path, file.name)).ok) throw new Error(`${file.name}: couldn't save.`);
      } catch (e) {
        failed.push(e instanceof Error ? e.message : `${file.name}: upload failed.`);
      }
    }
    setStatus("");
    setErrors(failed);
    router.refresh();
  }

  return (
    <div>
      <input
        ref={ref}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        aria-label="Add photos"
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = "";
          if (files.length) void send(files);
        }}
      />
      <button type="button" disabled={Boolean(status)} onClick={() => ref.current?.click()} className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60">
        {status || "Add photos"}
      </button>
      {errors.length ? <ul role="alert" className="mt-2 text-sm text-red-700">{errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}
    </div>
  );
}
