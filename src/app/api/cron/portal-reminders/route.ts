import { sendDueReminders } from "@/lib/portal-emails";

// Runs daily (see vercel.json): a friendly reminder to clients with open checklist items.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json({ reminders: await sendDueReminders() });
  } catch (err) {
    // Before the one-time SQL is run the tables are missing; nothing to do.
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "42P01") return Response.json({ reminders: [], note: "client portal tables not created yet" });
    throw err;
  }
}
