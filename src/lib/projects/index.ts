import "server-only";
import { sql } from "../db";
import { intakeFor, stepsFor, type IntakeKind, type StepStatus } from "./template";

export type ClientProject = {
  id: string;
  lead_id: string;
  package: string;
  portal_token: string;
  portal_email: string;
  invited_at: Date | null;
  client_seen_at: Date | null;
  owner_notified_at: Date | null;
  reminder_count: number;
  reminded_at: Date | null;
  delivered_at: Date | null;
  agreement_text: string;
  agreement_sent_at: Date | null;
  agreed_at: Date | null;
  agreed_name: string;
  created_at: Date;
  updated_at: Date;
};

export type ProjectWithLead = ClientProject & {
  business_name: string;
  first_name: string;
  last_name: string;
  email: string;
  quote_amount_cents: number | null;
};

export type ProjectStep = {
  id: string;
  project_id: string;
  position: number;
  phase: string;
  title: string;
  who: string;
  detail: string;
  status: StepStatus;
  started_at: Date | null;
  done_at: Date | null;
  wait_minutes: number;
  waiting_since: Date | null;
  notes: string;
};

export type TimeEntry = {
  id: string;
  step_id: string;
  project_id: string;
  started_at: Date;
  ended_at: Date | null;
  manual_minutes: number | null;
  note: string;
  created_at: Date;
};

export type IntakeItem = {
  id: string;
  project_id: string;
  position: number;
  section: string;
  kind: IntakeKind;
  label: string;
  help: string;
  answer: string;
  done_at: Date | null;
  done_by: string;
  updated_at: Date;
};

export type IntakeFile = {
  id: string;
  item_id: string;
  project_id: string;
  storage_path: string;
  filename: string;
  size_bytes: number;
  content_type: string;
  created_at: Date;
};

/** False until db/updates/2026-11-client-portal.sql has been run. */
export async function projectsReady(): Promise<boolean> {
  try {
    const [row] = await sql<{ ok: boolean }[]>`select to_regclass('public.client_projects') is not null as ok`;
    return Boolean(row?.ok);
  } catch (err) {
    console.error("[projects] could not check for the table:", err);
    return false;
  }
}

const withLead = sql`
  select p.*, l.business_name, l.first_name, l.last_name, l.email, l.quote_amount_cents
  from client_projects p join leads l on l.id = p.lead_id`;

export async function getProject(id: string): Promise<ProjectWithLead | null> {
  const [row] = await sql<ProjectWithLead[]>`${withLead} where p.id = ${id}`;
  return row ?? null;
}

export async function getProjectForLead(leadId: string): Promise<ClientProject | null> {
  const [row] = await sql<ClientProject[]>`select * from client_projects where lead_id = ${leadId}`;
  return row ?? null;
}

export async function getProjectByToken(token: string): Promise<ProjectWithLead | null> {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const [row] = await sql<ProjectWithLead[]>`${withLead} where p.portal_token = ${token}`;
  return row ?? null;
}

export async function listProjects(): Promise<(ProjectWithLead & { steps_total: number; steps_done: number; running: boolean; intake_total: number; intake_done: number })[]> {
  return sql`
    select p.*, l.business_name, l.first_name, l.last_name, l.email,
      (select count(*)::int from project_steps s where s.project_id = p.id) as steps_total,
      (select count(*)::int from project_steps s where s.project_id = p.id and s.status = 'done') as steps_done,
      exists (select 1 from time_entries t where t.project_id = p.id and t.ended_at is null) as running,
      (select count(*)::int from intake_items i where i.project_id = p.id) as intake_total,
      (select count(*)::int from intake_items i where i.project_id = p.id and i.done_at is not null) as intake_done
    from client_projects p join leads l on l.id = p.lead_id
    order by p.delivered_at is not null, p.created_at desc`;
}

export async function getSteps(projectId: string): Promise<ProjectStep[]> {
  return sql<ProjectStep[]>`select * from project_steps where project_id = ${projectId} order by position`;
}

export async function getTimeEntries(projectId: string): Promise<TimeEntry[]> {
  return sql<TimeEntry[]>`select * from time_entries where project_id = ${projectId} order by started_at`;
}

export async function getIntake(projectId: string): Promise<{ items: IntakeItem[]; files: IntakeFile[] }> {
  const [items, files] = await Promise.all([
    sql<IntakeItem[]>`select * from intake_items where project_id = ${projectId} order by position`,
    sql<IntakeFile[]>`select * from intake_files where project_id = ${projectId} order by created_at`,
  ]);
  return { items, files: files.map((f) => ({ ...f, size_bytes: Number(f.size_bytes) })) };
}

/** Creates the project with the standard steps and intake checklist for its package. */
export async function createProject(leadId: string, packageName: string, email: string): Promise<string> {
  return sql.begin(async (tx) => {
    const [existing] = await tx<{ id: string }[]>`select id from client_projects where lead_id = ${leadId}`;
    if (existing) return existing.id;
    const [project] = await tx<{ id: string }[]>`
      insert into client_projects (lead_id, package, portal_email) values (${leadId}, ${packageName}, ${email}) returning id`;
    const steps = stepsFor(packageName);
    for (const [i, s] of steps.entries()) {
      await tx`
        insert into project_steps (project_id, position, phase, title, who, detail)
        values (${project.id}, ${i + 1}, ${s.phase}, ${s.title}, ${s.who}, ${s.detail})`;
    }
    for (const [i, item] of intakeFor(packageName).entries()) {
      await tx`
        insert into intake_items (project_id, position, section, kind, label, help)
        values (${project.id}, ${i + 1}, ${item.section}, ${item.kind}, ${item.label}, ${item.help})`;
    }
    await tx`
      insert into activities (lead_id, kind, body)
      values (${leadId}, 'project', ${`Client project started: ${packageName || "no package set"}.`})`;
    return project.id;
  });
}

// ---------- Steps and timers ----------

/** Moves a step to a new status, keeping the wait clock and dates in step. */
export async function setStepStatus(stepId: string, status: StepStatus): Promise<void> {
  await sql.begin(async (tx) => {
    const [step] = await tx<ProjectStep[]>`select * from project_steps where id = ${stepId} for update`;
    if (!step || step.status === status) return;
    const leavingWait = step.status === "waiting" && step.waiting_since;
    const waited = leavingWait ? Math.round((Date.now() - step.waiting_since!.getTime()) / 60_000) : 0;
    await tx`
      update project_steps set
        status = ${status},
        wait_minutes = wait_minutes + ${waited},
        waiting_since = ${status === "waiting" ? new Date() : null},
        started_at = coalesce(started_at, ${status === "not_started" ? null : new Date()}),
        done_at = ${status === "done" ? new Date() : null}
      where id = ${stepId}`;
    if (status === "done" || status === "not_started") {
      await tx`update time_entries set ended_at = now() where step_id = ${stepId} and ended_at is null`;
    }
    await tx`update client_projects set updated_at = now() where id = ${step.project_id}`;
  });
}

/** Starts the timer on a step. Any other running timer in the project stops first. */
export async function startTimer(stepId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [step] = await tx<ProjectStep[]>`select * from project_steps where id = ${stepId} for update`;
    if (!step) throw new Error("Step not found");
    await tx`update time_entries set ended_at = now() where project_id = ${step.project_id} and ended_at is null`;
    await tx`insert into time_entries (step_id, project_id) values (${stepId}, ${step.project_id})`;
    if (step.status === "not_started" || step.status === "done") {
      await tx`update project_steps set status = 'in_progress', started_at = coalesce(started_at, now()), done_at = null where id = ${stepId}`;
    } else if (step.status === "waiting") {
      // Working on it again: close the wait.
      const waited = step.waiting_since ? Math.round((Date.now() - step.waiting_since.getTime()) / 60_000) : 0;
      await tx`update project_steps set status = 'in_progress', wait_minutes = wait_minutes + ${waited}, waiting_since = null where id = ${stepId}`;
    }
  });
}

export async function stopTimer(stepId: string): Promise<void> {
  await sql`update time_entries set ended_at = now() where step_id = ${stepId} and ended_at is null`;
}

export async function addManualTime(stepId: string, minutes: number, note: string): Promise<void> {
  const [step] = await sql<ProjectStep[]>`select * from project_steps where id = ${stepId}`;
  if (!step) throw new Error("Step not found");
  await sql`
    insert into time_entries (step_id, project_id, manual_minutes, note, ended_at)
    values (${stepId}, ${step.project_id}, ${minutes}, ${note}, now())`;
  if (step.status === "not_started") {
    await sql`update project_steps set status = 'in_progress', started_at = coalesce(started_at, now()) where id = ${stepId}`;
  }
}

export async function deleteTimeEntry(entryId: string): Promise<void> {
  await sql`delete from time_entries where id = ${entryId}`;
}

export async function setStepNotes(stepId: string, notes: string): Promise<void> {
  await sql`update project_steps set notes = ${notes} where id = ${stepId}`;
}

// ---------- Intake ----------

export async function getItem(projectId: string, itemId: string): Promise<IntakeItem | null> {
  const [row] = await sql<IntakeItem[]>`select * from intake_items where id = ${itemId} and project_id = ${projectId}`;
  return row ?? null;
}

export async function saveAnswer(projectId: string, itemId: string, answer: string, by: "client" | "owner"): Promise<void> {
  // A written answer completes an "answer" item. On uploads and account steps the text is just a note.
  const done = answer.trim().length > 0;
  await sql`
    update intake_items set
      answer = ${answer},
      done_at = case when kind <> 'answer' then done_at when ${done} then coalesce(done_at, now()) else null end,
      done_by = case when kind <> 'answer' then done_by when ${done} then ${by} else '' end,
      updated_at = now()
    where id = ${itemId} and project_id = ${projectId}`;
}

export async function setItemDone(projectId: string, itemId: string, done: boolean, by: "client" | "owner"): Promise<void> {
  await sql`
    update intake_items set
      done_at = ${done ? sql`coalesce(done_at, now())` : null},
      done_by = ${done ? by : ""},
      updated_at = now()
    where id = ${itemId} and project_id = ${projectId}`;
}

export async function addFile(projectId: string, itemId: string, file: { path: string; filename: string; size: number; contentType: string }): Promise<void> {
  await sql`
    insert into intake_files (item_id, project_id, storage_path, filename, size_bytes, content_type)
    values (${itemId}, ${projectId}, ${file.path}, ${file.filename}, ${file.size}, ${file.contentType})
    on conflict (storage_path) do nothing`;
  await sql`update intake_items set updated_at = now() where id = ${itemId}`;
}

export async function getFile(fileId: string): Promise<IntakeFile | null> {
  const [row] = await sql<IntakeFile[]>`select * from intake_files where id = ${fileId}`;
  return row ? { ...row, size_bytes: Number(row.size_bytes) } : null;
}

export async function removeFileRow(fileId: string): Promise<void> {
  await sql`delete from intake_files where id = ${fileId}`;
}

export async function markClientSeen(projectId: string): Promise<void> {
  await sql`update client_projects set client_seen_at = now() where id = ${projectId}`;
}

export async function rotatePortalToken(projectId: string): Promise<void> {
  await sql`update client_projects set portal_token = encode(gen_random_bytes(24), 'hex'), updated_at = now() where id = ${projectId}`;
}

// ---------- Agreement ----------

/** False until db/updates/2026-11-client-agreement.sql has been run. */
export async function agreementReady(): Promise<boolean> {
  try {
    const [row] = await sql<{ ok: boolean }[]>`
      select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'client_projects' and column_name = 'agreement_text') as ok`;
    return Boolean(row?.ok);
  } catch {
    return false;
  }
}

/** Saves the agreement as sent. A new version clears an earlier "I agree". */
export async function saveAgreement(projectId: string, text: string): Promise<void> {
  await sql`
    update client_projects set
      agreed_at = case when agreement_text = ${text} then agreed_at else null end,
      agreed_name = case when agreement_text = ${text} then agreed_name else '' end,
      agreement_text = ${text},
      agreement_sent_at = now(),
      updated_at = now()
    where id = ${projectId}`;
}

/** Records the client's "I agree" and completes the agreement step. False if already agreed. */
export async function recordAgreement(projectId: string, name: string): Promise<boolean> {
  const [row] = await sql<{ lead_id: string }[]>`
    update client_projects set agreed_at = now(), agreed_name = ${name}, updated_at = now()
    where id = ${projectId} and agreed_at is null and agreement_text <> ''
    returning lead_id`;
  if (!row) return false;
  await sql`insert into activities (lead_id, kind, body) values (${row.lead_id}, 'project', ${`Agreed to the project agreement as "${name}".`})`;
  const [step] = await sql<{ id: string }[]>`
    select id from project_steps where project_id = ${projectId} and title = 'Welcome email and agreement' and status <> 'done'`;
  if (step) await setStepStatus(step.id, "done");
  return true;
}
