// The plain-language project agreement and welcome email, filled in from the lead
// and the package. Pure functions, so they can be tested and previewed.

export type AgreementInput = {
  businessName: string;
  clientName: string;
  packageName: string;
  deliverables: string[];
  revisionRounds: number | null;
  extraRevisionCents: number | null;
  priceCents: number | null;
  chargedCents: number | null;
  ownerName: string;
  ourName: string;
  ourAddress: string;
  date: Date;
};

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;

const longDate = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "long" });

/** The amount line: "No charge (a $1,497 value)", "$1,497", or "$997 (a $1,497 value)". */
export function priceLine(priceCents: number | null, chargedCents: number | null): string {
  const charged = chargedCents ?? priceCents;
  if (charged == null) return "As agreed in writing";
  if (charged === 0) return priceCents ? `No charge (a ${money(priceCents)} value)` : "No charge";
  if (priceCents && priceCents > charged) return `${money(charged)} (a ${money(priceCents)} value)`;
  return money(charged);
}

export function agreementText(a: AgreementInput): string {
  const business = a.businessName || a.clientName || "your business";
  const charged = a.chargedCents ?? a.priceCents;
  const rounds = a.revisionRounds ?? 2;
  const lines = [
    `Project agreement`,
    `Between ${a.ourName} (${a.ownerName}, ${a.ourAddress}) and ${business}${a.clientName && a.clientName !== business ? ` (${a.clientName})` : ""}. ${longDate(a.date)}.`,
    ``,
    `1. What we'll do: ${a.packageName || "the work we agreed on"}`,
    ...a.deliverables.map((d) => `   - ${d}`),
    ``,
    `2. Price: ${priceLine(a.priceCents, a.chargedCents)}`,
    charged ? `   Payment terms are as we agreed in writing before work starts.` : `   We won't bill you for this package.`,
    ``,
    `3. What you pay directly, in your own name`,
    `   - Domain name: about $10 to $22 a year, paid to the registrar`,
    `   - Website hosting: often $0 a month on the hosting we recommend`,
    `   - Business email, if you want it: about $7 to $8.40 a month per person`,
    `   - Any other tools you choose, paid to that provider`,
    ``,
    `4. Changes: ${rounds} rounds of changes are included.${a.extraRevisionCents ? ` More rounds are ${money(a.extraRevisionCents)} each, only if you ask for them.` : ""} Nothing goes live until you approve it.`,
    ``,
    `5. It's all yours: your website, domain and accounts belong to you. We never ask for your passwords; you add us as a manager and can remove us any time. If you ever stop a monthly plan, your website stays up and stays yours.`,
    ``,
    `6. Your part: send the items on your checklist and reply to review requests, so we can keep things moving. We start building once the checklist is in.`,
    ``,
    `7. Monthly plans are optional and never required.`,
    ``,
    `8. Either of us can end this project by email. Anything you've approved is yours to keep.`,
  ];
  return lines.join("\n");
}

export function welcomeParagraphs(o: { firstName: string; businessName: string; ownerFirstName: string; ourName: string; link: string; bookingUrl: string; hasAgreement: boolean }): string[] {
  const business = o.businessName || "your business";
  return [
    o.firstName ? `Hi ${o.firstName},` : "Hi,",
    `Welcome aboard, and thank you for trusting ${o.ourName} with ${business}! I'm excited to get started.`,
    `Everything for your project lives on one private page:`,
    o.link,
    o.hasAgreement
      ? `First, please read the short project agreement at the top and tap "I agree". It spells out what we'll do, what you pay directly, and that everything we set up is yours. Then work through the checklist (a few questions, your logo and photos, and a couple of account steps) whenever it suits you. Your answers save as you go.`
      : `Work through the checklist (a few questions, your logo and photos, and a couple of account steps) whenever it suits you. Your answers save as you go.`,
    `We never ask for your passwords. For accounts, you add us as a manager and you stay the owner.`,
    `If we haven't set up our kickoff call yet, grab a time here: ${o.bookingUrl}`,
    `Questions? Just reply to this email.`,
    `${o.ownerFirstName}, ${o.ourName}`,
  ];
}
