import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getIntake, getProject, getSteps, getTimeEntries, projectsReady, type IntakeFile, type IntakeItem } from "@/lib/projects";
import { entryMinutes, formatMinutes, formatWaitDays, PHASES, STEP_STATUSES, stepWaitMinutes, totalMinutes } from "@/lib/projects/template";
import { portalLink } from "@/lib/portal-emails";
import { storageMode } from "@/lib/storage";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AddTimeForm, CopyLink, Elapsed, TimerButtons } from "../StepTimer";
import {
  addStepTime,
  changeStepStatus,
  inviteToPortal,
  ownerRemoveFile,
  ownerSaveAnswer,
  ownerSetItemDone,
  removeTimeEntry,
  resetPortalLink,
  saveStepNotes,
  setDelivered,
  startStepTimer,
  stopStepTimer,
} from "../actions";

const fmt = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });
const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium" });

const statusStyle: Record<string, string> = {
  not_started: "bg-navy-50 text-muted",
  in_progress: "bg-blue-100 text-blue-900",
  waiting: "bg-amber-100 text-amber-900",
  done: "bg-green-100 text-green-900",
};

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function ClientProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !(await projectsReady())) notFound();
  const project = await getProject(id);
  if (!project) notFound();
  const [steps, entries, intake, offerings] = await Promise.all([
    getSteps(id),
    getTimeEntries(id),
    getIntake(id),
    sql<{ name: string; est_hours_low: string | null; est_hours_high: string | null }[]>`select name, est_hours_low, est_hours_high from offerings where kind = 'package'`,
  ]);
  const now = new Date();
  const ourMinutes = totalMinutes(entries, now);
  const waitMinutes = steps.reduce((sum, s) => sum + stepWaitMinutes(s, now), 0);
  const running = entries.find((e) => e.ended_at === null && e.manual_minutes === null);
  const runningStep = running ? steps.find((s) => s.id === running.step_id) : undefined;
  const estimate = offerings.find((o) => project.package.toLowerCase().includes(o.name.toLowerCase()) && o.est_hours_low);
  const done = steps.filter((s) => s.status === "done").length;
  const intakeDone = intake.items.filter((i) => i.done_at).length;
  const name = project.business_name || `${project.first_name} ${project.last_name}`.trim() || "Client";
  const filesByItem = new Map<string, IntakeFile[]>();
  for (const f of intake.files) filesByItem.set(f.item_id, [...(filesByItem.get(f.item_id) ?? []), f]);
  const sections = [...new Set(intake.items.map((i) => i.section))];
  const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
        <Link href="/admin/clients" className="text-orange">← All clients</Link>
        <Link href={`/admin/leads/${project.lead_id}`} className="text-orange">Lead page</Link>
      </div>
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">{name}</h1>
        <p className="text-muted">{project.package || "No package set"} · started {fmtDay(project.created_at)}{project.delivered_at ? ` · delivered ${fmtDay(project.delivered_at)}` : ""}</p>
      </div>

      <section aria-label="Totals" className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Our time", value: formatMinutes(ourMinutes), sub: estimate ? `Estimate ${Number(estimate.est_hours_low)} to ${Number(estimate.est_hours_high)} h` : "" },
          { label: "Waiting on client", value: formatWaitDays(waitMinutes), sub: "Days marked Waiting on client" },
          { label: "Steps done", value: `${done} of ${steps.length}`, sub: "" },
          { label: "Client checklist", value: `${intakeDone} of ${intake.items.length}`, sub: project.client_seen_at ? `Last opened ${fmt(project.client_seen_at)}` : "Not opened yet" },
        ].map((t) => (
          <div key={t.label} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-navy">{t.value}</p>
            {t.sub && <p className="text-xs text-muted">{t.sub}</p>}
          </div>
        ))}
      </section>

      {running && runningStep && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-900">
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
          Timer running on <a href={`#step-${runningStep.position}`} className="font-semibold underline">{runningStep.position}. {runningStep.title}</a>
          <Elapsed since={running.started_at.toISOString()} />
        </p>
      )}

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Client portal</h2>
        <p className="mt-1 text-sm text-muted">
          The client&apos;s private page with their checklist and uploads. {project.invited_at ? `Invite sent ${fmt(project.invited_at)}.` : "Not invited yet."}
          {storageMode() === "off" && " File uploads need the Supabase keys in Vercel (see the setup steps)."}
        </p>
        <form action={inviteToPortal.bind(null, project.id)} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-56 flex-1 text-sm font-semibold">Client email
            <input type="email" name="email" required defaultValue={project.portal_email || project.email} className={input} />
          </label>
          <SubmitButton pendingText="Sending…" className="rounded-md bg-orange px-4 py-2 font-semibold text-white">
            {project.invited_at ? "Send the link again" : "Email the invite"}
          </SubmitButton>
        </form>
        <div className="mt-3 text-sm">
          <p className="font-semibold">Or text them this link</p>
          <div className="mt-1"><CopyLink value={portalLink(project)} /></div>
          <form action={resetPortalLink.bind(null, project.id)} className="mt-2">
            <SubmitButton pendingText="Resetting…" className="text-xs font-semibold text-muted underline">Reset link (the old one stops working)</SubmitButton>
          </form>
        </div>
      </section>

      <section aria-labelledby="steps-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="steps-heading" className="font-display text-2xl font-bold text-navy">Steps and time</h2>
          <a href={`/admin/clients/${project.id}/time-log`} download className="text-sm font-semibold text-orange underline">Download time log (CSV)</a>
        </div>
        {PHASES.filter((ph) => steps.some((s) => s.phase === ph)).map((phase) => (
          <div key={phase} className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-navy">{phase}</h3>
            <ol className="mt-3 divide-y divide-line">
              {steps.filter((s) => s.phase === phase).map((s) => {
                const own = entries.filter((e) => e.step_id === s.id);
                const live = own.find((e) => e.ended_at === null && e.manual_minutes === null);
                const wait = stepWaitMinutes(s, now);
                return (
                  <li key={s.id} id={`step-${s.position}`} className="scroll-mt-24 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy">{s.position}. {s.title}</p>
                        <p className="text-sm text-muted">{s.who}{s.detail ? ` · ${s.detail}` : ""}</p>
                        <p className="mt-1 text-sm">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[s.status]}`}>{STEP_STATUSES.find((x) => x.id === s.status)?.label}</span>
                          <span className="ml-2 font-semibold">{formatMinutes(totalMinutes(own, now))}</span>
                          {wait > 0 && <span className="ml-2 text-amber-800">waiting {formatWaitDays(wait)}</span>}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <TimerButtons running={Boolean(live)} since={live?.started_at.toISOString()} start={startStepTimer.bind(null, s.id)} stop={stopStepTimer.bind(null, s.id)} />
                        <form action={changeStepStatus.bind(null, s.id)} className="flex items-center gap-1">
                          <label className="sr-only" htmlFor={`status-${s.id}`}>Status</label>
                          <select id={`status-${s.id}`} name="status" defaultValue={s.status} className="rounded-md border border-line bg-white px-2 py-1.5 text-sm">
                            {STEP_STATUSES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                          </select>
                          <SubmitButton pendingText="Saving…" className="rounded-md px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-line">Set</SubmitButton>
                        </form>
                      </div>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-orange">Time entries ({own.length}) and notes</summary>
                      <div className="mt-3 space-y-3">
                        {own.length > 0 && (
                          <ul className="space-y-1 text-sm">
                            {own.map((e) => (
                              <li key={e.id} className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{e.ended_at === null && e.manual_minutes === null ? "running" : formatMinutes(entryMinutes(e, now))}</span>
                                <span className="text-muted">{e.manual_minutes != null ? `added by hand ${fmt(e.created_at)}` : `${fmt(e.started_at)}${e.ended_at ? ` to ${e.ended_at.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", timeStyle: "short" })}` : ""}`}</span>
                                {e.note && <span>· {e.note}</span>}
                                <form action={removeTimeEntry.bind(null, e.id)}>
                                  <SubmitButton pendingText="Removing…" className="text-xs font-semibold text-red-700 underline">Remove</SubmitButton>
                                </form>
                              </li>
                            ))}
                          </ul>
                        )}
                        <AddTimeForm action={addStepTime.bind(null, s.id)} />
                        <form action={saveStepNotes.bind(null, s.id)} className="space-y-1">
                          <label className="block text-xs font-semibold">Notes
                            <textarea name="notes" rows={2} defaultValue={s.notes} maxLength={4000} className={input} />
                          </label>
                          <SubmitButton pendingText="Saving…" doneText="Saved" className="rounded-md px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-line">Save notes</SubmitButton>
                        </form>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>

      <section aria-labelledby="intake-heading" className="space-y-4">
        <h2 id="intake-heading" className="font-display text-2xl font-bold text-navy">Client checklist</h2>
        <p className="text-sm text-muted">What the client sees in their portal. You can fill in answers or mark items received for them, for example after a call.</p>
        {sections.map((section) => (
          <div key={section} className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-navy">{section}</h3>
            <ul className="mt-3 divide-y divide-line">
              {intake.items.filter((i) => i.section === section).map((item) => (
                <IntakeRow key={item.id} projectId={project.id} item={item} files={filesByItem.get(item.id) ?? []} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-navy">Delivery</h2>
        <p className="mt-1 text-sm text-muted">{project.delivered_at ? `Marked delivered ${fmt(project.delivered_at)}.` : "Mark the project delivered after the handoff. Any running timer stops."}</p>
        <form action={setDelivered.bind(null, project.id)} className="mt-3">
          <input type="hidden" name="delivered" value={project.delivered_at ? "false" : "true"} />
          <SubmitButton pendingText="Saving…" className="rounded-md bg-navy px-4 py-2 font-semibold text-white">{project.delivered_at ? "Reopen project" : "Mark delivered"}</SubmitButton>
        </form>
      </section>
    </div>
  );

  function IntakeRow({ projectId, item, files }: { projectId: string; item: IntakeItem; files: IntakeFile[] }) {
    return (
      <li className="py-4 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy">{item.label}</p>
            <p className="text-xs text-muted">
              {item.kind === "upload" ? "Upload" : item.kind === "access" ? "Account step" : "Answer"}
              {item.done_at ? ` · done by ${item.done_by === "owner" ? "you" : "client"} ${fmt(item.done_at)}` : " · open"}
            </p>
          </div>
          <form action={ownerSetItemDone.bind(null, projectId, item.id)}>
            <input type="hidden" name="done" value={item.done_at ? "false" : "true"} />
            <SubmitButton pendingText="Saving…" className={`rounded-md px-3 py-1.5 text-sm font-semibold ${item.done_at ? "text-navy ring-1 ring-line" : "bg-green-700 text-white"}`}>
              {item.done_at ? "Reopen" : "Mark received"}
            </SubmitButton>
          </form>
        </div>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2">
                <a href={`/admin/client-file/${f.id}`} className="font-medium text-orange underline">{f.filename}</a>
                <span className="text-xs text-muted">{sizeLabel(f.size_bytes)} · {fmt(f.created_at)}</span>
                <form action={ownerRemoveFile.bind(null, f.id)}>
                  <SubmitButton pendingText="Removing…" className="text-xs font-semibold text-red-700 underline">Remove</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        {(item.kind === "answer" || item.answer) && (
          <form action={ownerSaveAnswer.bind(null, projectId, item.id)} className="mt-2 space-y-1">
            <label className="sr-only" htmlFor={`answer-${item.id}`}>{item.label}</label>
            <textarea id={`answer-${item.id}`} name="answer" rows={2} defaultValue={item.answer} maxLength={5000} className={input} />
            <SubmitButton pendingText="Saving…" doneText="Saved" className="rounded-md px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-line">Save answer</SubmitButton>
          </form>
        )}
      </li>
    );
  }
}
