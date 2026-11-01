import { captionFor, postTiming, recentSocialPosts, formatPostTime, imagePath, networkLabel, networks, PUBLISH_WINDOW_HOURS, type SocialPost } from "@/lib/social";
import { getStates, socialConfig, stateFor, type PublishState } from "@/lib/social-publish";
import { postNow, testConnection } from "./actions";

const kindLabel: Record<SocialPost["kind"], string> = {
  blog: "Blog share",
  tip: "Tip",
  "before-after": "Before and after",
  "ai-check": "AI check",
};

function StatusPill({ state, missed, connected }: { state?: PublishState; missed: boolean; connected: boolean }) {
  let text = missed ? "Missed (too late to post)" : "Scheduled";
  let cls = "bg-navy-50 text-navy";
  if (state?.status === "posted") [text, cls] = [`Posted ${new Date(state.at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" })}`, "bg-green-100 text-green-800"];
  else if (state?.status === "failed") [text, cls] = [`Failed (${state.attempts} ${state.attempts === 1 ? "try" : "tries"})`, "bg-red-100 text-red-800"];
  else if (state?.status === "posting") [text, cls] = ["Posting… (check the page if this stays)", "bg-amber-100 text-amber-800"];
  else if (!connected) text = missed ? "Not posted (not connected)" : "Scheduled (not connected yet)";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

export default async function SocialPage({ searchParams }: { searchParams: Promise<{ msg?: string; all?: string }> }) {
  const { msg, all } = await searchParams;
  const config = socialConfig();
  const states = await getStates();
  const list = recentSocialPosts(Boolean(all));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Social posts</h1>
        <p className="mt-1 text-sm text-muted">
          Tuesdays share the week&apos;s blog post, Fridays a tip. Each post goes to Facebook and Instagram on its own at its time.
          Posts more than {PUBLISH_WINDOW_HOURS} hours late are skipped so nothing piles up.
        </p>
      </div>

      {msg ? <p className="rounded-md border border-line bg-white p-3 text-sm">{msg}</p> : null}

      <section className={`rounded-lg bg-white p-5 shadow-sm ${config.facebook && config.instagram && !config.paused ? "" : "border-2 border-orange"}`}>
        <h2 className="font-display text-xl font-bold text-navy">Connection</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {networks.map((n) => (
            <li key={n}>{networkLabel[n]}: {config[n] ? "set up" : "not connected yet (add the META_ settings in Vercel)"}</li>
          ))}
          {config.paused ? <li className="font-semibold text-orange-600">Paused (SOCIAL_PAUSED=1 in Vercel). Nothing will post.</li> : null}
        </ul>
        <form action={testConnection} className="mt-3">
          <button className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white">Test connection (posts nothing)</button>
        </form>
      </section>

      <div className="space-y-4">
        {list.map((post) => {
          const { missed } = postTiming(post);
          return (
            <article key={post.id} id={post.id} className="grid gap-4 rounded-lg bg-white p-4 shadow-sm md:grid-cols-[220px_1fr]">
              <a href={imagePath(post)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePath(post)} alt={post.alt ?? ""} width={220} height={275} loading="lazy" className="w-full rounded-md border border-line" />
              </a>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy">{formatPostTime(post.publishAt)}</span>
                  <span className="text-xs uppercase tracking-wide text-muted">{kindLabel[post.kind]}</span>
                </div>
                {networks.map((n) => {
                  const state = stateFor(states, post.id, n);
                  return (
                    <details key={n} className="rounded-md border border-line p-3">
                      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">{networkLabel[n]}</span>
                        <StatusPill state={state} missed={missed} connected={config[n]} />
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-ink">{captionFor(post, n)}</pre>
                      {state?.error ? <p className="mt-2 text-sm text-red-700">Last error: {state.error}</p> : null}
                      {state?.status !== "posted" && config[n] ? (
                        <form action={postNow} className="mt-2">
                          <input type="hidden" name="postId" value={post.id} />
                          <input type="hidden" name="network" value={n} />
                          <button className="rounded-md border border-navy px-3 py-1.5 text-sm font-semibold text-navy">Post to {networkLabel[n]} now</button>
                        </form>
                      ) : null}
                    </details>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
      {!all ? <a href="/admin/social?all=1" className="text-sm font-semibold text-navy underline">Show older posts</a> : null}
    </div>
  );
}
