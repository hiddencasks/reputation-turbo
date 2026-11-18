import { describe, expect, it } from "vitest";
import {
  cleanDraft,
  FOLLOWUP_SYSTEM,
  followupBlockReason,
  followupFrom,
  followupText,
  followupUserPrompt,
  friendlyBusinessName,
  friendlyFirstName,
} from "@/lib/followup-text";

describe("friendlyBusinessName", () => {
  it("drops legal suffixes and calms ALL CAPS", () => {
    expect(friendlyBusinessName("SHOP FLOWERS TODAY, LLC")).toBe("Shop Flowers Today");
    expect(friendlyBusinessName("Joe's Plumbing Inc.")).toBe("Joe's Plumbing");
    expect(friendlyBusinessName("Canyon Crew L.L.C.")).toBe("Canyon Crew");
    expect(friendlyBusinessName("Smith Roofing Co.")).toBe("Smith Roofing");
  });
  it("turns a web address into its name", () => {
    expect(friendlyBusinessName("www.shopflowerstoday.com")).toBe("shopflowerstoday");
    expect(friendlyBusinessName("https://elcajonhvac.net/")).toBe("elcajonhvac");
  });
  it("leaves normal names alone", () => {
    expect(friendlyBusinessName("ABC Electric")).toBe("ABC Electric");
    expect(friendlyBusinessName("Reputation Turbo")).toBe("Reputation Turbo");
  });
});

describe("friendlyFirstName", () => {
  it("fixes case and keeps only the first name", () => {
    expect(friendlyFirstName("LORENZO")).toBe("Lorenzo");
    expect(friendlyFirstName("maria elena")).toBe("Maria");
    expect(friendlyFirstName("McKenzie")).toBe("McKenzie");
    expect(friendlyFirstName("")).toBe("");
  });
});

describe("prompt", () => {
  it("carries the copy rules", () => {
    expect(FOLLOWUP_SYSTEM).toContain("ChatGPT, Claude, Gemini, Perplexity and Copilot");
    expect(FOLLOWUP_SYSTEM).toMatch(/Never say or imply that AI builds websites/);
    expect(FOLLOWUP_SYSTEM).toMatch(/Do NOT explain how to fix it/);
    expect(FOLLOWUP_SYSTEM).toMatch(/no phone numbers/);
  });
  it("gives the AI the names and the audit", () => {
    const p = followupUserPrompt({ firstName: "LORENZO", businessName: "SHOP FLOWERS TODAY LLC", trade: "Florist", city: "La Mesa", auditMarkdown: "# Online audit" });
    expect(p).toContain("First name: Lorenzo");
    expect(p).toContain("Friendly business name: Shop Flowers Today");
    expect(p).toContain("# Online audit");
  });
});

describe("cleanDraft", () => {
  it("strips markdown, links and a signature the AI added", () => {
    const d = cleanDraft({
      subject: '"Quick thought on Shop Flowers Today"\n',
      body: "Lorenzo,\n\n\n\nI noticed **Claude** warns people away. See https://x.com/a\n\nBest,\nAlvin\nReputation Turbo",
    });
    expect(d.subject).toBe("Quick thought on Shop Flowers Today");
    expect(d.body).toBe("Lorenzo,\n\nI noticed Claude warns people away. See");
  });
});

describe("email text", () => {
  it("signs with the founder, booking link, address and opt-out", () => {
    const t = followupText("Lorenzo,\n\nGot 15 minutes this week?", "123 Main St, Spring Valley, CA");
    expect(t).toContain("Got 15 minutes this week?\n\nAlvin\nReputation Turbo\nGrab a 15-minute slot: https://cal.com/reputationturbo/15min");
    expect(t).toContain("123 Main St");
    expect(t).toMatch(/Reply "stop"/);
    expect(t).not.toMatch(/\(619\)/);
  });
  it("sends from the founder's name at the usual address", () => {
    expect(followupFrom("Reputation Turbo <info@reputationturbo.com>")).toBe("Alvin at Reputation Turbo <info@reputationturbo.com>");
    expect(followupFrom(undefined)).toBe("Alvin at Reputation Turbo <info@reputationturbo.com>");
  });
});

describe("followupBlockReason", () => {
  const ok = { email: "a@b.com", stage: "audit_delivered", suppressed: false, vendor: false };
  it("allows a normal lead", () => expect(followupBlockReason(ok)).toBeNull());
  it("blocks opt-outs, pitches, missing email and late stages", () => {
    expect(followupBlockReason({ ...ok, suppressed: true })).toMatch(/opted out/);
    expect(followupBlockReason({ ...ok, vendor: true })).toMatch(/sales pitch/);
    expect(followupBlockReason({ ...ok, email: "" })).toMatch(/no email/);
    expect(followupBlockReason({ ...ok, stage: "do_not_contact" })).toMatch(/stage/);
    expect(followupBlockReason({ ...ok, stage: "won" })).toMatch(/stage/);
  });
});
