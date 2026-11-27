import Link from "next/link";
import { listProjects, projectsReady } from "@/lib/projects";

const fmt = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium" });

export default async function ClientsPage() {
  const ready = await projectsReady();
  const projects = ready ? await listProjects() : [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Clients</h1>
        <p className="text-muted">Every client project, with its steps, time log and the client&apos;s checklist. Start one from a lead&apos;s page. Clients on a monthly plan (posts and billing) are under <Link href="/admin/plans" className="font-semibold text-orange">Monthly plans</Link>.</p>
      </div>
      {!ready ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          One-time setup needed: run <code>db/updates/2026-11-client-portal.sql</code> in the Supabase SQL editor, then reload this page.
        </p>
      ) : projects.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm text-muted shadow-sm">No client projects yet. Open a lead and press <strong>Start client project</strong>.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/clients/${p.id}`} className="block rounded-lg bg-white p-5 shadow-sm ring-1 ring-transparent hover:ring-orange">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-xl font-bold text-navy">{p.business_name || `${p.first_name} ${p.last_name}`}</p>
                  {p.delivered_at ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-900">Delivered</span>
                  ) : p.running ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-900">Timer running</span>
                  ) : null}
                </div>
                <p className="text-sm text-muted">{p.package || "No package set"} · started {fmt(p.created_at)}</p>
                <p className="mt-2 text-sm">Steps: <strong>{p.steps_done} of {p.steps_total}</strong> done · Client checklist: <strong>{p.intake_done} of {p.intake_total}</strong></p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-50" aria-hidden="true">
                  <div className="h-full bg-orange" style={{ width: `${p.steps_total ? Math.round((p.steps_done / p.steps_total) * 100) : 0}%` }} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
