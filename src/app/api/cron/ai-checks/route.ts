import { processPending, queueMonthlyChecks } from "@/lib/ai-visibility/run";

// Runs every 15 minutes (see vercel.json): queues monthly re-checks for clients
// on AI tracking (only once per 28 days each), then finishes any check that is
// waiting or was interrupted, so a stalled audit is done within minutes, not a day.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const queued = await queueMonthlyChecks();
  const processed = await processPending(2);
  return Response.json({ queued, processed });
}
