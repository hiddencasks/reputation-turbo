import { describe, expect, it } from "vitest";
import { sourceLabel, summarizeLead, type SummaryActivity } from "@/lib/lead-summary";

const act = (kind: string, body: string, meta: Record<string, unknown> | null = null, minutes = 0): SummaryActivity => ({
  lead_id: "x",
  kind,
  body,
  meta,
  created_at: new Date(Date.UTC(2026, 10, 18, 12, minutes)),
});

describe("lead summary", () => {
  it("names the source, telling the finder apart from hand-added outreach", () => {
    expect(sourceLabel("geo_quiz")).toBe("GEO quiz");
    expect(sourceLabel("outreach", "Found with the prospect finder (Roofer in Santee).")).toBe("Prospect finder");
    expect(sourceLabel("outreach", "Added as an outreach prospect (Roofer in Santee).")).toBe("Added by you (outreach)");
    expect(sourceLabel("website")).toBe("website");
  });

  it("shows the quiz score, gaps, ad and a later audit request", () => {
    const s = summarizeLead({ source: "geo_quiz" }, [
      act("audit_form", "Requested a free online audit from the GEO quiz for https://x.com.", null, 5),
      act("geo_quiz", "Scored 5 of 7 on the GEO quiz.", {
        quiz: { named: "no", competitors: "yes", reviews: "yes", listings: "unsure", service_pages: "yes", structured_data: "yes", consistent_ai: "yes" },
        ad: { source: "meta", campaign: "geo-v1" },
      }),
    ]);
    expect(s.source).toBe("GEO quiz");
    expect(s.ad).toBe("Meta ad · geo-v1");
    expect(s.details).toEqual(["Quiz score 5 of 7", "Missing: named by ChatGPT, listings match", "Asked for a free audit"]);
    expect(s.message).toBeNull();
  });

  it("pulls what an audit request wants help with", () => {
    const s = summarizeLead({ source: "audit_form" }, [
      act("audit_form", "Requested a free online audit for https://x.com. Interested in: Website Launch. Wants help with: Reviews, Google profile."),
    ]);
    expect(s.details).toEqual(["Asked for a free audit", "Wants help with: Reviews, Google profile", "Interested in: Website Launch"]);
  });

  it("keeps the latest contact message", () => {
    const s = summarizeLead({ source: "contact_form" }, [act("contact_form", "First", null, 0), act("contact_form", "  Can you call me Tuesday?  ", null, 9)]);
    expect(s.source).toBe("Contact form");
    expect(s.message).toBe("Can you call me Tuesday?");
  });
});

describe("sales pitch detection", () => {
  it("flags typical vendor pitches", () => {
    for (const m of [
      "Hi, I came across your website and noticed it isn't on the first page of Google. Our team can fix that.",
      "We offer affordable SEO and web design packages. Let me know if you're interested.",
      "Would you be interested in a guest post on our blog?",
      "I'm reaching out because we provide lead generation for agencies.",
    ]) {
      expect(summarizeLead({ source: "contact_form" }, [act("contact_form", m)]).vendor, m).toBe(true);
    }
  });

  it("leaves real customer messages alone", () => {
    for (const m of [
      "Hi, I run a roofing company in Santee and nobody finds us on Google. Can you help?",
      "How much is the website package? I need a new site for my plumbing business.",
      "Saw your ad. Does ChatGPT really recommend businesses? I'd like the audit.",
    ]) {
      expect(summarizeLead({ source: "contact_form" }, [act("contact_form", m)]).vendor, m).toBe(false);
    }
  });

  it("lets the owner's latest mark win over the guess", () => {
    const pitch = act("contact_form", "We offer SEO services at affordable rates.");
    expect(summarizeLead({ source: "contact_form" }, [pitch, act("vendor_flag", "", { vendor: false }, 3)]).vendor).toBe(false);
    const real = act("contact_form", "Need a website for my shop.");
    const s = summarizeLead({ source: "contact_form" }, [real, act("vendor_flag", "", { vendor: false }, 1), act("vendor_flag", "", { vendor: true }, 2)]);
    expect(s.vendor).toBe(true);
    expect(s.vendorReason).toBe("marked");
  });
});
