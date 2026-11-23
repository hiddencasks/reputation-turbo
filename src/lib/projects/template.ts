// The standard client delivery steps and intake checklist, plus the time math
// used by the dashboard and the portal. Pure functions only, so they can be tested.

export type StepStatus = "not_started" | "in_progress" | "waiting" | "done";

export const STEP_STATUSES: { id: StepStatus; label: string }[] = [
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "waiting", label: "Waiting on client" },
  { id: "done", label: "Done" },
];

export const PHASES = ["Kickoff", "Intake", "Plan", "Build", "Google and listings", "Launch", "Handoff"] as const;

type StepTemplate = {
  phase: (typeof PHASES)[number];
  title: string;
  who: string;
  detail: string;
  /** Only for packages that include a new website. */
  website?: boolean;
};

export const STEP_TEMPLATE: StepTemplate[] = [
  { phase: "Kickoff", title: "Mark as Won and open the client file", who: "Us", detail: "Set the lead to Won with the package, and start the client file." },
  { phase: "Kickoff", title: "Welcome email and agreement", who: "Us", detail: "Scope, 2 revision rounds, what the client pays directly, and that the website and accounts are theirs." },
  { phase: "Kickoff", title: "Kickoff call", who: "You + client", detail: "About 30 minutes: goals, services, prices to show, area served, what customers ask before booking." },
  { phase: "Intake", title: "Client sends the intake items", who: "Client", detail: "Invite them to the portal. Mark this step Waiting on client until the checklist is done." },
  { phase: "Intake", title: "Client sets up their own accounts", who: "Client (you guide)", detail: "Domain, free hosting account, and adding info@reputationturbo.com as a manager on Google and Facebook. They sign in themselves." },
  { phase: "Intake", title: "Fresh audit as the official \"before\"", who: "Us", detail: "Run a new audit from the lead page (about 30 to 50 cents)." },
  { phase: "Plan", title: "Site map and content plan", who: "Us", detail: "Pages, and the customer questions AI assistants should answer with their name.", website: true },
  { phase: "Build", title: "Write the page copy", who: "Us", detail: "Draft, then edit.", website: true },
  { phase: "Build", title: "Design and build the website", who: "Us", detail: "Their logo, photos and colors, with click-to-call, directions and a contact form.", website: true },
  { phase: "Build", title: "GEO work on the website", who: "Us", detail: "Business details in structured data, an FAQ written for AI answers, and the AI-readable summary file.", website: true },
  { phase: "Build", title: "Review rounds with the client", who: "Client, then us", detail: "Send a preview link. Round 1, fixes, round 2. Use Waiting on client while they review.", website: true },
  { phase: "Google and listings", title: "Google Business Profile", who: "Us + client", detail: "Create or claim and verify if needed, then categories, services, hours, photos, description and website link." },
  { phase: "Google and listings", title: "Facebook and Instagram", who: "Us + client", detail: "Set up or clean up, matching name, address, phone and hours." },
  { phase: "Google and listings", title: "Listings", who: "Us", detail: "Bing, Apple Business Connect, Yelp (free only), BBB, YellowPages and the directories the audit shows AI assistants citing." },
  { phase: "Google and listings", title: "Review request link, QR code and message templates", who: "Us", detail: "" },
  { phase: "Launch", title: "Go live and test", who: "Us (client approves)", detail: "Connect the domain, then test the contact form, click-to-call, phone layout and speed.", website: true },
  { phase: "Launch", title: "Tell Google and Bing about the website", who: "Us", detail: "Search Console and Bing Webmaster Tools, with the client as the owner.", website: true },
  { phase: "Handoff", title: "Handoff call and packet", who: "You + client", detail: "Where everything lives, what they own and pay, and how to ask for changes. Offer the optional monthly plans." },
  { phase: "Handoff", title: "30-day check", who: "Us", detail: "Re-run the audit for a before/after, and ask for a Google review and a short testimonial." },
];

/** Packages that include building a new website. */
export function includesWebsite(packageName: string): boolean {
  return /website|premium/i.test(packageName);
}

export function stepsFor(packageName: string): StepTemplate[] {
  const website = includesWebsite(packageName);
  return STEP_TEMPLATE.filter((s) => website || !s.website);
}

export type IntakeKind = "answer" | "upload" | "access";

type IntakeTemplate = { section: string; kind: IntakeKind; label: string; help: string; website?: boolean };

export const OUR_EMAIL = "info@reputationturbo.com";

export const INTAKE_TEMPLATE: IntakeTemplate[] = [
  { section: "Your business", kind: "answer", label: "Business name", help: "Exactly as it should appear everywhere, including on Google." },
  { section: "Your business", kind: "answer", label: "Address, and whether customers come to you or you go to them", help: "If you work out of your home, we can hide the address and show the areas you serve instead." },
  { section: "Your business", kind: "answer", label: "Phone number and email to show customers", help: "" },
  { section: "Your business", kind: "answer", label: "Business hours", help: "Include holidays, and whether customers can walk in or need an appointment." },
  { section: "Your business", kind: "answer", label: "Services and prices to show", help: "List what you offer, prices if you want them shown, anything you don't do, and any coupons or specials." },
  { section: "Your business", kind: "answer", label: "Cities and neighborhoods you want customers from", help: "" },
  { section: "Your business", kind: "answer", label: "Licenses, certifications or awards", help: "For example a state license number. We'll only show what you're OK with." },
  { section: "Your business", kind: "answer", label: "Payment types, languages spoken, parking and anything else customers ask", help: "" },
  { section: "Your business", kind: "answer", label: "Two or three competitors you respect or want to beat", help: "" },
  { section: "Look and feel", kind: "upload", label: "Your logo", help: "The best version you have. If you don't have a logo, mark this done and tell us in the box below." },
  { section: "Look and feel", kind: "upload", label: "Photos", help: "10 or more if you can: storefront, sign, work area, equipment, your team, you at work. Phone photos are fine; send the originals." },
  { section: "Look and feel", kind: "answer", label: "Colors you like, and one or two websites you like the look of", help: "", website: true },
  { section: "Look and feel", kind: "answer", label: "Three to five customer reviews or quotes you're OK sharing", help: "Copy them in, with the customer's first name if they agreed." },
  { section: "Accounts you own", kind: "access", label: "Domain name", help: "This is your website's address. You buy it in your own name; we'll help you pick one and walk you through it on a short call. Mark done once it's bought.", website: true },
  { section: "Accounts you own", kind: "access", label: "Website hosting account", help: "A free account in your name where your website will live. We'll send you the sign-up link, then you add us as a member. Mark done once that's set.", website: true },
  { section: "Accounts you own", kind: "access", label: "Google Business Profile", help: `If you have one, open it on Google, go to Business Profile settings, then Managers, and add ${OUR_EMAIL} as a Manager. If you don't have one, mark this done and say so in the notes; we'll set it up together.` },
  { section: "Accounts you own", kind: "access", label: "Facebook and Instagram", help: `If you have a Facebook Page, add ${OUR_EMAIL} under Page access in its settings. No Page yet? Mark this done and we'll create it with you.` },
  { section: "Accounts you own", kind: "answer", label: "Other listings you already have", help: "Yelp, Bing, Apple Maps, Nextdoor, BBB and so on. Links are perfect, no passwords." },
  { section: "Accounts you own", kind: "answer", label: "Do you want a business email at your own domain?", help: "Optional, about $7 to $8.40 a month per person, paid to Google directly. Yes, no, or not sure.", website: true },
];

export function intakeFor(packageName: string): IntakeTemplate[] {
  const website = includesWebsite(packageName);
  return INTAKE_TEMPLATE.filter((i) => website || !i.website);
}

// ---------- Time math ----------

export type TimeEntryLike = { started_at: Date; ended_at: Date | null; manual_minutes: number | null };

/** Minutes for one entry; a running timer counts up to `now`. */
export function entryMinutes(e: TimeEntryLike, now: Date = new Date()): number {
  if (e.manual_minutes != null) return e.manual_minutes;
  const end = e.ended_at ?? now;
  return Math.max(0, (end.getTime() - e.started_at.getTime()) / 60_000);
}

export function totalMinutes(entries: TimeEntryLike[], now: Date = new Date()): number {
  return entries.reduce((sum, e) => sum + entryMinutes(e, now), 0);
}

/** "0 min", "25 min", "1 h 05 min". */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

/** Wait time in days with one decimal, e.g. "2.5 days". */
export function formatWaitDays(minutes: number): string {
  const days = minutes / (60 * 24);
  if (days === 0) return "0 days";
  if (days < 0.1) return "under 0.1 days";
  const r = Math.round(days * 10) / 10;
  return `${r} ${r === 1 ? "day" : "days"}`;
}

/** Total wait minutes for a step, including a wait that is still going. */
export function stepWaitMinutes(step: { wait_minutes: number; waiting_since: Date | null }, now: Date = new Date()): number {
  const open = step.waiting_since ? Math.max(0, (now.getTime() - step.waiting_since.getTime()) / 60_000) : 0;
  return step.wait_minutes + open;
}

/** Parses "45", "1:30", "1h 30m", "1.5h" or "90 min" into minutes; null when it can't. */
export function parseMinutes(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d+):(\d{1,2})$/))) return Number(m[1]) * 60 + Number(m[2]);
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\s*(?:(\d+)\s*(?:m|min|mins|minutes?)?)?$/))) return Math.round(Number(m[1]) * 60 + Number(m[2] ?? 0));
  if ((m = s.match(/^(\d+)\s*(?:m|min|mins|minutes?)?$/))) return Number(m[1]);
  return null;
}

export type PhaseState = "done" | "in_progress" | "up_next";

/** Client-facing progress: each phase is done, in progress, or up next. */
export function phaseProgress(steps: { phase: string; status: StepStatus }[]): { phase: string; state: PhaseState }[] {
  const phases = PHASES.filter((p) => steps.some((s) => s.phase === p));
  return phases.map((phase) => {
    const own = steps.filter((s) => s.phase === phase);
    if (own.every((s) => s.status === "done")) return { phase, state: "done" as const };
    if (own.some((s) => s.status !== "not_started")) return { phase, state: "in_progress" as const };
    return { phase, state: "up_next" as const };
  });
}

/** CSV-safe cell. */
export function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
