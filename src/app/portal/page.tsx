import { getPortalProject } from "@/lib/portal-auth";
import { getIntake, getSteps, markClientSeen, type IntakeFile, type IntakeItem } from "@/lib/projects";
import { phaseProgress } from "@/lib/projects/template";
import { initialFields, intakeDef } from "@/lib/projects/intake";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { site } from "@/lib/site";
import { clientRemoveFile, clientSaveAnswer, clientSaveFields, clientSetDone, signOutOfPortal } from "./actions";
import { IntakeForm } from "./IntakeForm";
import { AgreeForm, LinkRequestForm, Uploader } from "./Uploader";

export const dynamic = "force-dynamic";

const phaseLabel = { done: "Done", in_progress: "In progress", up_next: "Up next" } as const;
const phaseStyle = { done: "bg-green-100 text-green-900", in_progress: "bg-orange/15 text-orange-600", up_next: "bg-navy-50 text-muted" } as const;

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const project = await getPortalProject();
  const { link } = await searchParams;

  if (!project) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="font-display text-3xl font-bold text-navy">Your client page</h1>
        {link === "expired" ? (
          <p className="mt-2 text-muted">That link doesn&apos;t work anymore. Enter your email and we&apos;ll send you the current one.</p>
        ) : (
          <p className="mt-2 text-muted">Open the link from your welcome email, or enter your email and we&apos;ll send it again.</p>
        )}
        <div className="mt-5"><LinkRequestForm /></div>
      </div>
    );
  }

  await markClientSeen(project.id);
  const [{ items, files }, steps] = await Promise.all([getIntake(project.id), getSteps(project.id)]);
  const lead = { business_name: project.business_name, city: project.city, phone: project.phone, email: project.email };
  const done = items.filter((i) => i.done_at).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const sections = [...new Set(items.map((i) => i.section))];
  const filesOf = (id: string) => files.filter((f) => f.item_id === id);

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-orange">{project.business_name}</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-navy">{project.first_name ? `Hi ${project.first_name}!` : "Welcome!"}</h1>
        <p className="mt-2">
          Here&apos;s what we need from you to get started. We never ask for your passwords. For accounts, you add us as a manager and you stay the owner.
        </p>
        <div className="mt-4 rounded-md border-l-4 border-orange bg-orange/5 p-4">
          <p className="font-semibold text-navy">No need to do it all at once.</p>
          <p className="mt-1">Each time you tap <strong>Save</strong>, that item is stored. You can close this page, come back later with the same link, and change any answer whenever you like.</p>
        </div>
        <p className="mt-4 font-semibold text-navy">{done} of {items.length} done</p>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-navy-50" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist progress">
          <div className="h-full bg-orange transition-all" style={{ width: `${pct}%` }} />
        </div>
        {done === items.length && items.length > 0 && <p className="mt-3 rounded-md bg-green-50 p-3 text-green-900">That&apos;s everything, thank you! We&apos;ll take it from here and keep you posted.</p>}
      </section>

      {project.agreement_text ? (
        project.agreed_at ? (
          <section aria-label="Your agreement" className="rounded-lg bg-white p-6 shadow-sm">
            <p className="font-semibold text-green-900">You agreed to the project agreement on {project.agreed_at.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "long" })}. Thank you!</p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-semibold text-orange">Read it again</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans">{project.agreement_text}</pre>
            </details>
          </section>
        ) : (
          <section aria-labelledby="agreement-heading" className="rounded-lg bg-white p-6 shadow-sm ring-2 ring-orange">
            <h2 id="agreement-heading" className="font-display text-xl font-bold text-navy">First: your project agreement</h2>
            <p className="mt-1 text-sm text-muted">Short and plain. Have a question about anything in it? Just reply to our email before agreeing.</p>
            <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-navy-50 p-4 font-sans text-sm">{project.agreement_text}</pre>
            <AgreeForm defaultName={`${project.first_name} ${project.last_name}`.trim()} />
          </section>
        )
      ) : null}

      {steps.length > 0 && (
        <section aria-labelledby="progress-heading" className="rounded-lg bg-white p-6 shadow-sm">
          <h2 id="progress-heading" className="font-display text-xl font-bold text-navy">Where your project stands</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {phaseProgress(steps).map((p, i) => (
              <li key={p.phase} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
                <span className="font-medium">{i + 1}. {p.phase}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${phaseStyle[p.state]}`}>{phaseLabel[p.state]}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {sections.map((section) => (
        <section key={section} aria-label={section} className="space-y-3">
          <h2 className="font-display text-2xl font-bold text-navy">{section}</h2>
          {items.filter((i) => i.section === section).map((item) => <ItemCard key={item.id} item={item} files={filesOf(item.id)} lead={lead} />)}
        </section>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>Questions? Reply to any of our emails or write to <a href={`mailto:${site.email}`} className="text-orange underline">{site.email}</a>.</p>
        <form action={signOutOfPortal}>
          <SubmitButton pendingText="Signing out…" className="font-semibold underline">Sign out</SubmitButton>
        </form>
      </div>
    </div>
  );
}

function ItemCard({ item, files, lead }: { item: IntakeItem; files: IntakeFile[]; lead: Parameters<typeof initialFields>[3] }) {
  const isDone = Boolean(item.done_at);
  const def = item.key ? intakeDef(item.key) : undefined;
  const box = "mt-2 w-full rounded-md border border-line bg-white px-3 py-2";
  return (
    <article className={`rounded-lg bg-white p-5 shadow-sm ring-1 ${isDone ? "ring-green-300" : "ring-transparent"}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-navy">{item.label}</h3>
        {isDone && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-900">Done</span>}
      </div>
      {item.help && <p className="mt-1 text-sm text-muted">{item.help}</p>}

      {def?.fields ? (
        <IntakeForm
          itemKey={def.key}
          itemId={item.id}
          cities={[...site.cities]}
          initial={initialFields(def.key, item.fields, item.answer, lead)}
          action={clientSaveFields.bind(null, item.id)}
        />
      ) : item.kind === "answer" ? (
        <form action={clientSaveAnswer.bind(null, item.id)}>
          <label className="sr-only" htmlFor={`a-${item.id}`}>{item.label}</label>
          <textarea id={`a-${item.id}`} name="answer" rows={3} maxLength={5000} defaultValue={item.answer} className={box} />
          <SubmitButton pendingText="Saving…" doneText="Saved" className="mt-2 rounded-md bg-navy px-4 py-2 font-semibold text-white">Save</SubmitButton>
        </form>
      ) : (
        <>
          {item.kind === "upload" && (
            <>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-md bg-navy-50 px-3 py-1.5">
                      <span className="truncate">{f.filename}</span>
                      <form action={clientRemoveFile.bind(null, f.id)}>
                        <SubmitButton pendingText="Removing…" className="text-xs font-semibold text-muted underline">Remove</SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <Uploader itemId={item.id} label={item.label} />
            </>
          )}
          <details className="mt-3" open={Boolean(item.answer)}>
            <summary className="cursor-pointer text-sm font-semibold text-orange">Add a note</summary>
            <form action={clientSaveAnswer.bind(null, item.id)}>
              <label className="sr-only" htmlFor={`n-${item.id}`}>Note about {item.label}</label>
              <textarea id={`n-${item.id}`} name="answer" rows={2} maxLength={5000} defaultValue={item.answer} className={box} />
              <SubmitButton pendingText="Saving…" doneText="Saved" className="mt-2 rounded-md px-4 py-2 text-sm font-semibold text-navy ring-1 ring-line">Save note</SubmitButton>
            </form>
          </details>
          <form action={clientSetDone.bind(null, item.id)} className="mt-3">
            <input type="hidden" name="done" value={isDone ? "false" : "true"} />
            <SubmitButton pendingText="Saving…" className={isDone ? "text-sm font-semibold text-muted underline" : "rounded-md bg-green-700 px-4 py-2 font-semibold text-white"}>
              {isDone ? "Not done yet" : item.kind === "upload" ? "I've sent everything for this" : "I did this"}
            </SubmitButton>
          </form>
        </>
      )}
    </article>
  );
}
