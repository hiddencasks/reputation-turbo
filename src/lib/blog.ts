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
    slug: "does-ai-recommend-your-business",
    title: "Does ChatGPT Recommend Your Business? How to Check in 10 Minutes",
    description:
      "More customers ask ChatGPT, Claude, Gemini, Perplexity and Copilot who to hire. Here's a simple test any San Diego County business owner can run today, and what to do with the results.",
    publishAt: "2026-11-03T06:00:00-08:00",
    readMinutes: 6,
    topic: "AI search",
  },
  {
    slug: "google-business-profile-fixes",
    title: "9 Google Business Profile Fixes Most Local Contractors Miss",
    description:
      "Your Google profile is often the first thing a customer sees, and AI assistants read it too. Nine quick fixes that help you show up in Maps and look like the obvious choice.",
    publishAt: "2026-11-10T06:00:00-08:00",
    readMinutes: 7,
    topic: "Google profile",
  },
  {
    slug: "how-to-get-more-google-reviews",
    title: "How to Get More Google Reviews Without Feeling Pushy",
    description:
      "A simple, rule-friendly way to ask every happy customer for a review, what to say, and why reviews that mention the job and the city matter more than ever.",
    publishAt: "2026-11-17T06:00:00-08:00",
    readMinutes: 6,
    topic: "Reviews",
  },
  {
    slug: "slow-season-online-checklist",
    title: "Slow Season To-Do List: 7 Online Fixes to Finish Before January",
    description:
      "When work slows down around the holidays, an afternoon on these seven fixes can mean more calls in the spring. A checklist for San Diego County contractors and home service businesses.",
    publishAt: "2026-11-24T06:00:00-08:00",
    readMinutes: 6,
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
