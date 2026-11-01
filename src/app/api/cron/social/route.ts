import { publishDue } from "@/lib/social-publish";

// Runs every hour (see vercel.json): publishes any Facebook and Instagram post
// that is due (see src/lib/social.ts). Does nothing until Meta is connected.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const outcomes = await publishDue();
  return Response.json({ outcomes });
}
