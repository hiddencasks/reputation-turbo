import "server-only";
import { sql } from "./db";
import { sendEmail } from "./email";
import { site } from "./site";
import { captionFor, cardsOf, duePosts, formatOf, formatPostTime, googleButtonUrl, imageUrl, networkLabel, networks, videoUrl, type Network, type SocialPost } from "./social";

/**
 * Publishes posts to the Facebook Page and the Instagram account through Meta's
 * Graph API (free). Settings, all in Vercel:
 *
 * - META_PAGE_ID: the Facebook Page's id.
 * - META_PAGE_TOKEN: a Page access token with pages_manage_posts,
 *   instagram_content_publish and instagram_basic (a token made from a
 *   long-lived user token doesn't expire).
 * - META_IG_USER_ID: the Instagram professional account linked to the Page.
 * - META_GRAPH_VERSION (optional): Graph API version, like "v24.0".
 * - SOCIAL_PAUSED=1 (optional): stop posting without removing anything.
 *
 * Google Business Profile (posts through Google's Business Profile API, free, but
 * only after Google approves our Cloud project for API access):
 * - GOOGLE_BUSINESS_CLIENT_ID / GOOGLE_BUSINESS_CLIENT_SECRET: an OAuth client in
 *   the Google Cloud project.
 * - GOOGLE_BUSINESS_REFRESH_TOKEN: from signing in once as a manager of the profile
 *   (scope https://www.googleapis.com/auth/business.manage).
 * - GOOGLE_BUSINESS_LOCATION: "accounts/<id>/locations/<id>".
 * Until those are set, each due post is emailed to the owner once, ready to paste
 * into the profile by hand (GOOGLE_POST_REMINDERS=0 stops those emails).
 *
 * What was posted is kept in the settings table under "social:<post id>:<network>".
 */

export type PublishState = {
  status: "posting" | "posted" | "failed";
  attempts: number;
  at: string;
  /** Facebook post id or Instagram media id. */
  remoteId?: string;
  error?: string;
};

const MAX_ATTEMPTS = 3;

function graphBase(): string {
  return `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v24.0"}`;
}

export function socialConfig() {
  const pageId = process.env.META_PAGE_ID ?? "";
  const token = process.env.META_PAGE_TOKEN ?? "";
  const igUserId = process.env.META_IG_USER_ID ?? "";
  const g = googleConfig();
  return {
    paused: process.env.SOCIAL_PAUSED === "1",
    facebook: Boolean(pageId && token),
    instagram: Boolean(igUserId && token),
    google: Boolean(g.clientId && g.clientSecret && g.refreshToken && g.location),
    pageId,
    igUserId,
    token,
  };
}

function googleConfig() {
  return {
    clientId: process.env.GOOGLE_BUSINESS_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET ?? "",
    refreshToken: process.env.GOOGLE_BUSINESS_REFRESH_TOKEN ?? "",
    location: (process.env.GOOGLE_BUSINESS_LOCATION ?? "").replace(/^\/+|\/+$/g, ""),
  };
}

const stateKey = (postId: string, network: Network) => `social:${postId}:${network}`;

export async function getStates(): Promise<Record<string, PublishState>> {
  const rows = await sql<{ key: string; value: PublishState }[]>`select key, value from settings where key like 'social:%'`;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function stateFor(states: Record<string, PublishState>, postId: string, network: Network): PublishState | undefined {
  return states[stateKey(postId, network)];
}

/**
 * Claims a post for one network so two runs never post it twice. Returns the
 * attempt number, or 0 when it is already posted, is being posted, or has failed too many times.
 */
async function claim(postId: string, network: Network, force = false): Promise<number> {
  const key = stateKey(postId, network);
  const fresh: PublishState = { status: "posting", attempts: 1, at: new Date().toISOString() };
  const rows = force
    ? await sql`
        insert into settings (key, value, updated_at) values (${key}, ${sql.json(fresh)}, now())
        on conflict (key) do update set
          value = jsonb_build_object('status', 'posting', 'attempts', 1, 'at', ${fresh.at}::text), updated_at = now()
        where settings.value->>'status' <> 'posted'
        returning (value->>'attempts')::int as attempts`
    : await sql`
        insert into settings (key, value, updated_at) values (${key}, ${sql.json(fresh)}, now())
        on conflict (key) do update set
          value = jsonb_build_object('status', 'posting', 'attempts', (settings.value->>'attempts')::int + 1, 'at', ${fresh.at}::text),
          updated_at = now()
        where settings.value->>'status' = 'failed' and (settings.value->>'attempts')::int < ${MAX_ATTEMPTS}
        returning (value->>'attempts')::int as attempts`;
  return rows.length ? Number(rows[0].attempts) : 0;
}

async function record(postId: string, network: Network, patch: Partial<PublishState>) {
  const key = stateKey(postId, network);
  await sql`
    update settings set value = (value - 'error') || ${sql.json({ ...patch, at: new Date().toISOString() })}, updated_at = now()
    where key = ${key}`;
}

type GraphResult = { id?: string; post_id?: string; status_code?: string; error?: { message?: string } };

async function graph(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<GraphResult> {
  const { token } = socialConfig();
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === "GET" ? `${graphBase()}/${path}?${body}` : `${graphBase()}/${path}`;
  const res = await fetch(url, method === "GET" ? { cache: "no-store" } : { method, body, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as GraphResult;
  if (!res.ok || data.error) throw new Error(data.error?.message || `Meta returned ${res.status}`);
  return data;
}

async function postToFacebook(post: SocialPost): Promise<string> {
  const { pageId } = socialConfig();
  const message = captionFor(post, "facebook");
  const format = formatOf(post);
  if (format === "reel") {
    // A short vertical video. Facebook shows it in the feed and as a Reel.
    const data = await graph(`${pageId}/videos`, { file_url: videoUrl(post), description: message, published: "true" });
    return data.id || "";
  }
  if (format === "carousel") {
    // Upload each slide unpublished, then post them together as one multi-photo post.
    const ids: string[] = [];
    for (let i = 1; i <= cardsOf(post).length; i++) {
      const photo = await graph(`${pageId}/photos`, { url: imageUrl(post, i), published: "false" });
      if (!photo.id) throw new Error(`Facebook did not accept slide ${i}.`);
      ids.push(photo.id);
    }
    const data = await graph(`${pageId}/feed`, { message, attached_media: JSON.stringify(ids.map((id) => ({ media_fbid: id }))) });
    return data.id || "";
  }
  const data = await graph(`${pageId}/photos`, { url: imageUrl(post), message, published: "true" });
  return data.post_id || data.id || "";
}

/** Waits until Instagram has fetched and processed a container's media. Videos take longer than photos. */
async function waitForContainer(id: string, tries: number, delayMs: number) {
  for (let i = 0; i < tries; i++) {
    const s = await graph(id, { fields: "status_code" }, "GET");
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram could not process the media (${s.status_code}).`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Instagram is still processing the media. It will try again next hour.");
}

async function postToInstagram(post: SocialPost): Promise<string> {
  const { igUserId } = socialConfig();
  const caption = captionFor(post, "instagram");
  const format = formatOf(post);
  let container: string | undefined;
  if (format === "reel") {
    const c = await graph(`${igUserId}/media`, { media_type: "REELS", video_url: videoUrl(post), cover_url: imageUrl(post), caption, share_to_feed: "true" });
    container = c.id;
    if (!container) throw new Error("Instagram did not accept the video.");
    await waitForContainer(container, 40, 5000);
  } else if (format === "carousel") {
    const children: string[] = [];
    for (let i = 1; i <= cardsOf(post).length; i++) {
      const child = await graph(`${igUserId}/media`, { image_url: imageUrl(post, i), is_carousel_item: "true" });
      if (!child.id) throw new Error(`Instagram did not accept slide ${i}.`);
      children.push(child.id);
    }
    for (const child of children) await waitForContainer(child, 10, 3000);
    const c = await graph(`${igUserId}/media`, { media_type: "CAROUSEL", children: children.join(","), caption });
    container = c.id;
    if (!container) throw new Error("Instagram did not accept the carousel.");
    await waitForContainer(container, 10, 3000);
  } else {
    const params: Record<string, string> = { image_url: imageUrl(post), caption };
    if (post.alt) params.alt_text = post.alt;
    const c = await graph(`${igUserId}/media`, params);
    container = c.id;
    if (!container) throw new Error("Instagram did not accept the image.");
    await waitForContainer(container, 10, 3000);
  }
  const published = await graph(`${igUserId}/media_publish`, { creation_id: container });
  return published.id || "";
}

async function googleAccessToken(): Promise<string> {
  const g = googleConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: g.clientId, client_secret: g.clientSecret, refresh_token: g.refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google sign-in failed: ${data.error_description || data.error || res.status}`);
  return data.access_token;
}

async function googleApi(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<{ name?: string; localPosts?: unknown[] }> {
  const token = await googleAccessToken();
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { name?: string; localPosts?: unknown[]; error?: { message?: string } };
  if (!res.ok || data.error) throw new Error(data.error?.message || `Google returned ${res.status}`);
  return data;
}

/** A Google profile "update": the text, the post's cover image and a Learn more button. Carousels and Reels use their cover. */
async function postToGoogle(post: SocialPost): Promise<string> {
  const { location } = googleConfig();
  const data = await googleApi(`${location}/localPosts`, {
    method: "POST",
    body: {
      languageCode: "en-US",
      topicType: "STANDARD",
      summary: captionFor(post, "google"),
      callToAction: { actionType: "LEARN_MORE", url: googleButtonUrl(post) },
      media: [{ mediaFormat: "PHOTO", sourceUrl: imageUrl(post) }],
    },
  });
  return data.name || "";
}

const publishers: Record<Network, (post: SocialPost) => Promise<string>> = {
  facebook: postToFacebook,
  instagram: postToInstagram,
  google: postToGoogle,
};

export type PublishOutcome = { postId: string; network: Network; status: "posted" | "failed"; error?: string; final?: boolean };

async function publishOne(post: SocialPost, network: Network, force = false): Promise<PublishOutcome | null> {
  const attempt = await claim(post.id, network, force);
  if (!attempt) return null;
  try {
    const remoteId = await publishers[network](post);
    await record(post.id, network, { status: "posted", remoteId, error: undefined });
    return { postId: post.id, network, status: "posted" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await record(post.id, network, { status: "failed", error });
    return { postId: post.id, network, status: "failed", error, final: attempt >= MAX_ATTEMPTS };
  }
}

/** Run by the hourly cron: publishes every due post to each connected network. */
export async function publishDue(now: Date = new Date()): Promise<PublishOutcome[]> {
  const config = socialConfig();
  if (config.paused) return [];
  const outcomes: PublishOutcome[] = [];
  for (const post of duePosts(now)) {
    for (const network of networks) {
      if (!config[network]) continue;
      const outcome = await publishOne(post, network);
      if (outcome) outcomes.push(outcome);
    }
  }
  // Email only once a post has used up its tries, so a passing hiccup doesn't send mail.
  const failed = outcomes.filter((o) => o.status === "failed" && o.final);
  if (failed.length) await notifyFailures(failed);
  if (!config.google && process.env.GOOGLE_POST_REMINDERS !== "0") {
    for (const post of duePosts(now)) await remindGooglePost(post);
  }
  return outcomes;
}

/**
 * While the Google profile isn't connected, emails the owner each due post once,
 * ready to paste into the profile as an update.
 */
async function remindGooglePost(post: SocialPost) {
  const key = `social:${post.id}:google-reminder`;
  const rows = await sql`
    insert into settings (key, value, updated_at) values (${key}, ${sql.json({ at: new Date().toISOString() })}, now())
    on conflict (key) do nothing
    returning key`;
  if (!rows.length) return;
  await sendEmail({
    to: process.env.OWNER_EMAIL ?? site.email,
    template: "owner_google_post",
    subject: "Today's Google profile post is ready to paste",
    paragraphs: [
      `This post went out on Facebook and Instagram today (${formatPostTime(post.publishAt)}). It takes about a minute to add it to the Google profile:`,
      `1. Open the Google profile (search "Reputation Turbo" while signed in as the profile's owner) and tap "Add update".`,
      `2. Add this image: ${imageUrl(post)}`,
      "3. Paste this text:",
      ...captionFor(post, "google").split("\n\n"),
      `4. Add a button: "Learn more", with this link: ${googleButtonUrl(post)}`,
      `You can also copy all of it from the dashboard: ${site.url}/admin/social#${post.id}`,
    ],
  });
}

/** "Post now" from the dashboard: publishes one post to one network, even outside its time. */
export async function publishNow(post: SocialPost, network: Network): Promise<PublishOutcome | null> {
  if (!socialConfig()[network]) return { postId: post.id, network, status: "failed", error: `${networkLabel[network]} isn't connected yet.` };
  return publishOne(post, network, true);
}

async function notifyFailures(failed: PublishOutcome[]) {
  await sendEmail({
    to: process.env.OWNER_EMAIL ?? site.email,
    template: "owner_social_failed",
    subject: "A social media post didn't go out",
    paragraphs: [
      `The scheduled post below couldn't be published after ${MAX_ATTEMPTS} tries, one hour apart. You can post it by hand from the dashboard.`,
      ...failed.map((f) => `${networkLabel[f.network]}, post "${f.postId}": ${f.error}`),
      `See all posts and retry: ${site.url}/admin/social`,
    ],
  });
}

/** Checks the connection without posting anything. */
export async function checkConnection(): Promise<{ network: Network; ok: boolean; detail: string }[]> {
  const config = socialConfig();
  const results: { network: Network; ok: boolean; detail: string }[] = [];
  for (const network of networks) {
    if (!config[network]) {
      results.push({ network, ok: false, detail: network === "google" ? "Not connected yet (posts are emailed to you to paste)." : "Not set up in Vercel yet." });
      continue;
    }
    try {
      if (network === "google") {
        await googleApi(`${googleConfig().location}/localPosts?pageSize=1`, { method: "GET" });
        results.push({ network, ok: true, detail: "Connected to the Google profile" });
        continue;
      }
      const id = network === "facebook" ? config.pageId : config.igUserId;
      const data = (await graph(id, { fields: network === "facebook" ? "name" : "username" }, "GET")) as { name?: string; username?: string };
      results.push({ network, ok: true, detail: `Connected to ${data.name ?? `@${data.username}`}` });
    } catch (e) {
      results.push({ network, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
