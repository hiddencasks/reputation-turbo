import { describe, expect, it } from "vitest";
import { auditRequestSchema, contactSchema, normalizeWebsite, phoneDigits } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";

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

  it("reports each missing or invalid field", () => {
    const r = auditRequestSchema.safeParse({ ...valid, firstName: "", phone: "123", email: "nope", website: "bad site" });
    expect(r.success).toBe(false);
    const fields = r.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["firstName", "phone", "email", "website"]));
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
