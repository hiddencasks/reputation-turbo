"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { addFile, getFile, getItem, getProject, recordAgreement, removeFileRow, saveAnswer, setItemDone } from "@/lib/projects";
import { destroyPortalSession, getPortalProject } from "@/lib/portal-auth";
import { notifyOwnerOfClientUpdate, sendPortalLink } from "@/lib/portal-emails";
import { createUploadTarget, MAX_FILE_BYTES, removeStored, storageMode, storagePath, storedSize, type UploadTarget } from "@/lib/storage";

const uuid = z.string().regex(/^[0-9a-f-]{36}$/);

async function requireClient() {
  const project = await getPortalProject();
  if (!project) redirect("/portal");
  return project;
}

function tellOwner(projectId: string, what: string) {
  after(() => notifyOwnerOfClientUpdate(projectId, what).catch((err) => console.error("[portal] owner email failed:", err)));
}

// ---------- Getting a new link ----------

export type LinkState = { sent: boolean; error: string };

const requests = new Map<string, number>();

export async function requestPortalLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const parsed = z.string().trim().toLowerCase().email().max(200).safeParse(formData.get("email"));
  if (!parsed.success) return { sent: false, error: "Enter the email address we have for you." };
  const email = parsed.data;
  // One email per address every 2 minutes, and the same answer whether or not we know the address.
  const last = requests.get(email) ?? 0;
  if (Date.now() - last > 120_000) {
    requests.set(email, Date.now());
    const rows = await sql<{ id: string }[]>`select id from client_projects where lower(portal_email) = ${email} and delivered_at is null`.catch(() => []);
    for (const row of rows) {
      const project = await getProject(row.id);
      if (project) await sendPortalLink(project);
    }
  }
  return { sent: true, error: "" };
}

export async function signOutOfPortal() {
  await destroyPortalSession();
  redirect("/portal");
}

// ---------- Checklist ----------

export async function clientSaveAnswer(itemId: string, formData: FormData) {
  const project = await requireClient();
  const item = await getItem(project.id, uuid.parse(itemId));
  if (!item) return;
  const answer = z.string().max(5000).parse(formData.get("answer") ?? "");
  await saveAnswer(project.id, item.id, answer, "client");
  tellOwner(project.id, `answered "${item.label}"`);
  revalidatePath("/portal");
}

export async function clientSetDone(itemId: string, formData: FormData) {
  const project = await requireClient();
  const item = await getItem(project.id, uuid.parse(itemId));
  if (!item) return;
  const done = formData.get("done") === "true";
  await setItemDone(project.id, item.id, done, "client");
  if (done) tellOwner(project.id, `marked "${item.label}" as done`);
  revalidatePath("/portal");
}

// ---------- Uploads (the browser sends the file straight to storage) ----------

export type UploadStart = { ok: true; path: string; target: UploadTarget } | { ok: false; error: string };

export async function startUpload(itemId: string, file: { name: string; size: number; type: string }): Promise<UploadStart> {
  const project = await getPortalProject();
  if (!project) return { ok: false, error: "Your session ended. Open your link again." };
  const item = await getItem(project.id, uuid.parse(itemId));
  if (!item || item.kind !== "upload") return { ok: false, error: "That item doesn't take files." };
  if (storageMode() === "off") return { ok: false, error: "Uploads aren't switched on yet. Please email your files to us for now." };
  if (!(file.size > 0) || file.size > MAX_FILE_BYTES) return { ok: false, error: `${file.name} is over 25 MB. Email it to us instead, or send a smaller copy.` };
  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from intake_files where project_id = ${project.id}`;
  if (count >= 300) return { ok: false, error: "That's a lot of files! Email us and we'll sort out the rest." };
  const path = storagePath(project.id, item.id, String(file.name).slice(0, 200));
  try {
    return { ok: true, path, target: await createUploadTarget(path, String(file.type).slice(0, 100)) };
  } catch (err) {
    console.error("[portal] upload link failed:", err);
    return { ok: false, error: "We couldn't start that upload. Please try again." };
  }
}

export async function finishUpload(itemId: string, path: string, file: { name: string; size: number; type: string }): Promise<{ ok: boolean }> {
  const project = await getPortalProject();
  if (!project) return { ok: false };
  const item = await getItem(project.id, uuid.parse(itemId));
  if (!item || !path.startsWith(`${project.id}/${item.id}/`)) return { ok: false };
  const size = await storedSize(path);
  if (size === null && storageMode() === "local") return { ok: false };
  await addFile(project.id, item.id, { path, filename: String(file.name).slice(0, 200), size: size ?? (Number(file.size) || 0), contentType: String(file.type).slice(0, 100) });
  tellOwner(project.id, `uploaded files for "${item.label}"`);
  revalidatePath("/portal");
  return { ok: true };
}

export async function clientRemoveFile(fileId: string) {
  const project = await requireClient();
  const file = await getFile(uuid.parse(fileId));
  if (!file || file.project_id !== project.id) return;
  await removeStored(file.storage_path);
  await removeFileRow(file.id);
  revalidatePath("/portal");
}

// ---------- Agreement ----------

export type AgreeState = { error: string };

export async function clientAgree(_prev: AgreeState, formData: FormData): Promise<AgreeState> {
  const project = await requireClient();
  const name = z.string().trim().min(2).max(100).safeParse(formData.get("name"));
  if (!name.success) return { error: "Type your full name to agree." };
  if (formData.get("confirm") !== "on") return { error: "Tick the box to confirm you've read it." };
  if (await recordAgreement(project.id, name.data)) tellOwner(project.id, `agreed to the project agreement as "${name.data}"`);
  revalidatePath("/portal");
  return { error: "" };
}
