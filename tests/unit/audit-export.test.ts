import { describe, expect, it } from "vitest";
import { auditMarkdown, fileSlug } from "@/lib/audit/export";

const lead = { first_name: "Sam", last_name: "", business_name: "Sam's Concrete", email: "sam@example.com", phone: "", website_url: "https://example.com", trade: "Concrete contractors", city: "El Cajon", stage: "audit_delivered", recommended_package: "" };
const check = {
  business_name: "Sam's Concrete",
  website_url: "https://example.com",
  trade: "Concrete contractors",
  city: "El Cajon",
  questions: ["Who is the best concrete contractor in El Cajon, CA?"],
  providers: ["openai", "anthropic"],
  mentioned_count: 1,
  answer_count: 2,
  competitors: [{ name: "Rival Concrete", count: 2 }],
  site_audit: {
    sections: [{ id: "website" as const, title: "Website", items: [
      { id: "https", label: "Secure (https)", status: "good" as const, detail: "Loads securely." },
      { id: "call", label: "Tap to call", status: "fix" as const, detail: "No tap | to call." },
    ] }],
    competitors: [{ name: "Rival Concrete", rating: 4.8, reviews: 140 }],
  },
  created_at: new Date("2026-11-01T06:00:00Z"),
  finished_at: new Date("2026-11-01T06:02:00Z"),
  approved_at: null,
  sent_at: null,
};
const answers = [
  { provider: "openai", question: check.questions[0], answer: "Try Sam's Concrete.", mentioned: true, businesses: ["Sam's Concrete"], sources: ["https://a.example"], error: null },
  { provider: "anthropic", question: check.questions[0], answer: "", mentioned: false, businesses: [], sources: [], error: "429" },
];

describe("audit download", () => {
  const md = auditMarkdown(lead, check, answers, (p) => ({ openai: "ChatGPT", anthropic: "Claude" })[p] ?? p);
  it("includes the score, findings, competitors and AI grid", () => {
    expect(md).toContain("Online checks: 1 of 2 look good");
    expect(md).toContain("| Tap to call | To fix | No tap \\| to call. |");
    expect(md).toContain("| 1 | Rival Concrete | 4.8 | 140 |");
    expect(md).toContain("| Question | ChatGPT | Claude |");
    expect(md).toContain("| Found | Error |");
    expect(md).toContain("Try Sam's Concrete.");
  });
  it("makes a safe file name", () => {
    expect(fileSlug("Joe's Plumbing & Co.")).toBe("joes-plumbing-co");
    expect(fileSlug("!!!")).toBe("business");
  });
});
