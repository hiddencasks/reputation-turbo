import { sendDueFollowups } from "@/lib/followup";

// Runs every 10 minutes (see vercel.json): sends the personal follow-up notes
// whose time has come (about an hour after "Approve & email").
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json({ outcomes: await sendDueFollowups() });
  } catch (err) {
    // Before the one-time SQL is run the table is missing; nothing to send.
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "42P01") return Response.json({ outcomes: [], note: "followup_notes table not created yet" });
    throw err;
  }
}
