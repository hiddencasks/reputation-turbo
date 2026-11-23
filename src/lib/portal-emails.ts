import "server-only";
import { sql } from "./db";
import { sendEmail } from "./email";
import { site } from "./site";
import { getProject, type ProjectWithLead } from "./projects";

export const portalLink = (p: { portal_token: string }) => `${site.url}/portal/open/${p.portal_token}`;

const hello = (p: ProjectWithLead) => (p.first_name ? `Hi ${p.first_name},` : "Hi,");

export async function sendPortalInvite(p: ProjectWithLead) {
  const result = await sendEmail({
    to: p.portal_email,
    leadId: p.lead_id,
    template: "portal_invite",
    from: `Alvin at ${site.name} <${site.email}>`,
    subject: `Your ${site.name} checklist for ${p.business_name || "your project"}`,
    paragraphs: [
      hello(p),
      `Welcome aboard. To get started, we need a few things from you: some quick answers about your business, your logo and photos, and a few account steps. It's all on one private page:`,
      portalLink(p),
      `Do what you can, whenever it suits you. Your answers save as you go, and you can come back with the same link. We never ask for your passwords. For accounts, you add us as a manager and you stay the owner.`,
      `Questions? Just reply to this email.`,
      `Alvin, ${site.name}`,
    ],
  });
  if (result.status !== "failed") {
    await sql`update client_projects set invited_at = now(), reminder_count = 0, reminded_at = null where id = ${p.id}`;
  }
  return result;
}

export async function sendPortalLink(p: ProjectWithLead) {
  return sendEmail({
    to: p.portal_email,
    leadId: p.lead_id,
    template: "portal_link",
    subject: `Your ${site.name} client page link`,
    paragraphs: [hello(p), `Here's your link to your private ${site.name} page:`, portalLink(p), `If you didn't ask for this, you can ignore this email.`],
  });
}

export async function sendPortalReminder(p: ProjectWithLead, open: number, total: number) {
  return sendEmail({
    to: p.portal_email,
    leadId: p.lead_id,
    template: "portal_reminder",
    from: `Alvin at ${site.name} <${site.email}>`,
    subject: `Quick reminder: ${open} ${open === 1 ? "item" : "items"} left on your checklist`,
    paragraphs: [
      hello(p),
      `A friendly nudge: ${total - open} of ${total} items on your checklist are done. The rest helps us keep your project moving.`,
      portalLink(p),
      `Stuck on anything? Reply to this email and we'll sort it out together.`,
      `Alvin, ${site.name}`,
    ],
  });
}

/** Tells the owner a client updated their checklist, at most once every 30 minutes per client. */
export async function notifyOwnerOfClientUpdate(projectId: string, what: string) {
  const [claimed] = await sql<{ id: string }[]>`
    update client_projects set owner_notified_at = now()
    where id = ${projectId} and (owner_notified_at is null or owner_notified_at < now() - interval '30 minutes')
    returning id`;
  if (!claimed) return;
  const [row] = await sql<{ business_name: string; lead_id: string; done: number; total: number }[]>`
    select l.business_name, p.lead_id,
      (select count(*)::int from intake_items i where i.project_id = p.id and i.done_at is not null) as done,
      (select count(*)::int from intake_items i where i.project_id = p.id) as total
    from client_projects p join leads l on l.id = p.lead_id where p.id = ${projectId}`;
  if (!row) return;
  await sendEmail({
    to: process.env.OWNER_EMAIL ?? site.email,
    leadId: row.lead_id,
    template: "owner_portal_update",
    subject: `${row.business_name || "A client"} updated their checklist (${row.done} of ${row.total} done)`,
    paragraphs: [`${row.business_name || "A client"} just ${what}.`, `Checklist: ${row.done} of ${row.total} items done.`, `Open in dashboard: ${site.url}/admin/clients/${projectId}`],
  });
}

/**
 * Friendly reminders for open checklist items: only after 3 quiet days since the
 * invite, the client's last visit and the last reminder, and at most 3 in total.
 */
export async function sendDueReminders(): Promise<{ project: string; status: string }[]> {
  const due = await sql<{ id: string; open: number; total: number }[]>`
    select p.id,
      (select count(*)::int from intake_items i where i.project_id = p.id and i.done_at is null) as open,
      (select count(*)::int from intake_items i where i.project_id = p.id) as total
    from client_projects p
    where p.invited_at is not null and p.delivered_at is null and p.portal_email <> ''
      and p.reminder_count < 3
      and p.invited_at < now() - interval '3 days'
      and (p.reminded_at is null or p.reminded_at < now() - interval '3 days')
      and (p.client_seen_at is null or p.client_seen_at < now() - interval '3 days')
      and exists (select 1 from intake_items i where i.project_id = p.id and i.done_at is null)
      and not exists (select 1 from suppressions s where s.email = lower(p.portal_email))`;
  const out: { project: string; status: string }[] = [];
  for (const row of due) {
    const project = await getProject(row.id);
    if (!project) continue;
    const result = await sendPortalReminder(project, row.open, row.total);
    if (result.status !== "failed") {
      await sql`update client_projects set reminder_count = reminder_count + 1, reminded_at = now() where id = ${row.id}`;
    }
    out.push({ project: row.id, status: result.status });
  }
  return out;
}
