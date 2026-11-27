import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/admin/CopyButton";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { getOfferings } from "@/lib/offerings";
import { canPost, defaultDraftMonth, formatPostDate, monthLabel, postAllowance, statusLabel } from "@/lib/plan-schedule";
import { getPlan, metaClientReady, networksFor, planPhotos, plansReady, postsForPlan, type PlanPost } from "@/lib/plans";
import { dollars } from "@/lib/stripe";
import { approveAll, addPost, deletePhoto, endPlan, removePost, saveSettings, setStatus } from "../actions";
import { DraftForm, PhotoUploader, PostEditor, PostNowButton, TestConnection } from "./PlanForms";

const TZ = "America/Los_Angeles";
const day = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { timeZone: TZ, dateStyle: "medium" }) : "—");
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const hm = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
const input = "w-full rounded-md border border-navy-100 px-3 py-2 text-sm";
const card = "rounded-lg bg-white p-5 shadow-sm";

const statusTone: Record<string, string> = {
  active: "bg-green-100 text-green-900",
  manual: "bg-green-100 text-green-900",
  past_due: "bg-red-100 text-red-900",
  canceled: "bg-navy-50 text-muted",
};
const postTone: Record<PlanPost["status"], string> = {
  draft: "bg-amber-100 text-amber-900",
  approved: "bg-blue-100 text-blue-900",
  posting: "bg-blue-100 text-blue-900",
  done: "bg-green-100 text-green-900",
  skipped: "bg-navy-50 text-muted",
};
const postWord: Record<PlanPost["status"], string> = { draft: "Draft", approved: "Approved, scheduled", posting: "Posting…", done: "Done", skipped: "Skipped" };
const resultWord = { posted: "posted", failed: "failed", reminded: "emailed to you to paste" } as const;

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !(await plansReady())) notFound();
  const plan = await getPlan(id);
  if (!plan) notFound();
  const [posts, photos, offerings] = await Promise.all([postsForPlan(id), planPhotos(plan), getOfferings()]);
  const plans = offerings.filter((o) => o.kind === "plan");
  const allowance = postAllowance(plan.slug);
  const name = plan.business_name || `${plan.first_name} ${plan.last_name}`.trim();
  const drafts = posts.filter((p) => p.status === "draft").length;
  const live = canPost(plan);

  const now = new Date();
  const first = defaultDraftMonth(now);
  const months = [0, 1, 2].map((i) => {
    const m = (first.month + i) % 12;
    const y = first.year + Math.floor((first.month + i) / 12);
    return { value: `${y}-${String(m + 1).padStart(2, "0")}`, label: monthLabel(y, m) };
  });
  const byMonth = new Map<string, PlanPost[]>();
  for (const p of posts) {
    const key = new Date(p.publish_at).toLocaleDateString("en-US", { timeZone: TZ, month: "long", year: "numeric" });
    byMonth.set(key, [...(byMonth.get(key) ?? []), p]);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/plans" className="text-sm text-muted hover:text-navy">← Monthly plans</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold text-navy">{name}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${statusTone[plan.status]}`}>{statusLabel[plan.status]}</span>
          {plan.paused ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-900">Posting paused</span> : null}
        </div>
        <p className="text-muted">
          {plan.name || "Monthly plan"} · {dollars(plan.amount_cents)}/month · <Link href={`/admin/leads/${plan.lead_id}`} className="underline">Lead page</Link>
        </p>
      </div>

      {plan.status === "past_due" ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-900">Their last payment failed on {day(plan.last_failed_at)}. Posts are on hold until Stripe collects it, then they pick up again by themselves.</p>
      ) : plan.status === "canceled" ? (
        <p className="rounded-lg bg-navy-50 p-4 text-sm">This plan was canceled on {day(plan.canceled_at)}. Nothing more will post.</p>
      ) : null}

      <section className={card}>
        <h2 className="font-display text-xl font-bold text-navy">Billing</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted">Started</dt><dd className="font-semibold">{day(plan.started_at)}</dd></div>
          <div><dt className="text-muted">Last paid</dt><dd className="font-semibold">{day(plan.last_paid_at)}</dd></div>
          <div><dt className="text-muted">{plan.stripe_subscription_id ? "Paid through" : "Billing"}</dt><dd className="font-semibold">{plan.stripe_subscription_id ? day(plan.current_period_end) : "Outside Stripe"}</dd></div>
          <div><dt className="text-muted">Included each month</dt><dd className="font-semibold">{allowance.social} Facebook/Instagram, {allowance.google} Google</dd></div>
        </dl>
        {plan.stripe_subscription_id ? (
          <p className="mt-3 text-sm text-muted">Stripe tells the dashboard on its own when a payment goes through, fails or is canceled. To cancel or change the card, open the customer in Stripe (Customers, search their email).</p>
        ) : plan.status !== "canceled" ? (
          <form action={endPlan} className="mt-3">
            <input type="hidden" name="planId" value={plan.id} />
            <SubmitButton pendingText="Ending…" className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-800">End this plan</SubmitButton>
          </form>
        ) : null}
      </section>

      <section className={card}>
        <h2 className="font-display text-xl font-bold text-navy">Settings</h2>
        <form action={saveSettings} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="planId" value={plan.id} />
          <label className="text-sm font-medium">Plan
            <select name="slug" defaultValue={plan.slug} className={input}>
              {plan.slug && !plans.some((o) => o.slug === plan.slug) ? <option value={plan.slug}>{plan.name}</option> : null}
              {!plan.slug ? <option value="">Custom ({plan.name})</option> : null}
              {plans.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Brand color (for posts without a photo)
            <input type="color" name="brandColor" defaultValue={plan.brand_color} className="block h-10 w-20 rounded-md border border-navy-100" />
          </label>
          <label className="text-sm font-medium">Facebook Page ID
            <input name="facebookPageId" defaultValue={plan.facebook_page_id} inputMode="numeric" placeholder="e.g. 1029384756" className={input} />
          </label>
          <label className="text-sm font-medium">Instagram account ID
            <input name="instagramUserId" defaultValue={plan.instagram_user_id} inputMode="numeric" placeholder="e.g. 17841400000000000" className={input} />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input type="checkbox" name="paused" defaultChecked={plan.paused} /> Pause posting (nothing goes out until you untick this)
          </label>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Saving…" doneText="Saved" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white">Save settings</SubmitButton>
          </div>
        </form>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-navy">How posting works for this client</summary>
          <div className="mt-2 space-y-2 text-muted">
            <p>Approved posts go out at their time (checked every hour). Google posts are always emailed to you to paste, until Google approves us for its API.</p>
            <p>
              {metaClientReady()
                ? "Facebook and Instagram post by themselves once the Page ID is filled in and the client's Page is shared with our Claude system user (Business settings > System users > Assign assets). Find the Page ID on the Page under About > Page transparency. Without it, each post is emailed to you to paste instead."
                : "Facebook and Instagram are emailed to you to paste for now. Automatic posting turns on once META_CLIENT_TOKEN is added in Vercel."}
            </p>
          </div>
        </details>
        <div className="mt-3"><TestConnection planId={plan.id} /></div>
      </section>

      <section className={card}>
        <h2 className="font-display text-xl font-bold text-navy">Photos</h2>
        <p className="text-sm text-muted">Posts use these photos in turn. Photos the client added to their website checklist are included too.</p>
        <div className="mt-3"><PhotoUploader planId={plan.id} /></div>
        {photos.length ? (
          <ul className="mt-3 divide-y divide-navy-50 text-sm">
            {photos.map((p) => (
              <li key={p.path} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate">{p.filename} {p.source === "checklist" ? <span className="text-muted">(from checklist)</span> : null}</span>
                {p.id ? (
                  <form action={deletePhoto}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="photoId" value={p.id} />
                    <SubmitButton pendingText="Removing…" className="text-sm text-red-800 underline">Remove</SubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No photos yet. Posts without one use the brand color.</p>
        )}
      </section>

      <section className="space-y-4">
        <div className={card}>
          <h2 className="font-display text-xl font-bold text-navy">Posts</h2>
          <p className="text-sm text-muted">
            Claude drafts the month from the client&apos;s details and checklist. Read each one, fix anything, then approve.{" "}
            {live ? "Approved posts go out on their dates." : "Nothing posts while this plan is paused, unpaid or canceled."}
          </p>
          <div className="mt-3"><DraftForm planId={plan.id} month={months[0].value} months={months} /></div>
          {drafts ? (
            <form action={approveAll} className="mt-3">
              <input type="hidden" name="planId" value={plan.id} />
              <SubmitButton pendingText="Approving…" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white">Approve all {drafts} drafts</SubmitButton>
            </form>
          ) : null}
        </div>

        {posts.length === 0 ? <p className={`${card} text-sm text-muted`}>No posts yet.</p> : null}
        {[...byMonth].map(([month, list]) => (
          <div key={month} className="space-y-3">
            <h3 className="font-display text-lg font-bold text-navy">{month}</h3>
            {list.map((p) => (
              <article key={p.id} id={p.id} className={card}>
                <div className="flex flex-col gap-4 sm:flex-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/plan-image/${p.id}${p.channel === "google" ? ".google" : ""}.jpg?v=${new Date(p.updated_at).getTime()}`} alt={`Image for: ${p.headline}`} loading="lazy" className="w-full rounded-md sm:w-48 sm:self-start" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <strong>{formatPostDate(new Date(p.publish_at))}</strong>
                      <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-semibold">{p.channel === "google" ? "Google profile" : "Facebook + Instagram"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${postTone[p.status]}`}>{postWord[p.status]}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm">{p.caption || <span className="text-muted">(no text yet)</span>}</p>
                    {Object.keys(p.results ?? {}).length ? (
                      <ul className="mt-2 text-xs text-muted">
                        {Object.entries(p.results).map(([n, r]) => r ? <li key={n}>{n}: {resultWord[r.status]}{r.error ? ` (${r.error})` : ""}</li> : null)}
                      </ul>
                    ) : p.status === "approved" ? (
                      <p className="mt-2 text-xs text-muted">Will {networksFor(plan, p).map((n) => `${n.auto ? "post to" : "email you for"} ${n.network}`).join(", ")}.</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      <CopyButton text={p.caption} label="Copy text" className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-sm font-semibold text-navy" />
                      <a href={`/plan-image/${p.id}${p.channel === "google" ? ".google" : ""}.jpg`} download className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-sm font-semibold text-navy">Download image</a>
                      {p.status === "draft" || p.status === "skipped" ? (
                        <StatusButton planId={plan.id} postId={p.id} status="approved" label="Approve" primary />
                      ) : p.status === "approved" ? (
                        <StatusButton planId={plan.id} postId={p.id} status="draft" label="Unapprove" />
                      ) : null}
                      {p.status === "draft" || p.status === "approved" ? <StatusButton planId={plan.id} postId={p.id} status="skipped" label="Skip" /> : null}
                      {p.status !== "done" && p.status !== "posting" && live ? <PostNowButton planId={plan.id} postId={p.id} /> : null}
                      {p.status !== "posting" ? (
                        <form action={removePost}>
                          <input type="hidden" name="planId" value={plan.id} />
                          <input type="hidden" name="postId" value={p.id} />
                          <SubmitButton pendingText="Deleting…" className="px-2 py-1.5 text-sm text-red-800 underline">Delete</SubmitButton>
                        </form>
                      ) : null}
                    </div>
                    {p.status !== "done" && p.status !== "posting" ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-navy">Edit</summary>
                        <PostEditor
                          planId={plan.id}
                          photos={photos}
                          post={{ id: p.id, date: ymd(new Date(p.publish_at)), time: hm(new Date(p.publish_at)), headline: p.headline, subline: p.subline, caption: p.caption, photo: p.photo_path, status: p.status, channel: p.channel }}
                        />
                      </details>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ))}

        <form action={addPost} className={`${card} flex flex-wrap items-end gap-3`}>
          <input type="hidden" name="planId" value={plan.id} />
          <p className="w-full text-sm font-semibold text-navy">Add a post by hand</p>
          <label className="text-sm font-medium">Where
            <select name="channel" className={input}><option value="social">Facebook + Instagram</option><option value="google">Google profile</option></select>
          </label>
          <label className="text-sm font-medium">Date<input type="date" name="date" required defaultValue={ymd(new Date(now.getTime() + 86_400_000))} className={input} /></label>
          <label className="text-sm font-medium">Time<input type="time" name="time" required defaultValue="10:00" className={input} /></label>
          <SubmitButton pendingText="Adding…" className="rounded-md border border-navy-100 bg-white px-3 py-2 text-sm font-semibold text-navy">Add post</SubmitButton>
        </form>
      </section>
    </div>
  );
}

function StatusButton({ planId, postId, status, label, primary }: { planId: string; postId: string; status: string; label: string; primary?: boolean }) {
  return (
    <form action={setStatus}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton pendingText="…" className={primary ? "rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white" : "rounded-md border border-navy-100 bg-white px-3 py-1.5 text-sm font-semibold text-navy"}>{label}</SubmitButton>
    </form>
  );
}
