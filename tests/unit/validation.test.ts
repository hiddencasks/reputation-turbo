import { describe, expect, it } from "vitest";
import { auditRequestSchema, contactSchema, formatPhone, normalizeWebsite, phoneDigits } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";
import { joinPackages, recommendPackages, splitPackages } from "@/lib/recommend";

describe("phoneDigits", () => {
  it("strips formatting and a leading US country code", () => {
    expect(phoneDigits("(619) 609-4409")).toBe("6196094409");
    expect(phoneDigits("+1 619.609.4409")).toBe("6196094409");
  });
});

describe("normalizeWebsite", () => {
  it("adds https and drops a trailing slash", () => {
    expect(normalizeWebsite("example.com/")).toBe("https://example.com");
    expect(normalizeWebsite("http://Example.com/about")).toBe("http://example.com/about");
  });
  it("allows blank and rejects nonsense", () => {
    expect(normalizeWebsite("  ")).toBe("");
    expect(normalizeWebsite("not a site")).toBeNull();
  });
});

describe("auditRequestSchema", () => {
  const valid = {
    firstName: "Maria",
    lastName: "Lopez",
    businessName: "Lopez Concrete",
    trade: "Concrete contractors",
    city: "El Cajon",
    phone: "619-555-0100",
    email: "Maria@Example.com ",
    website: "lopezconcrete.com",
  };

  it("accepts a complete request and normalizes it", () => {
    const r = auditRequestSchema.parse(valid);
    expect(r.email).toBe("maria@example.com");
    expect(r.website).toBe("https://lopezconcrete.com");
  });

  it("makes the website optional", () => {
    expect(auditRequestSchema.parse({ ...valid, website: "" }).website).toBe("");
  });

  it("makes last name and phone optional", () => {
    const r = auditRequestSchema.parse({ ...valid, lastName: "", phone: "" });
    expect(r.lastName).toBe("");
    expect(r.phone).toBe("");
  });

  it("reports each missing or invalid field", () => {
    const r = auditRequestSchema.safeParse({ ...valid, firstName: "", trade: " ", city: "", phone: "123", email: "nope", website: "bad site" });
    expect(r.success).toBe(false);
    const fields = r.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["firstName", "trade", "city", "phone", "email", "website"]));
  });
});

describe("contactSchema", () => {
  it("needs a name, email and message; phone is optional", () => {
    expect(contactSchema.safeParse({ firstName: "Al", email: "a@b.co", message: "Hi" }).success).toBe(true);
    expect(contactSchema.safeParse({ firstName: "Al", email: "a@b.co", message: "" }).success).toBe(false);
  });
});

describe("password hashing", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("phone and business name", () => {
  it("formats phone numbers while typing", () => {
    expect(formatPhone("619")).toBe("(619");
    expect(formatPhone("6195")).toBe("(619) 5");
    expect(formatPhone("6195550123")).toBe("(619) 555-0123");
    expect(formatPhone("(619) 555-0123")).toBe("(619) 555-0123");
    expect(formatPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });

  it("stores None as no business name", () => {
    const base = { firstName: "Sam", trade: "Concrete contractors", city: "El Cajon", email: "sam@example.com" };
    expect(auditRequestSchema.parse({ ...base, businessName: "None" }).businessName).toBe("");
    expect(auditRequestSchema.parse({ ...base, businessName: "n/a" }).businessName).toBe("");
    expect(auditRequestSchema.parse({ ...base, businessName: "Sam's Concrete" }).businessName).toBe("Sam's Concrete");
    expect(auditRequestSchema.safeParse({ ...base, businessName: "" }).success).toBe(false);
  });
});

describe("package suggestions", () => {
  const slugs = (r: ReturnType<typeof recommendPackages>) => r.suggestions.map((s) => s.slug);
  it("suggests a website when there is none", () => {
    expect(slugs(recommendPackages({ website: "", aiCheck: null }))).toEqual(["business-website-launch", "care-plan"]);
    expect(slugs(recommendPackages({ website: "", aiCheck: { mentioned: 0, answers: 12 } }))[0]).toBe("premium-digital-presence");
  });
  it("suggests Starter, plus GEO when AI assistants rarely name them", () => {
    expect(slugs(recommendPackages({ website: "https://a.com", aiCheck: { mentioned: 9, answers: 12 } }))).toEqual(["starter-online-presence"]);
    expect(slugs(recommendPackages({ website: "https://a.com", aiCheck: { mentioned: 2, answers: 12 } }))).toEqual([
      "starter-online-presence", "ai-search-setup", "ai-visibility-plan",
    ]);
  });
  it("uses audit findings", () => {
    const many = new Set(["mobile", "speed", "call", "title", "reviews"]);
    expect(slugs(recommendPackages({ website: "https://a.com", aiCheck: null, fixes: many }))).toEqual(["business-website-launch", "review-automation"]);
    expect(slugs(recommendPackages({ website: "https://a.com", aiCheck: null, fixes: new Set(["title", "faq", "schema"]) }))).toEqual(["starter-online-presence"]);
  });
  it("round-trips the stored list", () => {
    expect(splitPackages(joinPackages(["GEO Setup", "Care"]))).toEqual(["GEO Setup", "Care"]);
    expect(splitPackages("")).toEqual([]);
  });
});
