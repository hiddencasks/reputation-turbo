import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { Lead } from "@/lib/leads";
import { getAnswers, type AiCheck } from "@/lib/ai-visibility/run";
import { providerLabel } from "@/lib/ai-visibility/providers";
import { auditMarkdown, fileSlug } from "@/lib/audit/export";

export const dynamic = "force-dynamic";

/** Downloads a finished audit as a Markdown file, for saving or sharing. Owner only. */
export async function GET(_request: Request, { params }: { params: Promise<{ checkId: string }> }) {
  if (!(await getSession())) return new Response("Please sign in.", { status: 401 });
  const { checkId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(checkId)) return new Response("Not found", { status: 404 });

  const [check] = await sql<AiCheck[]>`select * from ai_checks where id = ${checkId} and status = 'done'`;
  if (!check) return new Response("Audit not found or not finished.", { status: 404 });
  const [[lead], answers] = await Promise.all([sql<Lead[]>`select * from leads where id = ${check.lead_id}`, getAnswers(check.id)]);
  if (!lead) return new Response("Lead not found.", { status: 404 });

  const date = (check.finished_at ?? check.created_at).toISOString().slice(0, 10);
  const name = `audit-${fileSlug(check.business_name)}-${date}.md`;
  return new Response(auditMarkdown(lead, check, answers, providerLabel), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
