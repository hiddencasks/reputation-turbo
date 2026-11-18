/**
 * A short "where did this lead come from and what did they tell us" summary for the
 * leads board and list, built from the lead's form activities, so the owner doesn't
 * have to open each lead. Pure, so it can be tested without a database.
 */
import { describeAdSource, parseAdSource } from "./ad-source";
import { QUIZ, quizScore } from "./quiz";

export type SummaryActivity = {
  lead_id: string;
  kind: string;
  body: string;
  meta: Record<string, unknown> | null;
  created_at: Date;
};

export type LeadSummary = {
  /** Where the lead first came from, such as "GEO quiz" or "Prospect finder". */
  source: string;
  /** The ad or tagged link that brought them, such as "Meta ad · geo-v1". */
  ad: string | null;
  /** Short facts, such as "Quiz score 2 of 7" or "Wants help with: Reviews". */
  details: string[];
  /** Their latest contact form message, if they sent one. */
  message: string | null;
  /** True when it reads like someone selling to us, or the owner marked it so. */
  vendor: boolean;
  /** Why: "marked" by the owner, or "auto" from the message wording. */
  vendorReason: "marked" | "auto" | null;
};

/** Activity kinds that come from a form or from adding a lead. */
export const SUMMARY_KINDS = ["audit_form", "ai_search", "contact_form", "geo_quiz", "outreach", "manual", "vendor_flag"] as const;

/**
 * Wording that vendors use when pitching their own services (SEO, ads, apps, outsourcing...).
 * Two or more hits, or one strong one, marks a message as a likely sales pitch.
 */
const STRONG_PITCH = [
  /\b(our|my) (agency|company|team) (can|will|offers?|specializes?|helps?)\b/i,
  /\b(we|i) (can|could|will) (help you )?(rank|get you|boost|increase|improve) (your )?(website|ranking|traffic|sales|leads|seo)/i,
  /\b(guest post|backlinks?|link building|white[- ]label|outsourc\w*|offshore|virtual assistants?)\b/i,
  /\b(first page of google|page 1 of google|top of google)\b/i,
  /\b(no obligation|free (quote|proposal|consultation) for you|special offer|limited[- ]time offer|discount for you)\b/i,
  /\b(would you be interested in|are you interested in|can i send you|may i send you|shall i send)\b/i,
];
const WEAK_PITCH = [
  /\b(seo|ppc|google ads|facebook ads|lead generation|web design|web development|app development|redesign|digital marketing|marketing services|social media management)\b/i,
  /\b(i came across your (website|site|business)|i was (looking at|checking|browsing) your (website|site))\b/i,
  /\b(i('| a)m reaching out|reaching out (to|because)|quick question for you)\b/i,
  /\b(partnership|collaborat\w+|affordable (price|rates?|packages?)|reasonable (price|rates?))\b/i,
  /\b(our services|our team|our clients|we offer|we provide|we specialize)\b/i,
  /\b(reply (with )?(yes|interested)|let me know if you('| a)re interested)\b/i,
];

/** Guesses whether a message is a vendor selling to us. */
export function looksLikePitch(text: string): boolean {
  if (!text.trim()) return false;
  if (STRONG_PITCH.some((r) => r.test(text))) return true;
  return WEAK_PITCH.filter((r) => r.test(text)).length >= 2;
}

const FINDER_PREFIX = "Found with the prospect finder";

export function sourceLabel(source: string, firstBody = ""): string {
  switch (source) {
    case "audit_form": return "Free audit form";
    case "ai_search": return "AI search audit form";
    case "contact_form": return "Contact form";
    case "geo_quiz": return "GEO quiz";
    case "manual": return "Added by you (asked for audit)";
    case "outreach": return firstBody.startsWith(FINDER_PREFIX) ? "Prospect finder" : "Added by you (outreach)";
    default: return source.replace(/_/g, " ");
  }
}

const pick = (body: string, label: string) => body.match(new RegExp(`${label}: (.+?)\\.(?: |$)`))?.[1];

/** activities: this lead's form activities, in any order. */
export function summarizeLead(lead: { source: string }, activities: SummaryActivity[]): LeadSummary {
  const acts = [...activities].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const first = acts.find((a) => a.kind === lead.source) ?? acts.find((a) => a.kind !== "vendor_flag");
  const details: string[] = [];
  const add = (d: string | undefined) => {
    if (d && !details.includes(d)) details.push(d);
  };

  let ad: string | null = null;
  for (const a of acts) {
    const raw = a.meta?.ad;
    const parsed = raw ? parseAdSource(encodeURIComponent(JSON.stringify(raw))) : null;
    if (parsed) {
      ad = describeAdSource(parsed);
      break;
    }
  }

  let message: string | null = null;
  let marked: boolean | null = null;
  for (const a of acts) {
    if (a.kind === "vendor_flag") {
      marked = a.meta?.vendor === true;
      continue;
    }
    if (a.kind === "geo_quiz") {
      const answers = a.meta?.quiz as Record<string, string> | undefined;
      if (answers && typeof answers === "object") {
        const gaps = QUIZ.filter((q) => answers[q.id] !== "yes").map((q) => q.short);
        add(`Quiz score ${quizScore(answers)} of ${QUIZ.length}`);
        if (gaps.length) add(`Missing: ${gaps.join(", ")}`);
      } else {
        add(a.body.split(". Gaps")[0].replace(/\.$/, ""));
      }
    } else if (a.kind === "audit_form" || a.kind === "ai_search") {
      add(a.kind === "ai_search" || a.body.includes("AI search check") ? "Asked for a free audit with AI search check" : "Asked for a free audit");
      add(pick(a.body, "Wants help with") && `Wants help with: ${pick(a.body, "Wants help with")}`);
      add(pick(a.body, "Interested in") && `Interested in: ${pick(a.body, "Interested in")}`);
    } else if (a.kind === "contact_form") {
      if (a.body.trim()) message = a.body.trim();
    }
  }

  const auto = acts.some((a) => a.kind === "contact_form" && looksLikePitch(a.body));
  const vendor = marked ?? auto;
  return {
    source: sourceLabel(lead.source, first?.kind === "vendor_flag" ? "" : first?.body ?? ""),
    ad,
    details,
    message,
    vendor,
    vendorReason: marked !== null ? (marked ? "marked" : null) : auto ? "auto" : null,
  };
}
