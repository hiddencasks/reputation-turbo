import { processPending, queueMonthlyChecks } from "@/lib/ai-visibility/run";

// Runs daily (see vercel.json): queues monthly re-checks for clients on AI
// tracking, then runs waiting or interrupted checks.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const queued = await queueMonthlyChecks();
  const processed = await processPending(3);
  return Response.json({ queued, processed });
}
