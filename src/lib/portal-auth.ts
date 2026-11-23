import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getProject, type ProjectWithLead } from "./projects";

export const PORTAL_COOKIE = "rt_portal";
const PORTAL_DAYS = 30;

// A key separate from the dashboard's, so a portal session can never open the dashboard.
function portalKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(`${secret}:client-portal`);
}

/** The link version: changes when the owner resets the portal link, which signs everyone out. */
const linkVersion = (p: { portal_token: string }) => p.portal_token.slice(0, 12);

export const portalCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/portal",
  maxAge: PORTAL_DAYS * 24 * 60 * 60,
};

/** Signed portal session for the client's project (set it as the PORTAL_COOKIE). */
export async function portalSessionToken(project: { id: string; portal_token: string }): Promise<string> {
  return new SignJWT({ role: "client", v: linkVersion(project) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(project.id)
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_DAYS}d`)
    .sign(portalKey());
}

export async function destroyPortalSession() {
  (await cookies()).delete({ name: PORTAL_COOKIE, path: "/portal" });
}

/** The signed-in client's project, or null. */
export async function getPortalProject(): Promise<ProjectWithLead | null> {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, portalKey(), { algorithms: ["HS256"] });
    if (payload.role !== "client" || typeof payload.sub !== "string" || !/^[0-9a-f-]{36}$/.test(payload.sub)) return null;
    const project = await getProject(payload.sub);
    if (!project || linkVersion(project) !== payload.v) return null;
    return project;
  } catch {
    return null;
  }
}
