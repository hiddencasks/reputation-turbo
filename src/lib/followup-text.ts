/**
 * The personal follow-up note that goes out about an hour after an audit
 * report is emailed. This file holds the pure parts (names, the prompt, the
 * email text, and the "should this still go out?" rules) so they can be
 * tested without a database or an AI service. See followup.ts for the rest.
 */
import { site } from "./site";

export const FOLLOWUP_STATUSES = ["writing", "scheduled", "sending", "sent", "skipped", "failed", "draft_failed"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export type Followup = {
  id: string;
  lead_id: string;
  check_id: string;
  subject: string;
  body: string;
  status: FollowupStatus;
  send_at: Date;
  sent_at: Date | null;
  note: string;
  created_at: Date;
  updated_at: Date;
};

/** Minutes between the report email and the personal note (FOLLOWUP_DELAY_MINUTES, default 60). */
export function followupDelayMinutes(): number {
  const n = Number(process.env.FOLLOWUP_DELAY_MINUTES);
  return Number.isFinite(n) && n >= 0 && n <= 7 * 24 * 60 ? Math.round(n) : 60;
}

const LEGAL_SUFFIX = /[,\s]+(l\.?\s?l\.?\s?c\.?|inc\.?|incorporated|corp\.?|corporation|co\.|company|ltd\.?|llp\.?|pllc\.?|dba)$/i;

/**
 * The name a person would say out loud: "SHOP FLOWERS TODAY, LLC" becomes
 * "Shop Flowers Today", "www.joesplumbing.com" becomes "joesplumbing" (the
 * AI is told to turn that into normal words). Pure, so it can be tested.
 */
export function friendlyBusinessName(raw: string): string {
  let name = raw.trim().replace(/\s+/g, " ");
  // A website typed as the name.
  if (/^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z]{2,})+\/?$/i.test(name)) {
    name = name.replace(/^(https?:\/\/)?(www\.)?/i, "").replace(/(\.[a-z]{2,})+\/?$/i, "");
    return name;
  }
  for (let i = 0; i < 3 && LEGAL_SUFFIX.test(name); i++) name = name.replace(LEGAL_SUFFIX, "").trim();
  name = name.replace(/[,.\s]+$/, "");
  // ALL CAPS reads like shouting in an email.
  if (name.length > 4 && name === name.toUpperCase() && /[A-Z]{3}/.test(name)) {
    name = name.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
  }
  return name || raw.trim();
}

/** "LORENZO" -> "Lorenzo", "" stays "". */
export function friendlyFirstName(raw: string): string {
  const first = raw.trim().split(/\s+/)[0] ?? "";
  if (!first) return "";
  return first === first.toUpperCase() || first === first.toLowerCase() ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : first;
}

export const FOLLOWUP_SYSTEM = `You write a short, personal follow-up email for ${site.founderName}, the founder of ${site.name}, a small local marketing business in ${site.serviceArea}. It helps local businesses get found on Google, Google Maps and AI assistants, with better websites, Google profiles and reviews.

About an hour ago the business owner was emailed a link to their free online audit report. This note comes from ${site.founderFirstName} personally and should read like it was typed on a phone after looking at their report: warm, plain, specific, a little casual. Not a marketing email.

Rules:
- Use only findings that appear in the audit below. Never invent a fact, number, review, competitor or quote.
- Pick the ONE finding most likely to make this owner want to talk (two at most, if they connect). Prefer something concrete and a little surprising: what an AI assistant said about them, a competitor named instead of them, a wrong name or detail, a missing or weak Google profile, few or old reviews, a website problem a customer would notice. Name the specific assistant or competitor when the audit does.
- Reveal the problem and why it costs them customers. Do NOT explain how to fix it, give steps, tips or tools. It is fine to say it's fixable.
- If you list AI assistants, list all five together: ChatGPT, Claude, Gemini, Perplexity and Copilot. Naming just the one assistant a finding came from is fine.
- No prices, no package names, no phone numbers, no links (a booking link is added after your text), no emojis, no bullet points, no markdown, no exclamation marks.
- Never say or imply that AI builds websites. Don't call ${site.name} new, and don't claim it's big or established.
- Greeting: "<first name>," on its own line, or "Hi there," if no first name is given.
- Then 2 to 4 short sentences, under 80 words in total. End with a low-pressure question about a quick 15-minute call this week.
- Do not sign off or add a signature; that is added after your text.
- Call the business by the friendly name given (a name a person would say), never "LLC", "Inc" or a web address. If the friendly name looks like a run-together web address, write it as normal words.
- Subject line: short and personal, 3 to 7 words, sentence case, no clickbait, mentions the business or the finding. Example: "Quick thought on Shop Flowers Today".

Example of the tone (do not copy its facts):
Lorenzo,

I noticed Claude is warning people away from your shop over a couple of old reviews, and it lists you under two different names. Both are fixable. Got 15 minutes this week?`;

export type FollowupPromptInput = {
  firstName: string;
  businessName: string;
  trade: string;
  city: string;
  /** The whole audit as Markdown (see audit/export.ts). */
  auditMarkdown: string;
};

export function followupUserPrompt(input: FollowupPromptInput): string {
  const first = friendlyFirstName(input.firstName);
  return [
    `First name: ${first || "(none given, greet with \"Hi there,\")"}`,
    `Business name as entered: ${input.businessName}`,
    `Friendly business name: ${friendlyBusinessName(input.businessName)}`,
    `Type of business: ${input.trade}`,
    `City: ${input.city}`,
    "",
    "Their audit:",
    "",
    input.auditMarkdown,
  ].join("\n");
}

/** The JSON shape the AI returns. */
export const FOLLOWUP_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "Email subject line, 3 to 7 words." },
    body: { type: "string", description: "The email text: greeting line, blank line, then 2 to 4 sentences. No signature." },
    finding: { type: "string", description: "One short line for the owner: which audit finding the note is built on." },
  },
  required: ["subject", "body", "finding"],
  additionalProperties: false,
} as const;

/** Cleans what the AI wrote: plain text only, no signature, no links, sane length. */
export function cleanDraft(draft: { subject: string; body: string }): { subject: string; body: string } {
  const subject = draft.subject.replace(/[\r\n]+/g, " ").trim().replace(/^["']|["']$/g, "").trim().slice(0, 120);
  let body = draft.body
    .replace(/\r\n/g, "\n")
    .replace(/\*\*|__|`/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Drop a signature if the AI added one anyway.
  body = body.replace(new RegExp(`\\n+(best|thanks|cheers|talk soon|regards)?,?\\s*\\n*-?\\s*${site.founderFirstName}\\b[\\s\\S]*$`, "i"), "").trim();
  return { subject, body: body.slice(0, 2000) };
}

/** The signature added under every note. */
export function followupSignature(): string {
  return [site.founderFirstName, site.name, `Grab a 15-minute slot: ${site.bookingUrl}`].join("\n");
}

/** The small print under the signature, with the address and a way to opt out. */
export function followupFooter(addressLine: string): string {
  return `${site.name} · ${addressLine}\nNot interested? Reply "stop" and I won't email again.`;
}

/** The full plain-text email. */
export function followupText(body: string, addressLine: string): string {
  return [body.trim(), "", followupSignature(), "", "--", followupFooter(addressLine)].join("\n");
}

/** "Alvin at Reputation Turbo <info@...>", using EMAIL_FROM's address. */
export function followupFrom(emailFrom: string | undefined): string {
  const address = emailFrom?.match(/<([^>]+)>/)?.[1] ?? (emailFrom && emailFrom.includes("@") ? emailFrom.trim() : site.email);
  return `${site.founderFirstName} at ${site.name} <${address}>`;
}

const STOP_STAGES = ["won", "lost", "do_not_contact", "consultation_scheduled", "proposal_sent"];

/**
 * Why a note should NOT go out right now, or null when it's fine to send.
 * Checked when the note is written and again just before it sends.
 */
export function followupBlockReason(input: { email: string; stage: string; suppressed: boolean; vendor: boolean }): string | null {
  if (!input.email) return "This lead has no email address.";
  if (input.suppressed) return "This email address has opted out.";
  if (input.vendor) return "This lead is marked as a sales pitch.";
  if (STOP_STAGES.includes(input.stage)) return `The lead moved to a stage where a follow-up no longer fits (${input.stage.replace(/_/g, " ")}).`;
  return null;
}
