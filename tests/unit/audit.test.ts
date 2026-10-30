import { describe, expect, it } from "vitest";
import { analyzeContact, analyzeGoogle, analyzeSocial, analyzeWebsite, auditScore, auditSnapshot, schemaTypes } from "@/lib/audit/checks";

const ctx = { businessName: "Lopez Concrete", website: "https://lopezconcrete.com", email: "maria@gmail.com", city: "El Cajon", trade: "Concrete contractors" };
const status = (items: { id: string; status: string }[]) => Object.fromEntries(items.map((i) => [i.id, i.status]));

describe("website audit", () => {
  it("flags what a bare page is missing", () => {
    const s = status(analyzeWebsite("<html><title>Home</title><body>Hello</body></html>", "http://lopezconcrete.com", ctx, 4000));
    expect(s).toMatchObject({ https: "fix", mobile: "fix", speed: "fix", title: "fix", description: "fix", call: "fix", contact: "fix", schema: "fix", area: "fix", faq: "fix" });
  });

  it("credits a well-built page", () => {
    const html = `<html><head><title>Concrete Contractor in El Cajon | Lopez Concrete</title>
      <meta name="viewport" content="width=device-width"><meta name="description" content="Driveways and patios.">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":["LocalBusiness","FAQPage"]}</script></head>
      <body>Serving El Cajon. <a href="tel:6195550100">Call</a><form></form><h2>FAQ</h2></body></html>`;
    const items = analyzeWebsite(html, "https://lopezconcrete.com/", ctx, 800);
    expect(items.every((i) => i.status === "good")).toBe(true);
  });

  it("shows the page title with HTML entities decoded", () => {
    const items = analyzeWebsite("<html><title>Lopez Concrete | Driveways &amp; Patios</title></html>", "https://lopezconcrete.com", ctx);
    expect(items.find((i) => i.id === "title")?.detail).toContain('"Lopez Concrete | Driveways & Patios"');
  });

  it("reads JSON-LD types", () => {
    expect(schemaTypes(`<script type="application/ld+json">{"@type":"Plumber","address":{"@type":"PostalAddress"}}</script>`)).toEqual(["Plumber", "PostalAddress"]);
  });
});

describe("other audit sections", () => {
  it("finds linked social profiles", () => {
    expect(status(analyzeSocial(`<a href="https://www.instagram.com/lopez">IG</a>`))).toEqual({ instagram: "good" });
    expect(status(analyzeSocial(`<a href="https://www.facebook.com/sharer.php?u=x">Share</a>`))).toEqual({ "social-links": "fix" });
    expect(status(analyzeSocial(null))).toEqual({ social: "info" });
  });

  it("flags a personal email address", () => {
    expect(status(analyzeContact(ctx))).toEqual({ email: "fix" });
    expect(status(analyzeContact({ ...ctx, email: "maria@lopezconcrete.com" }))).toEqual({ email: "good" });
  });

  it("scores the Google profile", () => {
    expect(status(analyzeGoogle(undefined, ctx).items)).toEqual({ gbp: "info" });
    expect(status(analyzeGoogle(null, ctx).items)).toEqual({ gbp: "fix" });
    const g = analyzeGoogle({ name: "Lopez Concrete", rating: 4.9, reviews: 8, hasHours: true, hasPhone: true, hasWebsite: false, photos: 3 }, ctx);
    expect(status(g.items)).toEqual({ gbp: "good", reviews: "fix", hours: "good", "gbp-phone": "good", "gbp-website": "fix", photos: "fix" });
    expect(auditScore({ sections: [g] })).toEqual({ good: 3, total: 6 });
  });
});

describe("instant audit summary", () => {
  const unreachable = { id: "website" as const, title: "Website", items: [{ id: "website", label: "Website", status: "fix" as const, detail: "We couldn't load it." }] };
  const contact = { id: "contact" as const, title: "Contact details", items: analyzeContact(ctx) };

  it("shows a website we couldn't load as reviewed by hand, and leaves out details", () => {
    const snap = auditSnapshot({ sections: [unreachable, contact] }, ctx);
    expect(snap.sections[0].items).toEqual([{ id: "website", label: "Website", status: "info" }]);
    expect(snap).toMatchObject({ good: 0, total: 1 });
    expect(snap.sections.flatMap((s) => s.items).some((i) => "detail" in i)).toBe(false);
  });

  it("keeps a missing website as something to fix", () => {
    const snap = auditSnapshot({ sections: [unreachable] }, { website: "" });
    expect(snap.sections[0].items[0].status).toBe("fix");
  });
});
