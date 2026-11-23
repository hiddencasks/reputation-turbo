import { describe, expect, it } from "vitest";
import { entryMinutes, formatMinutes, formatWaitDays, includesWebsite, intakeFor, parseMinutes, phaseProgress, stepsFor, stepWaitMinutes, STEP_TEMPLATE, totalMinutes } from "@/lib/projects/template";

describe("client project templates", () => {
  it("has 19 steps for website packages and fewer without a website", () => {
    expect(STEP_TEMPLATE).toHaveLength(19);
    expect(stepsFor("Business Website Launch")).toHaveLength(19);
    expect(stepsFor("Premium Digital Presence")).toHaveLength(19);
    expect(stepsFor("GEO Setup")).toHaveLength(12);
    expect(includesWebsite("Starter Online Presence")).toBe(false);
    expect(intakeFor("GEO Setup").some((i) => i.label === "Domain name")).toBe(false);
    expect(intakeFor("Business Website Launch").some((i) => i.label === "Domain name")).toBe(true);
  });

  it("never asks for passwords", () => {
    for (const i of intakeFor("Business Website Launch")) expect(`${i.label} ${i.help}`).not.toMatch(/(send|share|give|enter)( us)? (your )?passwords?/i);
  });
});

describe("time math", () => {
  const t = (iso: string) => new Date(iso);
  it("counts timed, running and typed-in entries", () => {
    const now = t("2026-11-23T12:00:00Z");
    expect(entryMinutes({ started_at: t("2026-11-23T10:00:00Z"), ended_at: t("2026-11-23T10:45:00Z"), manual_minutes: null })).toBe(45);
    expect(entryMinutes({ started_at: t("2026-11-23T11:30:00Z"), ended_at: null, manual_minutes: null }, now)).toBe(30);
    expect(entryMinutes({ started_at: t("2026-11-23T11:30:00Z"), ended_at: null, manual_minutes: 90 }, now)).toBe(90);
    expect(totalMinutes([{ started_at: t("2026-11-23T10:00:00Z"), ended_at: t("2026-11-23T10:45:00Z"), manual_minutes: null }, { started_at: now, ended_at: now, manual_minutes: 15 }], now)).toBe(60);
  });

  it("formats minutes and wait days", () => {
    expect(formatMinutes(25)).toBe("25 min");
    expect(formatMinutes(65)).toBe("1 h 05 min");
    expect(formatWaitDays(0)).toBe("0 days");
    expect(formatWaitDays(1440)).toBe("1 day");
    expect(formatWaitDays(1440 * 2.5)).toBe("2.5 days");
    expect(stepWaitMinutes({ wait_minutes: 60, waiting_since: t("2026-11-23T11:00:00Z") }, t("2026-11-23T12:00:00Z"))).toBe(120);
  });

  it("reads typed times", () => {
    expect(parseMinutes("45")).toBe(45);
    expect(parseMinutes("1:30")).toBe(90);
    expect(parseMinutes("1h 30m")).toBe(90);
    expect(parseMinutes("1.5h")).toBe(90);
    expect(parseMinutes("2 hours")).toBe(120);
    expect(parseMinutes("90 min")).toBe(90);
    expect(parseMinutes("lots")).toBeNull();
    expect(parseMinutes("")).toBeNull();
  });

  it("shows clients a simple phase status", () => {
    expect(phaseProgress([
      { phase: "Kickoff", status: "done" },
      { phase: "Intake", status: "waiting" },
      { phase: "Intake", status: "not_started" },
      { phase: "Build", status: "not_started" },
    ])).toEqual([
      { phase: "Kickoff", state: "done" },
      { phase: "Intake", state: "in_progress" },
      { phase: "Build", state: "up_next" },
    ]);
  });
});

import { agreementText, priceLine } from "@/lib/projects/agreement";

describe("project agreement", () => {
  const base = {
    businessName: "Smoggy Joe's",
    clientName: "Joe Test",
    packageName: "Business Website Launch",
    deliverables: ["Up to 5-page website"],
    revisionRounds: 2,
    extraRevisionCents: 9500,
    ownerName: "Alvin Shamoun",
    ourName: "Reputation Turbo",
    ourAddress: "3911 N. Cordoba Ave. Ste. K, Spring Valley, CA 91977",
    date: new Date("2026-11-23T21:00:00Z"),
  };

  it("shows the price plainly", () => {
    expect(priceLine(149700, 0)).toBe("No charge (a $1,497 value)");
    expect(priceLine(149700, null)).toBe("$1,497");
    expect(priceLine(149700, 99700)).toBe("$997 (a $1,497 value)");
    expect(priceLine(null, null)).toBe("As agreed in writing");
  });

  it("fills in the lead and package, and keeps the promises from the site", () => {
    const text = agreementText({ ...base, priceCents: 149700, chargedCents: 0 });
    expect(text).toContain("Between Reputation Turbo (Alvin Shamoun, 3911 N. Cordoba Ave. Ste. K, Spring Valley, CA 91977) and Smoggy Joe's (Joe Test). November 23, 2026.");
    expect(text).toContain("1. What we'll do: Business Website Launch\n   - Up to 5-page website");
    expect(text).toContain("We won't bill you for this package.");
    expect(text).toContain("2 rounds of changes are included. More rounds are $95 each");
    expect(text).toContain("your website stays up and stays yours");
    expect(text).not.toMatch(/\bAI\b/);
  });
});
