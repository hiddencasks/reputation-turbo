import "server-only";
import { sql } from "./db";
import { sendEmail } from "./email";
import { site } from "./site";
import { captionFor, duePosts, imageUrl, networkLabel, networks, type Network, type SocialPost } from "./social";

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
  return {
    paused: process.env.SOCIAL_PAUSED === "1",
    facebook: Boolean(pageId && token),
    instagram: Boolean(igUserId && token),
    pageId,
    igUserId,
    token,
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
  const data = await graph(`${pageId}/photos`, { url: imageUrl(post), message: captionFor(post, "facebook"), published: "true" });
  return data.post_id || data.id || "";
}

async function postToInstagram(post: SocialPost): Promise<string> {
  const { igUserId } = socialConfig();
  const params: Record<string, string> = { image_url: imageUrl(post), caption: captionFor(post, "instagram") };
  if (post.alt) params.alt_text = post.alt;
  const container = await graph(`${igUserId}/media`, params);
  if (!container.id) throw new Error("Instagram did not accept the image.");
  // Instagram fetches the image first; wait until it is ready (usually a few seconds).
  for (let i = 0; i < 10; i++) {
    const s = await graph(container.id, { fields: "status_code" }, "GET");
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram could not process the image (${s.status_code}).`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const published = await graph(`${igUserId}/media_publish`, { creation_id: container.id });
  return published.id || "";
}

const publishers: Record<Network, (post: SocialPost) => Promise<string>> = {
  facebook: postToFacebook,
  instagram: postToInstagram,
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
  return outcomes;
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
      results.push({ network, ok: false, detail: "Not set up in Vercel yet." });
      continue;
    }
    try {
      const id = network === "facebook" ? config.pageId : config.igUserId;
      const data = (await graph(id, { fields: network === "facebook" ? "name" : "username" }, "GET")) as { name?: string; username?: string };
      results.push({ network, ok: true, detail: `Connected to ${data.name ?? `@${data.username}`}` });
    } catch (e) {
      results.push({ network, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
