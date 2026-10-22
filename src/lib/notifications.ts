import "server-only";
import { sendEmail } from "./email";
import { site } from "./site";
import type { Lead } from "./leads";

function adminLink(lead: Lead): string {
  return `${site.url}/admin/leads/${lead.id}`;
}

export async function sendAuditConfirmation(lead: Lead) {
  return sendEmail({
    to: lead.email,
    leadId: lead.id,
    template: "audit_confirmation",
    subject: `We received your free online audit request for ${lead.business_name}`,
    paragraphs: [
      `Hi ${lead.first_name},`,
      `Thanks for requesting a free online presence audit for ${lead.business_name}. We'll review your website, Google listing and other public information, and a real person checks every finding before it reaches you.`,
      `We'll email your audit as soon as it's ready. If anything is unclear, such as which business listing is yours, we'll reach out first.`,
      `Questions in the meantime? Just reply to this email or call ${site.phoneDisplay}.`,
      `The Reputation Turbo team`,
    ],
  });
}

export async function sendContactConfirmation(lead: Lead) {
  return sendEmail({
    to: lead.email,
    leadId: lead.id,
    template: "contact_confirmation",
    subject: "Thanks for contacting Reputation Turbo",
    paragraphs: [
      `Hi ${lead.first_name},`,
      `Thanks for reaching out. We received your message and will get back to you shortly.`,
      `If it's urgent, call us at ${site.phoneDisplay}.`,
      `The Reputation Turbo team`,
    ],
  });
}

export async function notifyOwner(lead: Lead, kind: "audit" | "contact", details: string, duplicate: boolean) {
  const to = process.env.OWNER_EMAIL ?? site.email;
  const label = kind === "audit" ? "Free audit request" : "Contact form message";
  return sendEmail({
    to,
    leadId: lead.id,
    template: `owner_${kind}`,
    subject: `${label}: ${lead.business_name || `${lead.first_name} ${lead.last_name}`}`,
    replyTo: lead.email,
    paragraphs: [
      `${label}${duplicate ? " (existing lead, record updated)" : ""}`,
      [
        `Name: ${lead.first_name} ${lead.last_name}`.trim(),
        `Business: ${lead.business_name || "(not given)"}`,
        `Email: ${lead.email}`,
        `Phone: ${lead.phone || "(not given)"}`,
        `Website: ${lead.website_url || "(none given)"}`,
      ].join("\n"),
      details,
      `Open in dashboard: ${adminLink(lead)}`,
    ].filter(Boolean),
  });
}
