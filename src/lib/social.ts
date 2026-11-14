// Facebook and Instagram posts. The same post goes to both accounts, twice a week:
//
// - Tuesday 9 AM Pacific: that week's blog post. These are made automatically from
//   src/lib/blog.ts, so a new blog post is shared without any extra work. To change
//   one, add an entry to `blogShareOverrides` below.
// - Friday 9 AM Pacific: a quick tip, a before-and-after, or an AI check. Write these
//   in `fridayPosts` below.
//
// Every post ends with the free audit link. Images are drawn by the site itself
// (src/app/social-image) from the card text, so a post only needs words.
//
// Mix the formats so the feed doesn't look the same every week: single images in
// different card styles (statement, stat, quote, photo; navy, light or orange),
// carousels (add `slides`), and short Reels (`format: "reel"`, then run
// `npm run social:reel -- <id>` with the site running to make the video).
//
// The hourly cron (src/app/api/cron/social) publishes each post once it is due,
// once Facebook and Instagram are connected in Vercel (see /admin/social).
//
// Copy rules: name ChatGPT, Claude, Gemini, Perplexity and Copilot together when
// listing AI assistants; posts reveal the problem, never the step-by-step fix; no
// client names without permission; no phone number.

import { posts as blogPosts, type BlogPost } from "./blog";
import { site } from "./site";

/** Card colors. Mix them so the feed doesn't look the same every week. */
export type CardTheme = "navy" | "light" | "orange";

/** Brand photos in public/images that a "photo" card can sit on. */
export const cardPhotos = [
  "hero-contractor", "trade-concrete", "trade-electrical", "trade-hvac", "trade-landscaping", "trade-plumbing", "trade-roofing", "services-desk", "ai-search-landscaper",
] as const;
export type CardPhoto = (typeof cardPhotos)[number];

export type SocialCard = (
  | {
      layout: "statement";
      /** Small orange label above the headline, like "Quick tip". */
      kicker: string;
      headline: string;
      subline?: string;
    }
  | {
      layout: "compare";
      kicker: string;
      headline: string;
      left: { title: string; points: string[] };
      right: { title: string; points: string[] };
    }
  | {
      /** One big number or short word, like "3" or "5 sec". */
      layout: "stat";
      kicker: string;
      stat: string;
      headline: string;
      subline?: string;
    }
  | {
      layout: "quote";
      kicker: string;
      quote: string;
      /** Who said it. Never a real client without permission; "What customers ask AI" style is fine. */
      by?: string;
    }
  | {
      /** A numbered point, for carousel slides. */
      layout: "point";
      kicker: string;
      number?: number;
      headline: string;
      subline?: string;
    }
  | {
      /** Headline over one of the brand photos. */
      layout: "photo";
      kicker: string;
      headline: string;
      subline?: string;
      photo: CardPhoto;
    }
) & { theme?: CardTheme };

/**
 * What a post shows. One image is the default. A carousel is 2 to 10 cards people swipe
 * through. A Reel is a short vertical video made from the cards by `npm run social:reel`
 * (saved in public/social/video/<post id>.mp4), or any MP4 dropped there, like a Higgsfield clip.
 */
export type SocialFormat = "image" | "carousel" | "reel";

export type SocialPost = {
  /** Unique and never reused: it is how the site remembers a post was published. */
  id: string;
  /** ISO time with the Pacific offset. */
  publishAt: string;
  kind: "blog" | "tip" | "before-after" | "ai-check";
  /** The caption's main text. The link lines and hashtags are added for each network. */
  body: string;
  /** Where the post points readers to first. Defaults to the free audit. */
  link?: { label: string; url: string };
  /** The image, the carousel's first slide, or the Reel's cover. */
  card: SocialCard;
  /** More slides after `card`, which makes the post a carousel (up to 9 more), or the Reel's scenes. */
  slides?: SocialCard[];
  /** "reel" posts a short vertical video instead of images. Defaults to carousel when there are slides, else image. */
  format?: SocialFormat;
  /** Optional description of the image for screen readers (Instagram alt text). */
  alt?: string;
  /** The comment-to-DM keyword for this post (see `commentToDm`). Defaults to AUDIT. */
  keyword?: Keyword;
};

export const freeAuditUrl = "https://reputationturbo.com/free-audit";

/**
 * Comment-to-DM: a viewer comments a keyword and an automation (set up in Meta
 * Business Suite or ManyChat, outside this site) DMs them a link. Keep the set
 * small and permanent so each automation is set up once and works on every post.
 *
 * `live` stays false until the automations are set up and tested, so no post
 * promises a DM that never arrives. While false, captions and images don't
 * mention keywords at all.
 */
export const commentToDm = {
  live: false,
  keywords: {
    AUDIT: {
      offer: "the link to your free online audit",
      /** What the automation's DM should say. The links carry utm tags (see lib/ad-source.ts) so the dashboard shows the lead came from an Instagram or Facebook DM. */
      dm: {
        instagram: "Here's your free online audit: https://reputationturbo.com/free-audit?utm_source=instagram&utm_medium=dm&utm_campaign=dm-audit\n\nTell us about your business and we'll show you how customers (and AI) see you online.",
        facebook: "Here's your free online audit: https://reputationturbo.com/free-audit?utm_source=facebook&utm_medium=dm&utm_campaign=dm-audit\n\nTell us about your business and we'll show you how customers (and AI) see you online.",
      },
    },
    QUIZ: {
      offer: "our 1-minute quiz: is AI recommending you, or your competitor?",
      dm: {
        instagram: "Here's the 1-minute quiz: https://reputationturbo.com/geo-quiz?utm_source=instagram&utm_medium=dm&utm_campaign=dm-quiz\n\n7 quick questions to see whether ChatGPT, Claude, Gemini, Perplexity and Copilot recommend you.",
        facebook: "Here's the 1-minute quiz: https://reputationturbo.com/geo-quiz?utm_source=facebook&utm_medium=dm&utm_campaign=dm-quiz\n\n7 quick questions to see whether ChatGPT, Claude, Gemini, Perplexity and Copilot recommend you.",
      },
    },
  },
} as const;

export type Keyword = keyof typeof commentToDm.keywords;

/** The keyword a post shows, or undefined while comment-to-DM isn't live. */
export function activeKeyword(post: SocialPost, live: boolean = commentToDm.live): Keyword | undefined {
  return live ? (post.keyword ?? "AUDIT") : undefined;
}
const siteHost = "reputationturbo.com";

/** Shared on Tuesdays, three hours after the blog post goes live at 6 AM. */
const BLOG_SHARE_DELAY_HOURS = 3;

/** Optional custom wording for a blog share, by blog slug. */
const blogShareOverrides: Record<string, Partial<Pick<SocialPost, "body" | "card" | "slides" | "format" | "alt">>> = {
  "is-ai-sending-customers-to-competitors": {
    body:
      "Ask ChatGPT, Claude, Gemini, Perplexity or Copilot to recommend a contractor in your city and you get back two or three names. Not a page of results. Just a few names.\n\nIf yours isn't one of them, that customer may never know you exist. This week on the blog: why some local businesses get named and others get skipped.",
    card: { layout: "statement", kicker: "New on the blog", headline: "Is AI sending your customers to a competitor?", subline: "Why some local businesses get named and others get skipped." },
  },
  "google-profile-costing-you-calls": {
    body:
      "The three businesses under the map get most of the calls. Everyone else is fighting over what's left.\n\nThis week on the blog: five signs your Google Business Profile is quietly sending customers to the competition, and why it happens.",
    card: { layout: "statement", kicker: "New on the blog", headline: "Is your Google profile costing you calls?", subline: "Five signs it's sending customers to the competition." },
  },
  "what-your-reviews-say": {
    body:
      "Before a customer ever calls you, they've already read your reviews and compared them with your competitors'. So have the AI assistants they ask for a recommendation.\n\nThis week on the blog: what people notice in your Google reviews in a few seconds, and the shortcuts that backfire.",
    card: { layout: "statement", kicker: "New on the blog", headline: "Your reviews talk before you do", subline: "What customers and AI notice in a few seconds." },
    slides: [
      { layout: "stat", theme: "light", kicker: "Before they call", stat: "5 sec", headline: "That's how long it takes to size up your reviews." },
      { layout: "point", theme: "light", kicker: "They notice", number: 1, headline: "How many you have", subline: "Compared with the business right next to you on the map." },
      { layout: "point", theme: "light", kicker: "They notice", number: 2, headline: "How recent they are", subline: "A great review from three years ago reads like a closed shop." },
      { layout: "point", theme: "light", kicker: "They notice", number: 3, headline: "Whether you reply", subline: "Silence says something too." },
      { layout: "statement", theme: "orange", kicker: "Read the full post", headline: "How do your reviews stack up?", subline: "Link in the caption. Or get a free audit and we'll show you." },
    ],
  },
  "signs-your-business-is-invisible-online": {
    body:
      "Is the slow season really just the season? Or can new customers not find you?\n\nThis week on the blog: seven signs San Diego County contractors and home service businesses should watch for, even when the work itself is great.",
    card: { layout: "photo", photo: "trade-concrete", kicker: "New on the blog", headline: "7 signs your business is invisible online", subline: "Even if your work is great." },
    slides: [
      { layout: "point", kicker: "Sign", number: 1, headline: "Almost all your work comes from referrals" },
      { layout: "point", kicker: "Sign", number: 2, headline: "A competitor with less experience shows up first" },
      { layout: "point", kicker: "Sign", number: 3, headline: "AI assistants name other businesses, not you", subline: "ChatGPT, Claude, Gemini, Perplexity and Copilot." },
      { layout: "point", kicker: "Sign", number: 4, headline: "Your reviews have gone quiet" },
      { layout: "statement", theme: "orange", kicker: "3 more signs on the blog", headline: "How many sound familiar?", subline: "Read the full list, or get a free audit and know for sure." },
    ],
  },
};

// Oldest first. Fridays at 9 AM Pacific.
export const fridayPosts: SocialPost[] = [
  {
    id: "2026-11-06-ai-test",
    publishAt: "2026-11-06T09:00:00-08:00",
    kind: "ai-check",
    keyword: "QUIZ",
    body:
      "Try this 30-second test today.\n\nOpen ChatGPT, Claude, Gemini, Perplexity or Copilot and ask: \"Who is the best [your trade] in [your city]?\"\n\nDid it name your business? Did it name the shop down the street instead?\n\nMore customers are asking AI who to hire, and it only hands back a few names. Most business owners have never checked what it says about them.",
    card: { layout: "statement", kicker: "Try this today", headline: "Ask AI: who's the best contractor in your city?", subline: "Did it name you?" },
    alt: "Navy card that reads: Try this today. Ask AI: who's the best contractor in your city? Did it name you?",
  },
  {
    id: "2026-11-13-holiday-hours",
    publishAt: "2026-11-13T09:00:00-08:00",
    kind: "tip",
    body:
      "Quick question: when did you last look at your own Google Business Profile the way a customer sees it?\n\nWith the holidays coming, people search, see your hours, photos and reviews, and decide in seconds whether to call. If something there is out of date, they don't ask. They call the next name on the list.",
    card: { layout: "statement", kicker: "Quick tip", headline: "When did you last look at your own Google profile?", subline: "Customers see it before they ever see you." },
    alt: "Navy card that reads: Quick tip. When did you last look at your own Google profile? Customers see it before they ever see you.",
  },
  {
    id: "2026-11-20-two-profiles",
    publishAt: "2026-11-20T09:00:00-08:00",
    kind: "before-after",
    body:
      "Same trade. Same city. Same quality of work.\n\nOne profile has a handful of old reviews, no recent photos and no replies. The other has steady reviews, photos of last month's jobs and an owner who answers every review.\n\nA customer looking at both decides in seconds, and so does the AI assistant they ask for a recommendation. Which one looks more like your business right now?",
    card: {
      layout: "compare",
      theme: "light",
      kicker: "Which one gets the call?",
      headline: "Same trade. Same city.",
      left: { title: "Business A", points: ["6 reviews", "Last review 2 years ago", "No recent photos", "No replies"] },
      right: { title: "Business B", points: ["80+ reviews", "New reviews every month", "Photos of recent jobs", "Owner replies to all"] },
    },
    alt: "Side-by-side example of two Google profiles. Business A: 6 reviews, last one 2 years ago, no recent photos, no replies. Business B: 80 plus reviews, new reviews every month, photos of recent jobs, owner replies to all.",
  },
  {
    id: "2026-11-27-thank-you",
    publishAt: "2026-11-27T09:00:00-08:00",
    kind: "tip",
    body:
      "Happy Thanksgiving weekend from Reputation Turbo. Thank you to every San Diego County business owner who keeps our neighborhoods running.\n\nIf things slow down this time of year, it's a good moment to ask one question: is it the season, or can new customers just not find you?",
    format: "reel",
    card: { layout: "photo", photo: "hero-contractor", kicker: "Happy Thanksgiving", headline: "Thank you, San Diego County", subline: "For keeping our neighborhoods running." },
    slides: [
      { layout: "statement", kicker: "This time of year", headline: "Things slow down." },
      { layout: "statement", theme: "orange", kicker: "So ask yourself", headline: "Is it the season, or can new customers not find you?" },
      { layout: "statement", theme: "light", kicker: "Find out free", headline: "Get your free online audit", subline: "reputationturbo.com/free-audit" },
    ],
    alt: "Short video: Thank you, San Diego County. Things slow down this time of year. Is it the season, or can new customers not find you? Get your free online audit.",
  },
];

function blogUrl(slug: string): string {
  return `https://${siteHost}/blog/${slug}`;
}

/** The Tuesday share for a blog post. */
export function blogShare(post: BlogPost): SocialPost {
  const o = blogShareOverrides[post.slug] ?? {};
  const at = new Date(new Date(post.publishAt).getTime() + BLOG_SHARE_DELAY_HOURS * 3600_000);
  const card: SocialCard = o.card ?? { layout: "statement", kicker: "New on the blog", headline: post.title, subline: undefined };
  return {
    id: `blog-${post.slug}`,
    publishAt: pacificIso(at),
    kind: "blog",
    body: o.body ?? `New on the blog: ${post.title}\n\n${post.description}`,
    link: { label: "Read it here", url: blogUrl(post.slug) },
    card,
    slides: o.slides,
    format: o.format,
    alt: o.alt ?? `Card that reads: ${card.kicker}. ${cardText(card)}`,
  };
}

/** Every post, oldest first. */
export function allSocialPosts(): SocialPost[] {
  return [...blogPosts.map(blogShare), ...fridayPosts].sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt));
}

export function getSocialPost(id: string): SocialPost | undefined {
  return allSocialPosts().find((p) => p.id === id);
}

/** How long after its time a post may still go out. Older ones are skipped so a late setup never floods the page. */
export const PUBLISH_WINDOW_HOURS = 36;

/** Posts that are due now and still inside their publishing window. */
export function duePosts(now: Date = new Date(), all: SocialPost[] = allSocialPosts()): SocialPost[] {
  const t = now.getTime();
  return all.filter((p) => {
    const at = Date.parse(p.publishAt);
    return at <= t && t - at <= PUBLISH_WINDOW_HOURS * 3600_000;
  });
}

export type Network = "facebook" | "instagram";
export const networks: Network[] = ["facebook", "instagram"];
export const networkLabel: Record<Network, string> = { facebook: "Facebook", instagram: "Instagram" };

const instagramTags = "#SanDiegoSmallBusiness #EastCounty #SanDiegoContractors #LocalBusiness #GEO";

/**
 * The caption for one network. Facebook links are clickable. Instagram captions
 * can't hold clickable links, so they point to the link in the profile bio.
 */
export function captionFor(post: SocialPost, network: Network, live: boolean = commentToDm.live): string {
  const parts = [post.body.trim()];
  const keyword = activeKeyword(post, live);
  if (keyword) parts.push(`Comment ${keyword} and we'll DM you ${commentToDm.keywords[keyword].offer}.`);
  if (network === "facebook") {
    if (post.link) parts.push(`${post.link.label}: ${post.link.url}`);
    parts.push(`Get your free online audit: ${freeAuditUrl}`);
  } else {
    if (post.link) parts.push(`Read the full post at ${siteHost}/blog`);
    parts.push(`Get your free online audit: tap the link in our bio (${siteHost}/free-audit)`);
    parts.push(instagramTags);
  }
  return parts.join("\n\n");
}

/** The public address of a post's image. Instagram needs a JPEG it can download. */
/** The main words on a card, for alt text and the dashboard. */
export function cardText(card: SocialCard): string {
  return card.layout === "quote" ? card.quote : card.headline;
}

export function formatOf(post: SocialPost): SocialFormat {
  return post.format ?? (post.slides?.length ? "carousel" : "image");
}

/** Every card of a post, in order: the cover first, then the slides. */
export function cardsOf(post: SocialPost): SocialCard[] {
  return [post.card, ...(post.slides ?? [])];
}

/**
 * The public address of one card's image. Instagram needs a JPEG it can download.
 * Slide 1 is the cover; "tall" is the 1080x1920 version used for Reels.
 */
export function imagePath(post: SocialPost, slide = 1, tall = false): string {
  return `/social-image/${post.id}${slide > 1 ? `.s${slide}` : ""}${tall ? ".tall" : ""}.jpg`;
}

/** Reads "<id>.s3.tall.jpg" back into its parts. */
export function parseImageFile(file: string): { id: string; slide: number; tall: boolean } | null {
  const m = /^([a-z0-9-]+)(?:\.s(\d{1,2}))?(\.tall)?\.jpg$/.exec(file);
  if (!m) return null;
  return { id: m[1], slide: m[2] ? Number(m[2]) : 1, tall: Boolean(m[3]) };
}

const base = () => site.url.replace(/\/$/, "");

export function imageUrl(post: SocialPost, slide = 1): string {
  return `${base()}${imagePath(post, slide)}`;
}

/** Where a Reel's video lives: public/social/video/<id>.mp4. */
export function videoPath(post: SocialPost): string {
  return `/social/video/${post.id}.mp4`;
}

export function videoUrl(post: SocialPost): string {
  return `${base()}${videoPath(post)}`;
}

/** "2026-11-03T09:00:00-08:00" style time in Pacific, from a Date. */
export function pacificIso(d: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      timeZoneName: "longOffset",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const offset = (parts.timeZoneName as string).replace("GMT", "") || "+00:00";
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${offset}`;
}

export function formatPostTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/** For the dashboard: whether a post's time has passed, and whether it is now too late to post. */
export function postTiming(post: SocialPost, now: Date = new Date()): { due: boolean; missed: boolean } {
  const late = now.getTime() - Date.parse(post.publishAt);
  return { due: late >= 0, missed: late > PUBLISH_WINDOW_HOURS * 3600_000 };
}

/** Posts from the last two weeks onward (or every post), oldest first. */
export function recentSocialPosts(includeOld = false, now: Date = new Date()): SocialPost[] {
  const cutoff = now.getTime() - 14 * 24 * 3600_000;
  return allSocialPosts().filter((p) => includeOld || Date.parse(p.publishAt) >= cutoff);
}
