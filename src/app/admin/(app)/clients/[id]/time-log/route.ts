import { getSession } from "@/lib/auth";
import { getProject, getSteps, getTimeEntries } from "@/lib/projects";
import { csvCell, entryMinutes, stepWaitMinutes, STEP_STATUSES } from "@/lib/projects/template";

export const dynamic = "force-dynamic";

// The project's time log as a spreadsheet: one row per step, plus a total.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Not signed in", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const project = await getProject(id);
  if (!project) return new Response("Not found", { status: 404 });
  const [steps, entries] = await Promise.all([getSteps(id), getTimeEntries(id)]);
  const now = new Date();
  const day = (d: Date | null) => (d ? d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }) : "");
  const rows = [["#", "Phase", "Step", "Who", "Status", "Started", "Done", "Our minutes", "Client wait (days)", "Notes"]];
  let totalMin = 0;
  let totalWait = 0;
  for (const s of steps) {
    const min = entries.filter((e) => e.step_id === s.id).reduce((sum, e) => sum + entryMinutes(e, now), 0);
    const wait = stepWaitMinutes(s, now);
    totalMin += min;
    totalWait += wait;
    rows.push([String(s.position), s.phase, s.title, s.who, STEP_STATUSES.find((x) => x.id === s.status)?.label ?? s.status, day(s.started_at), day(s.done_at), String(Math.round(min)), (wait / 1440).toFixed(1), s.notes]);
  }
  rows.push(["", "", "Total", "", "", "", "", String(Math.round(totalMin)), (totalWait / 1440).toFixed(1), `${(totalMin / 60).toFixed(1)} hours`]);
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const slug = (project.business_name || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}-time-log.csv"` },
  });
}
