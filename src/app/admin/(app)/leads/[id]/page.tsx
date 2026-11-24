import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { STAGES } from "@/lib/stages";
import { LEAD_DETAIL_FIELDS, type Lead } from "@/lib/leads";
import { site } from "@/lib/site";
import { aiChecksAvailable, getChecksForLead, getProviderErrors, reportUrl } from "@/lib/ai-visibility/run";
import { providerLabel } from "@/lib/ai-visibility/providers";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PackagePicker } from "@/components/PackagePicker";
import { getOfferings } from "@/lib/offerings";
import { recommendPackages, splitPackages } from "@/lib/recommend";
import { auditScore, fixIds } from "@/lib/audit/checks";
import { addNote, approveReport, createLeadPaymentLink, deleteLead, markVendor, runAiCheck, setAiMonitoring, updateLead, updateLeadDetails, copyDetailsFromChecklist } from "../../../actions";
import { paymentsForLead } from "@/lib/payments";
import { depositCents, dollars, stripeEnabled } from "@/lib/stripe";
import { summarizeLead } from "@/lib/lead-summary";
import { DeleteLead } from "./DeleteLead";
import { FollowupNote } from "./FollowupNote";
import { getFollowupsForLead, followupsReady } from "@/lib/followup";
import { describeAdSource, parseAdSource } from "@/lib/ad-source";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { getProjectForLead, projectsReady } from "@/lib/projects";
import { startClientProject } from "../../clients/actions";

// Leaves time for AI visibility checks started from this page.
export const maxDuration = 300;

type Activity = { id: string; kind: string; body: string; created_at: Date; meta: { ad?: unknown } | null };
type EmailRow = { id: string; subject: string; template: string; status: string; to_email: string; created_at: Date };

const kindLabel: Record<string, string> = {
  audit_form: "Audit request",
  ai_search: "AI search audit request",
  geo_quiz: "GEO quiz",
  outreach: "Outreach prospect",
  manual: "Added by you",
  ai_check: "AI visibility",
  contact_form: "Contact form",
  note: "Note",
  stage_change: "Stage",
  vendor_flag: "Sales pitch",
  followup: "Personal follow-up",
  project: "Client project",
  payment: "Payment",
  payment_link: "Payment link",
  stripe: "Online payment",
};

const fmt = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ai?: string }> }) {
  const { id } = await params;
  const { ai: aiMessage } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [[lead], activities, emails, checks, offerings, followups, followupTable] = await Promise.all([
    sql<Lead[]>`select * from leads where id = ${id}`,
    sql<Activity[]>`select id, kind, body, meta, created_at from activities where lead_id = ${id} order by created_at desc`,
    sql<EmailRow[]>`select id, subject, template, status, to_email, created_at from emails where lead_id = ${id} order by created_at desc`,
    getChecksForLead(id),
    getOfferings({ activeOnly: true }),
    getFollowupsForLead(id),
    followupsReady(),
  ]);
  if (!lead) notFound();
  const projectTable = await projectsReady();
  const payments = await paymentsForLead(lead.id);
  const payEnabled = stripeEnabled();
  const paymentLinks = activities.filter((a) => a.kind === "payment_link").slice(0, 3);
  const project = projectTable ? await getProjectForLead(lead.id) : null;
  const providerErrors = await getProviderErrors(checks.filter((c) => c.status === "done").map((c) => c.id));
  const checkRunning = checks.some((c) => c.status === "queued" || c.status === "running") || followups.some((f) => f.status === "writing" || f.status === "sending");
  const canCheck = aiChecksAvailable() && Boolean(lead.business_name && lead.trade && lead.city);

  const lastCheck = checks.find((c) => c.status === "done");
  const rec = recommendPackages({
    website: lead.website_url,
    aiCheck: lastCheck ? { mentioned: lastCheck.mentioned_count, answers: lastCheck.answer_count } : null,
    fixes: fixIds(lastCheck?.site_audit ?? null),
  });
  const nameOf = new Map(offerings.map((o) => [o.slug, o.name]));
  const suggestions = rec.suggestions.filter((x) => nameOf.has(x.slug));

  // Saved activities hold the ad cookie as an object; reuse the cookie parser to keep only known fields.
  const adOf = (a: Activity) => (a.meta?.ad ? parseAdSource(encodeURIComponent(JSON.stringify(a.meta.ad))) : null);
  const firstAd = activities.map(adOf).findLast(Boolean) ?? null;

  const summary = summarizeLead(lead, activities.map((a) => ({ ...a, lead_id: lead.id, meta: a.meta as Record<string, unknown> | null })));

  const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2";

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className="text-sm font-semibold text-orange">← All leads</Link>
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">{lead.business_name || `${lead.first_name} ${lead.last_name}`}</h1>
        <p className="text-muted">Became a lead {fmt(lead.created_at)} from {summary.source}</p>
        {(summary.vendor || summary.message) && (
          <form action={markVendor.bind(null, lead.id)} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {summary.vendor && (
              <span className="rounded-full bg-amber-100 px-3 py-0.5 font-semibold text-amber-900">
                {summary.vendorReason === "marked" ? "Sales pitch (vendor selling to you)" : "Looks like a sales pitch from a vendor"}
              </span>
            )}
            <input type="hidden" name="vendor" value={summary.vendor ? "false" : "true"} />
            <SubmitButton pendingText="Saving…" className="font-semibold text-muted underline hover:text-navy">
              {summary.vendor ? "Not a pitch, it's a real lead" : "Mark as sales pitch"}
            </SubmitButton>
          </form>
        )}
        {firstAd ? <p className="mt-1 inline-block rounded-full bg-orange/10 px-3 py-0.5 text-sm font-semibold text-orange-600">Came from: {describeAdSource(firstAd)}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy">Contact</h2>
          <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Name</dt><dd>{`${lead.first_name} ${lead.last_name}`.trim() || "—"}</dd>
            <dt className="text-muted">Email</dt><dd>{lead.email ? <a href={`mailto:${lead.email}`} className="text-orange underline">{lead.email}</a> : "—"}</dd>
            <dt className="text-muted">Phone</dt><dd>{lead.phone ? <a href={`tel:${lead.phone}`} className="text-orange underline">{lead.phone}</a> : "—"}</dd>
            <dt className="text-muted">Website</dt><dd className="break-all">{lead.website_url ? <a href={lead.website_url} target="_blank" rel="noopener noreferrer" className="text-orange underline">{lead.website_url}</a> : "None given"}</dd>
          </dl>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy">Pipeline</h2>
          <form action={updateLead.bind(null, lead.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Stage
              <select name="stage" defaultValue={lead.stage} className={input}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Next follow-up
              <input type="date" name="nextFollowUp" defaultValue={lead.next_follow_up ?? ""} className={input} />
            </label>
            <div className="sm:col-span-2">
              <PackagePicker
                options={offerings.map((o) => ({ name: o.name, kind: o.kind }))}
                selected={splitPackages(lead.recommended_package)}
                suggested={suggestions.map((x) => nameOf.get(x.slug)!)}
              />
              {suggestions.length > 0 && (
                <div className="mt-2 rounded-md bg-navy-50 p-3 text-sm">
                  <p className="font-semibold text-navy">Suggested</p>
                  <ul className="mt-1 space-y-1">
                    {suggestions.map((x) => (
                      <li key={x.slug}><span className="font-medium">{nameOf.get(x.slug)}</span>: <span className="text-muted">{x.reason}</span></li>
                    ))}
                  </ul>
                  {rec.note && <p className="mt-1 text-xs text-muted">{rec.note}</p>}
                </div>
              )}
            </div>
            <label className="text-sm font-semibold">Type of business
              <input name="trade" defaultValue={lead.trade} list="trade-options" className={input} />
              <datalist id="trade-options">{site.industries.map((i) => <option key={i} value={i} />)}</datalist>
            </label>
            <label className="text-sm font-semibold">City
              <input name="city" defaultValue={lead.city} list="city-options" className={input} />
              <datalist id="city-options">{site.cities.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className="text-sm font-semibold">Website
              <input name="website" type="text" inputMode="url" placeholder="example.com" defaultValue={lead.website_url ?? ""} className={input} />
            </label>
            <label className="text-sm font-semibold">Quote amount ($)
              <input name="quoteAmount" inputMode="decimal" defaultValue={lead.quote_amount_cents != null ? String(lead.quote_amount_cents / 100) : ""} className={input} />
            </label>
            <div className="sm:col-span-2">
              <SubmitButton pendingText="Saving…" doneText="Saved" className="rounded-md bg-navy px-4 py-2 font-semibold text-white">Save</SubmitButton>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Business details</h2>
        <p className="mt-1 text-sm text-muted">
          For our own records only. The lead never sees this. Add things as you learn them.
          {project && " Answers the client gives in their checklist (address, hours, profile links, listings) fill in here automatically."}
        </p>
        {project && (
          <form action={copyDetailsFromChecklist.bind(null, lead.id)} className="mt-2">
            <SubmitButton pendingText="Copying…" doneText="Copied" className="text-sm font-semibold text-orange underline">Copy from client checklist now</SubmitButton>
          </form>
        )}
        <form action={updateLeadDetails.bind(null, lead.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Phone
            <input name="phone" type="tel" defaultValue={lead.phone} className={input} />
          </label>
          {LEAD_DETAIL_FIELDS.map((f) => (
            <label key={f.key} className={`text-sm font-semibold ${f.multiline ? "sm:col-span-2" : ""}`}>{f.label}
              {f.multiline ? (
                <textarea name={f.key} rows={f.key === "notes" ? 4 : 2} defaultValue={lead.details?.[f.key] ?? ""} placeholder={f.placeholder} className={`${input} font-normal`} />
              ) : (
                <input name={f.key} defaultValue={lead.details?.[f.key] ?? ""} placeholder={f.placeholder} className={`${input} font-normal`} />
              )}
            </label>
          ))}
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Saving…" doneText="Saved" className="rounded-md bg-navy px-4 py-2 font-semibold text-white">Save details</SubmitButton>
          </div>
        </form>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Client project</h2>
        {project ? (
          <p className="mt-2 text-sm">
            {project.package || "No package set"} · started {fmt(project.created_at)}.{" "}
            <Link href={`/admin/clients/${project.id}`} className="font-semibold text-orange underline">Open the project, time log and client checklist</Link>
          </p>
        ) : !projectTable ? (
          <p className="mt-2 text-sm text-muted">One-time setup needed: run <code>db/updates/2026-11-client-portal.sql</code> in the Supabase SQL editor.</p>
        ) : (
          <form action={startClientProject.bind(null, lead.id)} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-semibold">Package
              <select name="package" required defaultValue={offerings.find((o) => o.kind === "package" && splitPackages(lead.recommended_package).includes(o.name))?.name ?? ""} className={input}>
                <option value="">Choose a package</option>
                {offerings.filter((o) => o.kind === "package").map((o) => <option key={o.slug} value={o.name}>{o.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Client email for their portal
              <input type="email" name="email" defaultValue={lead.email} className={input} />
            </label>
            <SubmitButton pendingText="Starting…" className="rounded-md bg-orange px-4 py-2 font-semibold text-white">Start client project</SubmitButton>
            <p className="text-xs text-muted sm:col-span-3">Creates the delivery steps with a timer for each, and the client&apos;s checklist. Also moves this lead to Won. Nothing is emailed until you send the invite.</p>
          </form>
        )}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Payments</h2>
        {payments.length > 0 ? (
          <ul className="mt-2 divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span><strong className="text-green-800">Paid</strong> {p.item}</span>
                <span className="text-muted">{dollars(p.amount_cents)}{p.monthly ? "/month" : ""} · {fmt(p.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">No online payments yet.</p>
        )}
        {payEnabled ? (
          <form action={createLeadPaymentLink.bind(null, lead.id)} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-semibold">Payment link for
              <select name="what" required className={input} defaultValue="">
                <option value="" disabled>Choose…</option>
                <optgroup label="Website: second half (before go-live)">
                  {offerings.filter((o) => o.kind === "package" && o.slug !== "ai-search-setup").map((o) => (
                    <option key={o.slug} value={`final:${o.slug}`}>{o.name}: final {dollars(o.price_cents - depositCents(o.price_cents))}</option>
                  ))}
                </optgroup>
                <optgroup label="Monthly plan (starts billing today)">
                  {offerings.filter((o) => o.kind === "plan").map((o) => <option key={o.slug} value={`plan:${o.slug}`}>{o.name}: {dollars(o.price_cents)}/month</option>)}
                </optgroup>
                <optgroup label="Package in full">
                  {offerings.filter((o) => o.kind === "package").map((o) => <option key={o.slug} value={`full:${o.slug}`}>{o.name}: {dollars(o.price_cents)}</option>)}
                </optgroup>
                <optgroup label="Add-on">
                  {offerings.filter((o) => o.kind === "addon" && o.price_cents > 0).map((o) => <option key={o.slug} value={`addon:${o.slug}`}>{o.name}: {dollars(o.price_cents)}</option>)}
                </optgroup>
                <option value="custom">Something else (type a name and amount)</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Name (optional)
              <input name="name" placeholder="e.g. Founding client deposit" className={input} />
            </label>
            <label className="text-sm font-semibold">Amount $ (optional)
              <input name="amount" inputMode="decimal" placeholder="Uses the price" className={input} />
            </label>
            <SubmitButton pendingText="Making link…" className="rounded-md bg-navy px-4 py-2 font-semibold text-white">Make payment link</SubmitButton>
            <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" name="monthly" /> Charge monthly (only for &quot;Something else&quot;)</label>
            <p className="text-xs text-muted sm:col-span-4">
              Copy the link into an email or text. When they pay, it shows up here, the lead moves to Won for project payments, and you get an email.
              For a founding client, type the discounted amount, or let them use your Stripe promotion code at checkout.
            </p>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted">Connect Stripe to make payment links: add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel, and run <code>db/updates/2026-11-stripe-payments.sql</code>.</p>
        )}
        {paymentLinks.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {paymentLinks.map((a) => (
              <li key={a.id} className="break-all"><span className="text-muted">{fmt(a.created_at)}:</span> {a.body}</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ai-heading" className="rounded-lg bg-white p-5 shadow-sm">
        {checkRunning && <AutoRefresh />}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ai-heading" className="font-display text-xl font-bold text-navy">Online audit</h2>
          <div className="flex flex-wrap gap-2">
            <form action={setAiMonitoring.bind(null, lead.id)}>
              <input type="hidden" name="on" value={lead.ai_monitoring ? "false" : "true"} />
              <SubmitButton pendingText="Saving…" className="rounded-md px-3 py-2 text-sm font-semibold text-navy ring-1 ring-line">
                {lead.ai_monitoring ? "Turn off monthly tracking" : "Turn on monthly tracking"}
              </SubmitButton>
            </form>
            <form action={runAiCheck.bind(null, lead.id)}>
              <SubmitButton disabled={!canCheck || checkRunning} pendingText="Starting audit…" className="rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white">
                {checkRunning ? "Audit running..." : "Run audit"}
              </SubmitButton>
            </form>
          </div>
        </div>
        {lead.ai_monitoring && <p className="mt-1 text-sm text-muted">Monthly tracking is on: a new check runs every month and you&apos;ll get an email to review it.</p>}
        {aiMessage && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{aiMessage}</p>}
        {!aiChecksAvailable() ? (
          <p className="mt-3 text-sm text-muted">No AI services are set up yet. Add at least one API key (see .env.example) to run checks.</p>
        ) : !canCheck ? (
          <p className="mt-3 text-sm text-muted">Add the business name, type of business and city above to run a check.</p>
        ) : checks.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No checks yet.</p>
        ) : null}
        {checks.length > 0 && (
          <ul className="mt-4 space-y-4">
            {checks.map((c) => (
              <li key={c.id} className="rounded-md border border-line p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-navy">
                    {c.status === "done" ? `Named in ${c.mentioned_count} of ${c.answer_count} AI answers` : c.status === "failed" ? "Check failed" : "Checking what AI assistants say..."}
                  </p>
                  <p className="text-xs text-muted">{fmt(c.created_at)} · {c.trade} in {c.city} · {c.providers.map(providerLabel).join(", ")}</p>
                </div>
                {c.site_audit && (() => {
                  const sc = auditScore(c.site_audit);
                  const toFix = c.site_audit.sections.flatMap((x) => x.items).filter((i) => i.status === "fix");
                  return (
                    <p className="mt-1 text-sm">
                      <span className="font-semibold text-navy">Website, Google &amp; contact: {sc.good} of {sc.total} look good.</span>
                      {toFix.length > 0 && <span className="text-muted"> To fix: {toFix.map((i) => i.label).join(", ")}.</span>}
                    </p>
                  );
                })()}
                {c.status === "failed" && <p className="mt-1 text-sm text-red-700">{c.error}</p>}
                {c.status === "done" && (
                  <>
                    {providerErrors.filter((e) => e.check_id === c.id).map((e) => (
                      <p key={e.provider} className="mt-1 text-sm text-red-700">
                        {providerLabel(e.provider)} failed: {e.error}
                      </p>
                    ))}
                    {c.competitors.length > 0 && (
                      <p className="mt-1 text-sm">
                        <span className="text-muted">Named instead: </span>
                        {c.competitors.slice(0, 5).map((x) => `${x.name} (${x.count})`).join(", ")}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <a href={`/report/${c.report_token}`} target="_blank" className="rounded-md px-3 py-2 text-sm font-semibold text-navy ring-1 ring-line">
                        {c.approved_at ? "Open report" : "Preview report"}
                      </a>
                      <a href={`/admin/audit-download/${c.id}`} download className="rounded-md px-3 py-2 text-sm font-semibold text-navy ring-1 ring-line">
                        Download audit
                      </a>
                      {!c.sent_at && lead.email && (
                        <form action={approveReport.bind(null, c.id)}>
                          <input type="hidden" name="send" value="email" />
                          <SubmitButton pendingText="Sending email…" className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white">Approve &amp; email to {lead.first_name || lead.email}</SubmitButton>
                        </form>
                      )}
                      {!c.approved_at && (
                        <form action={approveReport.bind(null, c.id)}>
                          <input type="hidden" name="send" value="link" />
                          <SubmitButton pendingText="Approving…" className="rounded-md px-3 py-2 text-sm font-semibold text-navy ring-1 ring-line">Approve link only</SubmitButton>
                        </form>
                      )}
                    </div>
                    {c.approved_at && (
                      <label className="mt-3 block text-sm">
                        <span className="text-muted">{c.sent_at ? `Emailed ${fmt(c.sent_at)}. ` : "Approved. "}Link to share:</span>
                        <input readOnly value={reportUrl(c)} className="mt-1 w-full rounded-md border border-line bg-navy-50 px-3 py-2 text-sm" />
                      </label>
                    )}
                    {c.sent_at && lead.email && (
                      <FollowupNote followup={followups.find((f) => f.check_id === c.id)} checkId={c.id} to={lead.email} tableReady={followupTable} />
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Add a note</h2>
        <form action={addNote.bind(null, lead.id)} className="mt-3 space-y-2">
          <label className="sr-only" htmlFor="note">Note</label>
          <textarea id="note" name="note" rows={3} required className="w-full rounded-md border border-line px-3 py-2" />
          <SubmitButton pendingText="Adding…" doneText="Note added" className="rounded-md bg-orange px-4 py-2 font-semibold text-white">Add note</SubmitButton>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy">History</h2>
          <ol className="mt-3 space-y-3">
            {activities.map((a) => (
              <li key={a.id} className="border-l-2 border-orange pl-3">
                <p className="text-xs text-muted">{kindLabel[a.kind] ?? a.kind} · {fmt(a.created_at)}</p>
                <p className="whitespace-pre-wrap text-sm">{a.body}</p>
                {adOf(a) ? <p className="mt-1 text-xs font-semibold text-orange-600">From: {describeAdSource(adOf(a)!)}</p> : null}
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy">Emails</h2>
          {emails.length === 0 ? <p className="mt-2 text-sm text-muted">None yet.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {emails.map((e) => (
                <li key={e.id}>
                  <p className="font-medium">{e.subject}</p>
                  <p className="text-xs text-muted">To {e.to_email} · {e.status} · {fmt(e.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Delete this lead</h2>
        <p className="mt-1 text-sm text-muted">For test entries or spam. To stop contacting a real business, set the stage to Do Not Contact instead.</p>
        <div className="mt-3">
          <DeleteLead name={lead.business_name || `${lead.first_name} ${lead.last_name}`.trim() || "this lead"} action={deleteLead.bind(null, lead.id)} />
        </div>
      </section>
    </div>
  );
}
