import { getSession } from "@/lib/auth";
import { getFile } from "@/lib/projects";
import { downloadUrl, readLocal, storageMode } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Opens a client's uploaded file for the signed-in owner.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Not signed in", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const file = await getFile(id);
  if (!file) return new Response("Not found", { status: 404 });
  if (storageMode() === "supabase") {
    const url = await downloadUrl(file.storage_path, file.filename);
    return Response.redirect(url!, 302);
  }
  if (storageMode() === "local") {
    const data = await readLocal(file.storage_path).catch(() => null);
    if (!data) return new Response("File missing", { status: 404 });
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.filename.replace(/["\\\r\n]/g, "_")}"`,
      },
    });
  }
  return new Response("File storage isn't set up", { status: 503 });
}
