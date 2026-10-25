import "server-only";
import { Resend } from "resend";
import { sql } from "./db";
import { addressOneLine, site } from "./site";

type SendInput = {
  to: string;
  subject: string;
  /** Plain paragraphs; each becomes a <p> in the HTML version. */
  paragraphs: string[];
  template: string;
  leadId?: string;
  replyTo?: string;
};

export type SendResult = { status: "sent" | "logged" | "failed"; error?: string };

/**
 * Sends one email through Resend and records it. Without RESEND_API_KEY
 * (local development) the email is only recorded, with status "logged".
 */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  const text = [...input.paragraphs, "", footerText()].join("\n\n");
  const html = renderHtml(input.paragraphs);
  const apiKey = process.env.RESEND_API_KEY;

  let result: SendResult;
  let providerId: string | null = null;
  if (!apiKey) {
    console.info(`[email:logged] to=${input.to} subject="${input.subject}"`);
    result = { status: "logged" };
  } else {
    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? `${site.name} <${site.email}>`,
        to: input.to,
        subject: input.subject,
        text,
        html,
        replyTo: input.replyTo ?? site.email,
      });
      if (error) throw new Error(error.message);
      providerId = data?.id ?? null;
      result = { status: "sent" };
    } catch (err) {
      result = { status: "failed", error: err instanceof Error ? err.message : String(err) };
      console.error(`[email:failed] to=${input.to}: ${result.error}`);
    }
  }

  await sql`
    insert into emails (lead_id, to_email, subject, template, status, provider_id, error)
    values (${input.leadId ?? null}, ${input.to}, ${input.subject}, ${input.template},
            ${result.status}, ${providerId}, ${result.error ?? null})`;
  return result;
}

function footerText(): string {
  return [site.name, addressOneLine, site.showPhone ? site.phoneDisplay : site.email].join(" · ");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderHtml(paragraphs: string[]): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;line-height:1.55">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;color:#1a1f2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#061B3E;padding:18px 24px;font-size:18px;font-weight:bold;font-style:italic;letter-spacing:1px;color:#ffffff">REPUTATION <span style="color:#FF6500">TURBO</span></td></tr>
<tr><td style="padding:24px;font-size:15px">${body}</td></tr>
<tr><td style="padding:16px 24px;background:#f4f5f8;font-size:12px;color:#5b6475">${escapeHtml(footerText())}</td></tr>
</table></td></tr></table></body></html>`;
}
