import { describe, expect, it } from "vitest";
import { posts as blogPosts } from "@/lib/blog";
import { existsSync } from "node:fs";
import path from "node:path";
import { GOOGLE_POST_MAX, googleButtonUrl, activeKeyword, allSocialPosts, cardsOf, cardText, formatOf, imagePath, parseImageFile, videoPath, blogShare, captionFor, commentToDm, duePosts, freeAuditUrl, pacificIso, PUBLISH_WINDOW_HOURS } from "@/lib/social";
import { adSourceFromUrl, describeAdSource } from "@/lib/ad-source";

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
    expect(cardText(share.card)).toBe("Hello");
    expect(share.body).toContain("World");
  });
});

describe("comment-to-DM keywords", () => {
  const post = allSocialPosts()[0];

  it("only promises a DM where the automation works", () => {
    for (const net of ["instagram", "facebook"] as const) {
      expect(/Comment [A-Z]+ and we'll DM you/.test(captionFor(post, net))).toBe(commentToDm.live[net]);
    }
  });

  it("leaves keywords out when switched off", () => {
    expect(activeKeyword(post, false)).toBeUndefined();
    expect(captionFor(post, "facebook", false)).not.toMatch(/Comment [A-Z]+/);
  });

  it("adds the keyword line once live", () => {
    const k = activeKeyword(post, true)!;
    expect(Object.keys(commentToDm.keywords)).toContain(k);
    expect(captionFor(post, "instagram", true)).toContain(`Comment ${k} and we'll DM you`);
  });

  it("never ends the keyword line with doubled punctuation", () => {
    for (const p of allSocialPosts()) expect(captionFor(p, "facebook", true)).not.toMatch(/[?!.]\.\n/);
  });

  it("tags every DM link so the lead shows it came from a DM", () => {
    for (const k of Object.values(commentToDm.keywords)) {
      const url = new URL(k.dm.match(/https:\/\/\S+/)![0]);
      const ad = adSourceFromUrl(url.search, url.pathname)!;
      expect(ad.source).toBe("social");
      expect(ad.medium).toBe("dm");
      expect(describeAdSource(ad)).toMatch(/^Instagram or Facebook · dm-/);
    }
  });
});

describe("post formats", () => {
  const all = allSocialPosts();

  it("keeps carousels within Instagram's 2 to 10 slides", () => {
    for (const p of all.filter((x) => formatOf(x) === "carousel")) {
      expect(cardsOf(p).length).toBeGreaterThanOrEqual(2);
      expect(cardsOf(p).length).toBeLessThanOrEqual(10);
    }
  });

  it("has a video file for every Reel", () => {
    for (const p of all.filter((x) => formatOf(x) === "reel")) {
      expect(existsSync(path.join(process.cwd(), "public", videoPath(p))), `run npm run social:reel -- ${p.id}`).toBe(true);
    }
  });

  it("reads image file names back", () => {
    const p = all[0];
    expect(parseImageFile(imagePath(p).split("/").pop()!)).toEqual({ id: p.id, slide: 1, tall: false });
    expect(parseImageFile(imagePath(p, 3, true).split("/").pop()!)).toEqual({ id: p.id, slide: 3, tall: true });
    expect(parseImageFile("../x.jpg")).toBeNull();
  });

  it("uses more than one look each month", () => {
    const formats = new Set(all.map(formatOf));
    expect(formats.size).toBeGreaterThan(1);
  });
});

describe("Google profile posts", () => {
  const all = allSocialPosts();

  it("fit Google's length limit and leave out hashtags, keywords and links", () => {
    for (const p of all) {
      const text = captionFor(p, "google");
      expect(text.length).toBeLessThanOrEqual(GOOGLE_POST_MAX);
      expect(text).not.toMatch(/#\w/);
      expect(text).not.toMatch(/Comment [A-Z]+ and/);
      expect(text).not.toMatch(/https?:\/\//);
      expect(text).toContain("Learn more button");
    }
  });

  it("only shows the cover, so captions don't ask people to swipe", () => {
    for (const p of all) expect(captionFor(p, "google")).not.toMatch(/swipe/i);
  });

  it("tags the Learn more link so the lead shows it came from a Google post", () => {
    for (const p of all) {
      const url = new URL(googleButtonUrl(p));
      expect(url.hostname).toBe("reputationturbo.com");
      const ad = adSourceFromUrl(url.search, url.pathname)!;
      expect(describeAdSource(ad)).toBe(`Google · ${p.id}`);
    }
  });

  it("sends blog shares to the blog post and the rest to the free audit", () => {
    const blog = all.find((p) => p.kind === "blog")!;
    const tip = all.find((p) => p.kind !== "blog")!;
    expect(new URL(googleButtonUrl(blog)).pathname).toMatch(/^\/blog\//);
    expect(new URL(googleButtonUrl(tip)).pathname).toBe("/free-audit");
  });
});
