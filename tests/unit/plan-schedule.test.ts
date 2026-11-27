import { describe, expect, it } from "vitest";
import { canPost, defaultDraftMonth, googleText, isDue, monthSlots, pacific, planStatusFromStripe, postAllowance, safeColor } from "@/lib/plan-schedule";

describe("plan schedule", () => {
  it("turns Pacific wall-clock times into the right instant, across daylight saving", () => {
    expect(pacific(2026, 11, 1, 10).toISOString()).toBe("2026-12-01T18:00:00.000Z"); // PST
    expect(pacific(2026, 6, 1, 10).toISOString()).toBe("2026-07-01T17:00:00.000Z"); // PDT
  });

  it("drafts next month once we're past the 20th", () => {
    expect(defaultDraftMonth(new Date("2026-11-27T20:00:00Z"))).toEqual({ year: 2026, month: 11 });
    expect(defaultDraftMonth(new Date("2026-12-25T20:00:00Z"))).toEqual({ year: 2027, month: 0 });
    expect(defaultDraftMonth(new Date("2026-11-10T20:00:00Z"))).toEqual({ year: 2026, month: 10 });
  });

  it("puts social posts on Tuesdays and Fridays and Google on Mondays, at 10 AM", () => {
    const slots = monthSlots(2026, 11, { social: 8, google: 4 }, new Date("2026-11-27T00:00:00Z"));
    expect(slots.filter((s) => s.channel === "social")).toHaveLength(8);
    expect(slots.filter((s) => s.channel === "google")).toHaveLength(4);
    const days = slots.map((s) => new Date(s.at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short" }));
    slots.forEach((s, i) => expect(s.channel === "google" ? days[i] === "Mon" : ["Tue", "Fri"].includes(days[i])).toBe(true));
    expect(slots[0].at.toISOString()).toBe("2026-12-01T18:00:00.000Z");
  });

  it("never schedules in the past", () => {
    const now = new Date("2026-12-15T12:00:00Z");
    expect(monthSlots(2026, 11, { social: 20, google: 20 }, now).every((s) => s.at > now)).toBe(true);
  });

  it("knows what each plan includes", () => {
    expect(postAllowance("presence-pro-plan")).toEqual({ social: 8, google: 4 });
    expect(postAllowance("care-plan")).toEqual({ social: 0, google: 0 });
    expect(postAllowance("unknown")).toEqual({ social: 0, google: 0 });
  });

  it("maps Stripe statuses and stops posting when unpaid", () => {
    expect(planStatusFromStripe("active")).toBe("active");
    expect(planStatusFromStripe("past_due")).toBe("past_due");
    expect(planStatusFromStripe("unpaid")).toBe("past_due");
    expect(planStatusFromStripe("canceled")).toBe("canceled");
    expect(canPost({ status: "active", paused: false })).toBe(true);
    expect(canPost({ status: "manual", paused: false })).toBe(true);
    expect(canPost({ status: "active", paused: true })).toBe(false);
    expect(canPost({ status: "past_due", paused: false })).toBe(false);
    expect(canPost({ status: "canceled", paused: false })).toBe(false);
  });

  it("strips hashtags and links for Google", () => {
    expect(googleText("Brakes squeaking? Stop by. https://x.com\n\n#SanDiego #Smog")).toBe("Brakes squeaking? Stop by.");
  });

  it("is due only when approved and not too late", () => {
    const now = new Date("2026-12-01T19:00:00Z");
    expect(isDue({ status: "approved", publish_at: new Date("2026-12-01T18:00:00Z") }, now)).toBe(true);
    expect(isDue({ status: "draft", publish_at: new Date("2026-12-01T18:00:00Z") }, now)).toBe(false);
    expect(isDue({ status: "approved", publish_at: new Date("2026-12-01T20:00:00Z") }, now)).toBe(false);
    expect(isDue({ status: "approved", publish_at: new Date("2026-11-29T18:00:00Z") }, now)).toBe(false);
  });

  it("only trusts real hex colors", () => {
    expect(safeColor("#ff6500")).toBe("#ff6500");
    expect(safeColor("red; background:url(x)")).toBe("#0c2a5c");
  });
});
