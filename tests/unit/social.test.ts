import { describe, expect, it } from "vitest";
import { posts as blogPosts } from "@/lib/blog";
import { allSocialPosts, blogShare, captionFor, duePosts, freeAuditUrl, pacificIso, PUBLISH_WINDOW_HOURS } from "@/lib/social";

const assistants = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot"];

describe("social posts", () => {
  const all = allSocialPosts();

  it("has unique ids, oldest first", () => {
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    for (let i = 1; i < all.length; i++) expect(Date.parse(all[i].publishAt)).toBeGreaterThanOrEqual(Date.parse(all[i - 1].publishAt));
  });

  it("shares every blog post on its Tuesday at 9 AM Pacific", () => {
    for (const b of blogPosts) {
      const share = all.find((p) => p.id === `blog-${b.slug}`);
      expect(share).toBeDefined();
      expect(share!.publishAt).toMatch(/T09:00:00-0[78]:00$/);
      expect(Date.parse(share!.publishAt) - Date.parse(b.publishAt)).toBe(3 * 3600_000);
    }
  });

  it("ends every caption with the free audit", () => {
    for (const p of all) {
      expect(captionFor(p, "facebook")).toContain(freeAuditUrl);
      expect(captionFor(p, "instagram")).toContain("reputationturbo.com/free-audit");
      // Instagram allows 2,200 characters and 30 hashtags.
      expect(captionFor(p, "instagram").length).toBeLessThan(2200);
    }
  });

  it("names all five AI assistants whenever it names any", () => {
    for (const p of all) {
      const text = `${p.body} ${JSON.stringify(p.card)}`;
      const named = assistants.filter((a) => text.includes(a));
      if (named.length) expect(named).toEqual(assistants);
    }
  });

  it("never mentions a phone number", () => {
    for (const p of all) expect(captionFor(p, "facebook")).not.toMatch(/\(\d{3}\)\s?\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/);
  });

  it("only publishes posts that are due and not too late", () => {
    const p = all[0];
    const at = Date.parse(p.publishAt);
    expect(duePosts(new Date(at - 1000), [p])).toHaveLength(0);
    expect(duePosts(new Date(at + 1000), [p])).toHaveLength(1);
    expect(duePosts(new Date(at + (PUBLISH_WINDOW_HOURS + 1) * 3600_000), [p])).toHaveLength(0);
  });

  it("writes Pacific times with the right offset", () => {
    expect(pacificIso(new Date("2026-11-03T17:00:00Z"))).toBe("2026-11-03T09:00:00-08:00");
    expect(pacificIso(new Date("2026-07-07T16:00:00Z"))).toBe("2026-07-07T09:00:00-07:00");
  });

  it("falls back to the blog title for posts without custom wording", () => {
    const share = blogShare({ slug: "x", title: "Hello", description: "World", publishAt: "2027-01-05T06:00:00-08:00", readMinutes: 3, topic: "Reviews" });
    expect(share.card.headline).toBe("Hello");
    expect(share.body).toContain("World");
  });
});
