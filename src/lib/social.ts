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
  "website-turning-customers-away": {
    body:
      "A customer found you on Google, tapped through to your website, and left without calling. You never knew they were there.\n\nThis week on the blog: six signs your website is quietly sending customers back to your competitors.",
    card: { layout: "statement", kicker: "New on the blog", headline: "Is your website turning customers away?", subline: "Six signs to watch for." },
  },
  "found-in-one-town-not-the-next": {
    body:
      "Show up in your own city but nowhere in the towns you drive to every week? You're not alone.\n\nThis week on the blog: why so many San Diego County contractors are invisible one town over, and the shortcuts that make it worse.",
    card: { layout: "statement", kicker: "New on the blog", headline: "Found in one town, invisible in the next", subline: "Why it happens to so many contractors." },
  },
  "when-ai-gets-your-business-wrong": {
    body:
      "Wrong hours. An old phone number. A service you don't even offer. When ChatGPT, Claude, Gemini, Perplexity or Copilot gets your business wrong, customers don't know. They just call someone else.\n\nThis week on the blog: why it happens and the signs it's happening to you.",
    card: { layout: "statement", kicker: "New on the blog", headline: "What happens when AI gets your business wrong", subline: "And the signs it's happening to you." },
  },
  "how-fast-do-you-answer-new-leads": {
    body:
      "Customers with a problem contact two or three businesses and hire whoever gets back to them first. Especially the week before Christmas.\n\nThis week on the blog: where new leads slip through the cracks.",
    card: { layout: "statement", kicker: "New on the blog", headline: "How fast do you answer new leads?", subline: "The first to reply usually gets the job." },
  },
  "before-you-pay-for-seo": {
    body:
      "\"Page one of Google, guaranteed!\" You'll hear it a lot in January.\n\nThis week on the blog: what changed for local businesses with AI search, and six red flags to watch for before you pay for any marketing.",
    card: { layout: "statement", kicker: "New on the blog", headline: "Before you pay for SEO, read this", subline: "Six red flags in a marketing pitch." },
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
  {
    id: "2026-12-04-what-customers-ask",
    publishAt: "2026-12-04T09:00:00-08:00",
    kind: "ai-check",
    body:
      "Customers don't type \"plumber near me\" into AI. They ask a full question, the way they'd ask a neighbor, and they get back two or three names.\n\nChatGPT, Claude, Gemini, Perplexity and Copilot all answer questions like this one every day. When a customer in your area asks it about your trade, is your business in the answer?",
    card: {
      layout: "quote",
      theme: "light",
      kicker: "What customers ask AI",
      quote: "Who's a reliable plumber near me who can come out today?",
      by: "Example question. Is your business in the answer?",
    },
    alt: "Light card with a quote. What customers ask AI: Who's a reliable plumber near me who can come out today? Example question. Is your business in the answer?",
  },
  {
    id: "2026-12-11-three-names",
    publishAt: "2026-12-11T09:00:00-08:00",
    kind: "ai-check",
    keyword: "QUIZ",
    body:
      "Ask Google and you get a page of results. Ask ChatGPT, Claude, Gemini, Perplexity or Copilot and you usually get about three names.\n\nThe customer calls one of them. The businesses that weren't named never even knew the customer was looking.",
    format: "reel",
    card: { layout: "photo", photo: "ai-search-landscaper", kicker: "Picture this", headline: "A customer asks AI for a landscaper in El Cajon", subline: "An example. It happens every day." },
    slides: [
      { layout: "stat", kicker: "What comes back", stat: "3", headline: "Names. Not a page of results." },
      { layout: "statement", theme: "orange", kicker: "So the real question is", headline: "Is your business one of them?" },
      { layout: "statement", theme: "light", kicker: "Find out free", headline: "Get your free online audit", subline: "reputationturbo.com/free-audit" },
    ],
    alt: "Short video: Picture a customer asking AI for a landscaper in El Cajon. About 3 names come back, not a page of results. Is your business one of them? Get your free online audit.",
  },
  {
    id: "2026-12-18-holiday-check",
    publishAt: "2026-12-18T09:00:00-08:00",
    kind: "tip",
    body:
      "The week before the holidays, customers with a leak, a broken heater or a last-minute job don't shop around for long. They look you up, decide in seconds, and call whoever looks ready.\n\nHere's what they check before they ever pick up the phone. Swipe through and ask yourself how your business looks right now.",
    card: { layout: "statement", theme: "light", kicker: "Before the holidays", headline: "4 things customers check before they call you" },
    slides: [
      { layout: "point", kicker: "They check", number: 1, headline: "Are you open?", subline: "Holiday hours that are wrong, or missing, send them to the next name." },
      { layout: "point", kicker: "They check", number: 2, headline: "Are you still busy?", subline: "No reviews or photos in months can look like nobody's home." },
      { layout: "point", kicker: "They check", number: 3, headline: "Do you do their job, in their town?", subline: "If they have to dig for it, they won't." },
      { layout: "point", kicker: "They check", number: 4, headline: "Can they reach you fast?", subline: "A slow site or a broken form ends it right there." },
      { layout: "statement", theme: "orange", kicker: "Not sure how you look?", headline: "We'll show you, free", subline: "Get your free online audit. Link in the caption." },
    ],
    alt: "Carousel: 4 things customers check before they call you. Are you open? Are you still busy? Do you do their job, in their town? Can they reach you fast? Get your free online audit.",
  },
  {
    id: "2026-12-25-merry-christmas",
    publishAt: "2026-12-25T09:00:00-08:00",
    kind: "tip",
    body:
      "Merry Christmas from Reputation Turbo.\n\nTo every San Diego County business owner who answered a late call, finished a job in the rain or worked through the holidays this year: thank you. Enjoy the time with your family.",
    card: { layout: "photo", photo: "trade-landscaping", kicker: "Merry Christmas", headline: "Thank you for keeping San Diego County running", subline: "Enjoy the time with your family." },
    alt: "Photo card that reads: Merry Christmas. Thank you for keeping San Diego County running. Enjoy the time with your family.",
  },
];

/**
 * Slides (and sometimes a different cover) for blog shares, by blog slug. Kept apart
 * from `blogShareOverrides` so the monthly social drafts never clash with the
 * monthly blog drafts, which add the wording there.
 */
const blogShareFormats: Record<string, Partial<Pick<SocialPost, "card" | "slides" | "format">>> = {
  "website-turning-customers-away": {
    slides: [
      { layout: "point", theme: "light", kicker: "Sign", number: 1, headline: "It's slow on a phone", subline: "Most customers see your site standing in their driveway." },
      { layout: "point", theme: "light", kicker: "Sign", number: 2, headline: "It doesn't say what you do, and where, right away" },
      { layout: "point", theme: "light", kicker: "Sign", number: 3, headline: "The contact form quietly stopped working", subline: "Nobody notices for months." },
      { layout: "statement", theme: "orange", kicker: "3 more signs on the blog", headline: "Is your website costing you jobs?", subline: "Read the full post, or get a free audit and know for sure." },
    ],
  },
  "found-in-one-town-not-the-next": {
    card: { layout: "photo", photo: "trade-roofing", kicker: "New on the blog", headline: "Found in one town, invisible in the next", subline: "Why it happens to so many contractors." },
  },
  "when-ai-gets-your-business-wrong": {
    card: { layout: "statement", theme: "orange", kicker: "New on the blog", headline: "What happens when AI gets your business wrong" },
    slides: [
      { layout: "point", kicker: "What AI gets wrong", number: 1, headline: "Old phone numbers and addresses" },
      { layout: "point", kicker: "What AI gets wrong", number: 2, headline: "Wrong hours, or saying you've closed" },
      { layout: "point", kicker: "What AI gets wrong", number: 3, headline: "Services you don't offer", subline: "Or missing the ones you do." },
      { layout: "point", kicker: "What AI gets wrong", number: 4, headline: "Mixing you up with a similar name" },
      { layout: "statement", theme: "light", kicker: "Customers don't know it's wrong", headline: "They just call someone else", subline: "Read why it happens on the blog, or get a free audit to see what AI says about you." },
    ],
  },
  "how-fast-do-you-answer-new-leads": {
    card: { layout: "stat", theme: "orange", kicker: "New on the blog", stat: "1st", headline: "The first business to reply usually gets the job", subline: "How fast do you answer new leads?" },
  },
  "before-you-pay-for-seo": {
    card: { layout: "statement", kicker: "New on the blog", headline: "Before you pay for SEO, read this", subline: "Red flags in a marketing pitch." },
    slides: [
      { layout: "point", theme: "light", kicker: "Red flag", number: 1, headline: "Guaranteed rankings", subline: "Nobody controls Google's results or AI answers." },
      { layout: "point", theme: "light", kicker: "Red flag", number: 2, headline: "A long contract before any results" },
      { layout: "point", theme: "light", kicker: "Red flag", number: 3, headline: "They own your accounts", subline: "Your website and Google profile should be in your name." },
      { layout: "point", theme: "light", kicker: "Red flag", number: 4, headline: "No mention of AI search at all" },
      { layout: "statement", theme: "orange", kicker: "Ask first", headline: "Where does my business stand today?", subline: "Our audit shows you, free, before you spend a dollar." },
    ],
  },
};

function blogUrl(slug: string): string {
  return `https://${siteHost}/blog/${slug}`;
}

/** The Tuesday share for a blog post. */
export function blogShare(post: BlogPost): SocialPost {
  const o = { ...blogShareOverrides[post.slug], ...blogShareFormats[post.slug] };
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
