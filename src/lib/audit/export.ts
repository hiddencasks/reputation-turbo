import { auditScore, type SiteAudit } from "./checks";

/** What the download needs from a lead. */
export type ExportLead = {
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone: string;
  website_url: string;
  trade: string;
  city: string;
  stage: string;
  recommended_package: string;
};

export type ExportCheck = {
  business_name: string;
  website_url: string;
  trade: string;
  city: string;
  questions: string[];
  providers: string[];
  mentioned_count: number;
  answer_count: number;
  competitors: { name: string; count: number }[];
  site_audit: SiteAudit | null;
  created_at: Date;
  finished_at: Date | null;
  approved_at: Date | null;
  sent_at: Date | null;
};

export type ExportAnswer = { provider: string; question: string; answer: string; mentioned: boolean; businesses: string[]; sources: string[]; error: string | null };

const mark = { good: "Good", fix: "To fix", info: "We'll review" } as const;
const day = (d: Date | null) => (d ? d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }) : "");
/** Keeps a value on one line inside a Markdown table cell. */
const cell = (s: string) => s.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();

/** The whole audit as one Markdown file the owner can save, share, or hand to Claude. */
export function auditMarkdown(lead: ExportLead, check: ExportCheck, answers: ExportAnswer[], label: (provider: string) => string): string {
  const out: string[] = [];
  const contact = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  out.push(`# Online audit: ${check.business_name}`, "");
  out.push(
    `- Trade: ${check.trade}`,
    `- City: ${check.city}`,
    `- Website: ${check.website_url || "none"}`,
    ...(contact ? [`- Contact: ${contact}`] : []),
    ...(lead.email ? [`- Email: ${lead.email}`] : []),
    ...(lead.phone ? [`- Phone: ${lead.phone}`] : []),
    `- Lead stage: ${lead.stage}`,
    ...(lead.recommended_package ? [`- Recommended packages: ${lead.recommended_package}`] : []),
    `- Audit run: ${day(check.finished_at ?? check.created_at)}`,
    `- Report: ${check.sent_at ? `emailed ${day(check.sent_at)}` : check.approved_at ? `approved ${day(check.approved_at)}` : "not approved yet"}`,
    "",
  );

  out.push("## Summary", "");
  if (check.site_audit) {
    const { good, total } = auditScore(check.site_audit);
    out.push(`- Online checks: ${good} of ${total} look good`);
  }
  out.push(`- AI visibility: named in ${check.mentioned_count} of ${check.answer_count} AI answers (${check.providers.map(label).join(", ")})`);
  if (check.competitors.length > 0) {
    out.push(`- Named instead by AI: ${check.competitors.slice(0, 8).map((c) => `${c.name} (${c.count})`).join(", ")}`);
  }
  out.push("");

  for (const section of check.site_audit?.sections ?? []) {
    out.push(`## ${section.title}`, "", "| Check | Result | Detail |", "| --- | --- | --- |");
    for (const i of section.items) out.push(`| ${cell(i.label)} | ${mark[i.status]} | ${cell(i.detail)} |`);
    if (section.note) out.push("", section.note);
    out.push("");
  }

  const maps = check.site_audit?.competitors;
  if (maps && maps.length > 0) {
    out.push("## Top Google Maps competitors", "", "| # | Business | Rating | Reviews |", "| --- | --- | --- | --- |");
    maps.forEach((c, n) => out.push(`| ${n + 1} | ${cell(c.name)} | ${c.rating?.toFixed(1) ?? ""} | ${c.reviews ?? ""} |`));
    out.push("");
  }

  out.push("## AI answers", "");
  const grid = check.questions.map((q) => {
    const row = check.providers.map((p) => {
      const a = answers.find((x) => x.question === q && x.provider === p);
      return !a ? "" : a.error ? "Error" : a.mentioned ? "Found" : "Not found";
    });
    return `| ${cell(q)} | ${row.join(" | ")} |`;
  });
  out.push(`| Question | ${check.providers.map(label).join(" | ")} |`, `| --- | ${check.providers.map(() => "---").join(" | ")} |`, ...grid, "");

  for (const a of answers) {
    out.push(`### ${label(a.provider)}: ${a.question}`, "");
    if (a.error) {
      out.push(`Error: ${a.error}`, "");
      continue;
    }
    out.push(`Named ${check.business_name}: ${a.mentioned ? "yes" : "no"}`);
    if (a.businesses.length > 0) out.push(`Businesses named: ${a.businesses.join(", ")}`);
    out.push("", a.answer.trim(), "");
    if (a.sources.length > 0) out.push("Sources:", ...a.sources.map((s) => `- ${s}`), "");
  }
  return out.join("\n");
}

/** "Joe's Plumbing & Co." -> "joes-plumbing-co" for the file name. */
export function fileSlug(name: string): string {
  return name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "business";
}
