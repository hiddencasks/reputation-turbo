import { type NextRequest } from "next/server";
import { getPortalProject } from "@/lib/portal-auth";
import { MAX_FILE_BYTES, storageMode, verifyLocalSignature, writeLocal } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Local development only: stands in for Supabase Storage's signed upload link.
export async function PUT(request: NextRequest) {
  if (storageMode() !== "local") return new Response("Not available", { status: 404 });
  const path = request.nextUrl.searchParams.get("path") ?? "";
  const sig = request.nextUrl.searchParams.get("sig") ?? "";
  const project = await getPortalProject();
  if (!project || !path.startsWith(`${project.id}/`) || !verifyLocalSignature(path, sig)) return new Response("Forbidden", { status: 403 });
  const data = Buffer.from(await request.arrayBuffer());
  if (data.length > MAX_FILE_BYTES) return new Response("Too large", { status: 413 });
  await writeLocal(path, data);
  return new Response("ok");
}
