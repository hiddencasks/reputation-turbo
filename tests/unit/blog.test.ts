import { describe, expect, it } from "vitest";
import { getVisiblePost, isLive, posts, visiblePosts, formatPostDate } from "@/lib/blog";

describe("blog schedule", () => {
  const first = posts[0];

  it("hides a post until its publish time", () => {
    const before = new Date(new Date(first.publishAt).getTime() - 1000);
    const after = new Date(new Date(first.publishAt).getTime() + 1000);
    expect(isLive(first, before)).toBe(false);
    expect(isLive(first, after)).toBe(true);
    expect(getVisiblePost(first.slug, before, false)).toBeUndefined();
    expect(getVisiblePost(first.slug, after, false)?.slug).toBe(first.slug);
  });

  it("shows scheduled posts on previews", () => {
    expect(visiblePosts(new Date("2020-01-01"), true)).toHaveLength(posts.length);
    expect(visiblePosts(new Date("2020-01-01"), false)).toHaveLength(0);
  });

  it("lists newest first", () => {
    const list = visiblePosts(new Date("2030-01-01"), false);
    expect(list[0].publishAt >= list[list.length - 1].publishAt).toBe(true);
  });

  it("has at least one post a week, with unique slugs", () => {
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
    for (let i = 1; i < posts.length; i++) {
      const gap = new Date(posts[i].publishAt).getTime() - new Date(posts[i - 1].publishAt).getTime();
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);
    }
  });

  it("dates posts in San Diego time", () => {
    expect(formatPostDate("2026-11-03T06:00:00-08:00")).toBe("November 3, 2026");
  });

  it("names all five AI assistants together whenever one is named", () => {
    for (const p of posts) {
      if (/ChatGPT|Claude|Gemini|Perplexity|Copilot/.test(p.description)) {
        for (const name of ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot"]) expect(p.description).toContain(name);
      }
    }
  });
});
