import { publishDuePlanPosts } from "@/lib/plans";
import { publishDue } from "@/lib/social-publish";

// Runs every hour (see vercel.json): publishes any Facebook and Instagram post
// that is due (see src/lib/social.ts), then every approved client post that is due
// (monthly plans, see src/lib/plans.ts).
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const outcomes = await publishDue();
  const clients = await publishDuePlanPosts().catch((err) => {
    console.error("[plans] client posts failed:", err);
    return [];
  });
  return Response.json({ outcomes, clients });
}
