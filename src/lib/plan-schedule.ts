// Pure helpers for monthly plans and client posts (no database), so they can be tested.

export type PlanStatus = "active" | "past_due" | "canceled" | "manual";
export type PostChannel = "social" | "google";
export type PostStatus = "draft" | "approved" | "done" | "skipped";

/** Posts included each month, by plan (from the approved price sheet, 2026-11-24). */
export const PLAN_POSTS: Record<string, { social: number; google: number }> = {
  "care-plan": { social: 0, google: 0 },
  "growth-plan": { social: 0, google: 4 },
  "presence-pro-plan": { social: 8, google: 4 },
  "ai-visibility-plan": { social: 0, google: 4 },
};

export function postAllowance(slug: string): { social: number; google: number } {
  return PLAN_POSTS[slug] ?? { social: 0, google: 0 };
}

export const statusLabel: Record<PlanStatus, string> = {
  active: "Active",
  past_due: "Payment failed",
  canceled: "Canceled",
  manual: "Active (paid outside Stripe)",
};

/** Stripe's subscription status, in our words. */
export function planStatusFromStripe(status: string): PlanStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "past_due"; // past_due, unpaid, incomplete, paused
}

/** Posts only go out while the client is paid up and posting isn't paused by hand. */
export function canPost(plan: { status: string; paused: boolean }): boolean {
  return (plan.status === "active" || plan.status === "manual") && !plan.paused;
}

const TZ = "America/Los_Angeles";

/** A wall-clock time in Pacific time as a real Date (handles daylight saving). */
export function pacific(year: number, month: number, day: number, hour: number, minute = 0): Date {
  let guess = Date.UTC(year, month, day, hour + 8, minute);
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
        .formatToParts(new Date(guess))
        .map((p) => [p.type, p.value]),
    );
    const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    const wanted = Date.UTC(year, month, day, hour, minute);
    guess += wanted - shown;
  }
  return new Date(guess);
}

/** The month after `now`'s Pacific month when it's past the 20th, otherwise this month. Returns { year, month (0-11) }. */
export function defaultDraftMonth(now: Date = new Date()): { year: number; month: number } {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now).split("-").map(Number);
  if (d > 20) return m === 12 ? { year: y + 1, month: 0 } : { year: y, month: m };
  return { year: y, month: m - 1 };
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 15)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Posting times for one month, all at 10 AM Pacific and never in the past:
 * Facebook/Instagram on Tuesdays and Fridays, Google on Mondays.
 * Returns up to `count` times for each channel.
 */
export function monthSlots(year: number, month: number, counts: { social: number; google: number }, now: Date = new Date()): { channel: PostChannel; at: Date }[] {
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const social: Date[] = [];
  const google: Date[] = [];
  for (let day = 1; day <= days; day++) {
    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
    const at = pacific(year, month, day, 10);
    if (at.getTime() < now.getTime() + 60 * 60 * 1000) continue;
    if (weekday === 2 || weekday === 5) social.push(at);
    if (weekday === 1) google.push(at);
  }
  return [
    ...social.slice(0, counts.social).map((at) => ({ channel: "social" as const, at })),
    ...google.slice(0, counts.google).map((at) => ({ channel: "google" as const, at })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Google profile posts: no hashtags, no links, at most 1,500 characters. */
export function googleText(caption: string): string {
  return caption
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1500);
}

/** A post is due when it's approved, its time has come, and it isn't more than 36 hours late. */
export function isDue(post: { status: string; publish_at: Date }, now: Date = new Date()): boolean {
  const t = post.publish_at.getTime();
  return post.status === "approved" && t <= now.getTime() && now.getTime() - t < 36 * 60 * 60 * 1000;
}

export function formatPostDate(d: Date): string {
  return d.toLocaleString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** A brand color the image renderer can trust. */
export function safeColor(value: string, fallback = "#0c2a5c"): string {
  return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
}
