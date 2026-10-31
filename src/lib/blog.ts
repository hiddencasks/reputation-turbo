// Blog posts. Each post goes live on its own at `publishAt`: the blog pages re-check
// every hour (see `revalidate` in app/(site)/blog), so a scheduled post appears
// within an hour of its time without a new deploy.
//
// To add a post: add its details here, write its body in src/content/blog/<slug>.tsx,
// and register the body in src/content/blog/index.ts.
//
// Preview deployments and local dev show scheduled posts too (marked "Scheduled"),
// so drafts can be reviewed before they go live. Production only shows live posts.

export type BlogPost = {
  slug: string;
  title: string;
  /** One or two sentences for the post list, search results and link previews. */
  description: string;
  /** When the post goes live, as an ISO time with the Pacific offset (6 AM Pacific). */
  publishAt: string;
  readMinutes: number;
  topic: "AI search" | "Google profile" | "Reviews" | "Local SEO";
};

export const author = { name: "Alvin Shamoun", role: "Founder, Reputation Turbo", href: "/about" };

// Oldest first. Tuesdays at 6 AM Pacific.
export const posts: BlogPost[] = [
  {
    slug: "is-ai-sending-customers-to-competitors",
    title: "Is AI Sending Your Customers to a Competitor?",
    description:
      "More customers ask ChatGPT, Claude, Gemini, Perplexity and Copilot who to hire, and get back just a few names. Why some local businesses get named and others get skipped.",
    publishAt: "2026-11-03T06:00:00-08:00",
    readMinutes: 4,
    topic: "AI search",
  },
  {
    slug: "google-profile-costing-you-calls",
    title: "Why Your Google Profile Might Be Costing You Calls",
    description:
      "The three businesses under the map get most of the calls. Five signs your Google Business Profile is sending customers to the competition, and why it happens.",
    publishAt: "2026-11-10T06:00:00-08:00",
    readMinutes: 4,
    topic: "Google profile",
  },
  {
    slug: "what-your-reviews-say",
    title: "What Your Google Reviews Say Before You Do",
    description:
      "Customers and AI assistants size up your reviews in seconds, and they compare them with your competitors'. What they notice, and the shortcuts that backfire.",
    publishAt: "2026-11-17T06:00:00-08:00",
    readMinutes: 4,
    topic: "Reviews",
  },
  {
    slug: "signs-your-business-is-invisible-online",
    title: "7 Signs Your Business Is Invisible Online (Even If Your Work Is Great)",
    description:
      "Is the slow season just the season, or can new customers not find you? Seven signs San Diego County contractors and home service businesses should watch for.",
    publishAt: "2026-11-24T06:00:00-08:00",
    readMinutes: 4,
    topic: "Local SEO",
  },
];

export function isLive(post: BlogPost, now: Date = new Date()): boolean {
  return new Date(post.publishAt).getTime() <= now.getTime();
}

/** True on Vercel preview deployments and in local dev, where scheduled posts are shown for review. */
export function showScheduledPosts(): boolean {
  return process.env.VERCEL_ENV ? process.env.VERCEL_ENV !== "production" : process.env.NODE_ENV !== "production";
}

/** Posts to list, newest first. */
export function visiblePosts(now: Date = new Date(), includeScheduled = showScheduledPosts()): BlogPost[] {
  return posts.filter((p) => includeScheduled || isLive(p, now)).sort((a, b) => b.publishAt.localeCompare(a.publishAt));
}

export function getVisiblePost(slug: string, now: Date = new Date(), includeScheduled = showScheduledPosts()): BlogPost | undefined {
  return visiblePosts(now, includeScheduled).find((p) => p.slug === slug);
}

/** "November 3, 2026", in San Diego time. */
export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "long", day: "numeric", year: "numeric" });
}
