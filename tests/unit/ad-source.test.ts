import { describe, expect, it } from "vitest";
import { adSourceFromUrl, describeAdSource, parseAdSource } from "@/lib/ad-source";

const now = new Date("2026-11-01T12:00:00Z");

describe("ad source", () => {
  it("reads utm tags from a Meta ad link", () => {
    const ad = adSourceFromUrl("?utm_source=meta&utm_campaign=geo-v1&utm_content=concept1&fbclid=abc", "/free-audit", now);
    expect(ad).toEqual({ source: "meta", campaign: "geo-v1", content: "concept1", fbclid: true, landing: "/free-audit", at: now.toISOString() });
    expect(describeAdSource(ad!)).toBe("Meta ad · geo-v1 · concept1");
  });

  it("credits Facebook when only fbclid is present", () => {
    expect(describeAdSource(adSourceFromUrl("?fbclid=xyz", "/", now)!)).toBe("Facebook");
  });

  it("ignores untagged visits", () => {
    expect(adSourceFromUrl("?q=1", "/", now)).toBeNull();
    expect(adSourceFromUrl("", "/", now)).toBeNull();
  });

  it("round-trips through the cookie and strips junk", () => {
    const ad = adSourceFromUrl("?utm_source=meta&utm_campaign=<script>geo", "/", now)!;
    expect(ad.campaign).toBe("scriptgeo");
    expect(parseAdSource(encodeURIComponent(JSON.stringify(ad)))).toEqual(ad);
  });

  it("rejects broken or empty cookies", () => {
    expect(parseAdSource(undefined)).toBeNull();
    expect(parseAdSource("not-json")).toBeNull();
    expect(parseAdSource(encodeURIComponent(JSON.stringify({ landing: "/" })))).toBeNull();
    expect(parseAdSource(encodeURIComponent(JSON.stringify({ source: 5, campaign: "x", extra: "y" })))).toEqual({ campaign: "x" });
  });
});
