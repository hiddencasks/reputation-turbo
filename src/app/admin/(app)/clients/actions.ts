"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  addManualTime,
  createProject,
  deleteTimeEntry,
  getFile,
  getProject,
  removeFileRow,
  rotatePortalToken,
  saveAnswer,
  setItemDone,
  setStepNotes,
  setStepStatus,
  startTimer,
  stopTimer,
} from "@/lib/projects";
import { parseMinutes, STEP_STATUSES } from "@/lib/projects/template";
import { sendPortalInvite } from "@/lib/portal-emails";
import { removeStored } from "@/lib/storage";
import { stageLabel } from "@/lib/stages";

const uuid = z.string().regex(/^[0-9a-f-]{36}$/);

async function projectOfStep(stepId: string): Promise<string> {
  const [row] = await sql<{ project_id: string }[]>`select project_id from project_steps where id = ${uuid.parse(stepId)}`;
  if (!row) throw new Error("Step not found");
  return row.project_id;
}

const refresh = (projectId: string) => {
  revalidatePath(`/admin/clients/${projectId}`);
  revalidatePath("/admin/clients");
};

export async function startClientProject(leadId: string, formData: FormData) {
  await requireOwner();
  const pkg = z.string().trim().max(120).parse(formData.get("package") ?? "");
  const email = z.string().trim().max(200).parse(formData.get("email") ?? "");
  const [lead] = await sql<{ stage: string }[]>`select stage from leads where id = ${uuid.parse(leadId)}`;
  if (!lead) throw new Error("Lead not found");
  const id = await createProject(leadId, pkg, email);
  if (lead.stage !== "won") {
    await sql`update leads set stage = 'won', updated_at = now() where id = ${leadId}`;
    await sql`insert into activities (lead_id, kind, body) values (${leadId}, 'stage_change', ${`Stage changed from ${stageLabel(lead.stage)} to Won.`})`;
  }
  revalidatePath(`/admin/leads/${leadId}`);
  redirect(`/admin/clients/${id}`);
}

export async function changeStepStatus(stepId: string, formData: FormData) {
  await requireOwner();
  const status = z.enum(STEP_STATUSES.map((s) => s.id) as [string, ...string[]]).parse(formData.get("status"));
  const projectId = await projectOfStep(stepId);
  await setStepStatus(stepId, status as (typeof STEP_STATUSES)[number]["id"]);
  refresh(projectId);
}

export async function startStepTimer(stepId: string) {
  await requireOwner();
  const projectId = await projectOfStep(stepId);
  await startTimer(stepId);
  refresh(projectId);
}

export async function stopStepTimer(stepId: string) {
  await requireOwner();
  const projectId = await projectOfStep(stepId);
  await stopTimer(stepId);
  refresh(projectId);
}

export type TimeFormState = { error: string };

export async function addStepTime(stepId: string, _prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  await requireOwner();
  const minutes = parseMinutes(String(formData.get("minutes") ?? ""));
  if (minutes == null || minutes <= 0 || minutes > 24 * 60) return { error: "Enter time like 45, 1:30 or 1h 30m." };
  const note = z.string().trim().max(300).parse(formData.get("note") ?? "");
  const projectId = await projectOfStep(stepId);
  await addManualTime(stepId, minutes, note);
  refresh(projectId);
  return { error: "" };
}

export async function removeTimeEntry(entryId: string) {
  await requireOwner();
  const [row] = await sql<{ project_id: string }[]>`select project_id from time_entries where id = ${uuid.parse(entryId)}`;
  if (!row) return;
  await deleteTimeEntry(entryId);
  refresh(row.project_id);
}

export async function saveStepNotes(stepId: string, formData: FormData) {
  await requireOwner();
  const notes = z.string().max(4000).parse(formData.get("notes") ?? "");
  const projectId = await projectOfStep(stepId);
  await setStepNotes(stepId, notes);
  refresh(projectId);
}

export async function inviteToPortal(projectId: string, formData: FormData) {
  await requireOwner();
  const email = z.string().trim().email("Enter the client's email address").max(200).parse(formData.get("email"));
  await sql`update client_projects set portal_email = ${email}, updated_at = now() where id = ${uuid.parse(projectId)}`;
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");
  await sendPortalInvite(project);
  refresh(projectId);
}

export async function resetPortalLink(projectId: string) {
  await requireOwner();
  await rotatePortalToken(uuid.parse(projectId));
  refresh(projectId);
}

export async function ownerSaveAnswer(projectId: string, itemId: string, formData: FormData) {
  await requireOwner();
  const answer = z.string().max(5000).parse(formData.get("answer") ?? "");
  await saveAnswer(uuid.parse(projectId), uuid.parse(itemId), answer, "owner");
  refresh(projectId);
}

export async function ownerSetItemDone(projectId: string, itemId: string, formData: FormData) {
  await requireOwner();
  await setItemDone(uuid.parse(projectId), uuid.parse(itemId), formData.get("done") === "true", "owner");
  refresh(projectId);
}

export async function ownerRemoveFile(fileId: string) {
  await requireOwner();
  const file = await getFile(uuid.parse(fileId));
  if (!file) return;
  await removeStored(file.storage_path);
  await removeFileRow(file.id);
  refresh(file.project_id);
}

export async function setDelivered(projectId: string, formData: FormData) {
  await requireOwner();
  const delivered = formData.get("delivered") === "true";
  await sql`update client_projects set delivered_at = ${delivered ? new Date() : null}, updated_at = now() where id = ${uuid.parse(projectId)}`;
  if (delivered) await sql`update time_entries set ended_at = now() where project_id = ${projectId} and ended_at is null`;
  refresh(projectId);
}
