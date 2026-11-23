import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getIntake, getProject } from "@/lib/projects";
import { intakeDef, summarize, withCities } from "@/lib/projects/intake";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Everything the client gave us, as one Markdown file to start the website build from.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Not signed in", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const project = await getProject(id);
  if (!project) return new Response("Not found", { status: 404 });
  const [{ items, files }, [lead]] = await Promise.all([
    getIntake(id),
    sql<{ trade: string; website_url: string }[]>`select trade, website_url from leads where id = ${project.lead_id}`,
  ]);

  const out: string[] = [];
  out.push(`# Build brief: ${project.business_name || "Client"}`, "");
  out.push(`- Package: ${project.package || "not set"}`);
  if (lead?.trade) out.push(`- Trade: ${lead.trade}`);
  if (project.city) out.push(`- City (lead): ${project.city}`);
  if (lead?.website_url) out.push(`- Current website: ${lead.website_url}`);
  out.push(`- Contact: ${[project.first_name, project.last_name].filter(Boolean).join(" ")}`);
  out.push(`- Checklist: ${items.filter((i) => i.done_at).length} of ${items.length} done`);
  out.push(`- Brief made: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" })} PT`, "");

  for (const section of [...new Set(items.map((i) => i.section))]) {
    out.push(`## ${section}`, "");
    for (const item of items.filter((i) => i.section === section)) {
      const base = item.key ? intakeDef(item.key) : undefined;
      const def = base ? withCities(base, site.cities) : undefined;
      const lines = def && item.fields && Object.keys(item.fields).length ? summarize(def, item.fields) : [];
      out.push(`### ${item.label}${item.done_at ? "" : " (not done yet)"}`);
      if (lines.length) out.push(...lines.map((l) => `- ${l}`));
      else if (item.answer.trim() && item.kind === "answer") out.push(item.answer.trim());
      else if (item.kind !== "upload") out.push("_No answer yet._");
      if (item.kind !== "answer" && item.answer.trim() && !lines.length) out.push(`Note: ${item.answer.trim()}`);
      const mine = files.filter((f) => f.item_id === item.id);
      if (item.kind === "upload") out.push(mine.length ? mine.map((f) => `- ${f.filename} (${sizeLabel(f.size_bytes)})`).join("\n") : "_No files yet._");
      out.push("");
    }
  }

  const slug = (project.business_name || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new Response(out.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}-build-brief.md"` },
  });
}
