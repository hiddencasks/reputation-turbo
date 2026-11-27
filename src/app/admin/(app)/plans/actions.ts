"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { getOfferings } from "@/lib/offerings";
import {
  addBlankPost,
  addPlanPhoto,
  approveAllDrafts,
  checkPlanConnection,
  createManualPlan,
  deletePost,
  draftMonth,
  endManualPlan,
  getPlan,
  planPhotos,
  publishPostNow,
  removePlanPhoto,
  savePost,
  setPostStatus,
  updatePlanSettings,
} from "@/lib/plans";
import { pacific, safeColor } from "@/lib/plan-schedule";
import { createUploadTarget, MAX_FILE_BYTES, removeStored, storageMode, storagePath, type UploadTarget } from "@/lib/storage";

const uuid = z.string().regex(/^[0-9a-f-]{36}$/);
const page = (id: string) => `/admin/plans/${id}`;
const text = (fd: FormData, k: string, max = 3000) => String(fd.get(k) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

export type ActionState = { ok?: string; error?: string };

/** Starts a plan by hand (paid in cash or check, or given free). */
export async function startManualPlan(formData: FormData) {
  await requireOwner();
  const leadId = uuid.parse(formData.get("leadId"));
  const slug = text(formData, "slug", 80);
  const offering = (await getOfferings()).find((o) => o.slug === slug && o.kind === "plan");
  if (!offering) throw new Error("Pick a plan.");
  const amount = Math.round(Number(text(formData, "amount", 12) || offering.price_cents / 100) * 100);
  const id = await createManualPlan(leadId, offering.slug, offering.name, Number.isFinite(amount) && amount >= 0 ? amount : offering.price_cents);
  revalidatePath(`/admin/leads/${leadId}`);
  redirect(page(id));
}

export async function saveSettings(formData: FormData) {
  await requireOwner();
  const id = uuid.parse(formData.get("planId"));
  const slug = text(formData, "slug", 80);
  const offering = (await getOfferings()).find((o) => o.slug === slug && o.kind === "plan");
  const plan = await getPlan(id);
  if (!plan) throw new Error("Plan not found.");
  await updatePlanSettings(id, {
    slug: offering?.slug ?? plan.slug,
    name: offering?.name ?? plan.name,
    facebookPageId: text(formData, "facebookPageId", 40).replace(/\D/g, ""),
    instagramUserId: text(formData, "instagramUserId", 40).replace(/\D/g, ""),
    brandColor: safeColor(text(formData, "brandColor", 7), plan.brand_color),
    paused: formData.get("paused") === "on",
  });
  revalidatePath(page(id));
}

export async function testConnection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();
  const plan = await getPlan(uuid.parse(formData.get("planId")));
  if (!plan) return { error: "Plan not found." };
  return { ok: (await checkPlanConnection(plan)).join("\n") };
}

export async function endPlan(formData: FormData) {
  await requireOwner();
  const id = uuid.parse(formData.get("planId"));
  await endManualPlan(id);
  revalidatePath(page(id));
}

export async function draftPosts(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();
  const id = uuid.parse(formData.get("planId"));
  const [y, m] = text(formData, "month", 7).split("-").map(Number);
  if (!y || !m) return { error: "Pick a month." };
  try {
    const n = await draftMonth(id, y, m - 1);
    revalidatePath(page(id));
    return { ok: `Drafted ${n} post${n === 1 ? "" : "s"}. Read them over, edit anything, then approve.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't draft posts." };
  }
}

export async function approveAll(formData: FormData) {
  await requireOwner();
  const id = uuid.parse(formData.get("planId"));
  await approveAllDrafts(id);
  revalidatePath(page(id));
}

/** Pacific date and time from <input type="date"> and <input type="time">. */
function whenFrom(formData: FormData): Date {
  const [y, mo, d] = text(formData, "date", 10).split("-").map(Number);
  const [h, mi] = (text(formData, "time", 5) || "10:00").split(":").map(Number);
  if (!y || !mo || !d) throw new Error("Pick a date.");
  return pacific(y, mo - 1, d, h || 0, mi || 0);
}

export async function savePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();
  const planId = uuid.parse(formData.get("planId"));
  const postId = uuid.parse(formData.get("postId"));
  try {
    const plan = await getPlan(planId);
    const photo = text(formData, "photo", 400);
    const allowed = plan ? (await planPhotos(plan)).some((p) => p.path === photo) : false;
    await savePost(planId, postId, {
      publishAt: whenFrom(formData),
      headline: text(formData, "headline", 80),
      subline: text(formData, "subline", 140),
      caption: text(formData, "caption", 2200),
      photoPath: allowed ? photo : "",
    });
    const intent = String(formData.get("intent") ?? "");
    if (intent === "approve") await setPostStatus(planId, postId, "approved");
    revalidatePath(page(planId));
    return { ok: intent === "approve" ? "Saved and approved" : "Saved" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save." };
  }
}

export async function setStatus(formData: FormData) {
  await requireOwner();
  const planId = uuid.parse(formData.get("planId"));
  const status = z.enum(["draft", "approved", "skipped"]).parse(formData.get("status"));
  await setPostStatus(planId, uuid.parse(formData.get("postId")), status);
  revalidatePath(page(planId));
}

export async function removePost(formData: FormData) {
  await requireOwner();
  const planId = uuid.parse(formData.get("planId"));
  await deletePost(planId, uuid.parse(formData.get("postId")));
  revalidatePath(page(planId));
}

export async function addPost(formData: FormData) {
  await requireOwner();
  const planId = uuid.parse(formData.get("planId"));
  const channel = z.enum(["social", "google"]).parse(formData.get("channel"));
  await addBlankPost(planId, channel, whenFrom(formData));
  revalidatePath(page(planId));
}

export async function postNow(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();
  const planId = uuid.parse(formData.get("planId"));
  try {
    const outcomes = await publishPostNow(planId, uuid.parse(formData.get("postId")));
    revalidatePath(page(planId));
    const word = { posted: "posted", failed: "failed", reminded: "emailed to you to paste" } as const;
    return { ok: outcomes.map((o) => `${o.network}: ${word[o.status]}${o.error ? ` (${o.error})` : ""}`).join("\n") || "Nothing to post." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't post." };
  }
}

// ---------- Photos ----------

export type UploadStart = { ok: true; path: string; target: UploadTarget } | { ok: false; error: string };

export async function startPhotoUpload(planId: string, file: { name: string; size: number; type: string }): Promise<UploadStart> {
  await requireOwner();
  const id = uuid.parse(planId);
  if (storageMode() === "off") return { ok: false, error: "Uploads need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel." };
  if (!/^image\/(jpeg|png|webp)$/.test(String(file.type))) return { ok: false, error: `${file.name}: use a JPG, PNG or WebP photo (iPhone photos: share as "Most Compatible").` };
  if (!(file.size > 0) || file.size > MAX_FILE_BYTES) return { ok: false, error: `${file.name} is over 25 MB.` };
  const path = storagePath("plans", id, String(file.name).slice(0, 200));
  try {
    return { ok: true, path, target: await createUploadTarget(path, String(file.type)) };
  } catch (err) {
    console.error("[plans] upload link failed:", err instanceof Error ? err.message.slice(0, 300) : "unknown error");
    return { ok: false, error: "Couldn't start that upload. Try again." };
  }
}

export async function finishPhotoUpload(planId: string, path: string, name: string): Promise<{ ok: boolean }> {
  await requireOwner();
  const id = uuid.parse(planId);
  if (!path.startsWith(`plans/${id}/`)) return { ok: false };
  await addPlanPhoto(id, path, String(name).slice(0, 200));
  revalidatePath(page(id));
  return { ok: true };
}

export async function deletePhoto(formData: FormData) {
  await requireOwner();
  const planId = uuid.parse(formData.get("planId"));
  const path = await removePlanPhoto(planId, uuid.parse(formData.get("photoId")));
  if (path) await removeStored(path).catch(() => {});
  revalidatePath(page(planId));
}
