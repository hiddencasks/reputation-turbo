import { NextResponse, type NextRequest } from "next/server";
import { getProjectByToken, markClientSeen } from "@/lib/projects";
import { PORTAL_COOKIE, portalCookieOptions, portalSessionToken } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

// The private link from the invite email: signs the client in and opens their page.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProjectByToken(token).catch(() => null);
  if (!project) return NextResponse.redirect(new URL("/portal?link=expired", request.url));
  await markClientSeen(project.id);
  const res = NextResponse.redirect(new URL("/portal", request.url));
  res.cookies.set(PORTAL_COOKIE, await portalSessionToken(project), portalCookieOptions);
  return res;
}
