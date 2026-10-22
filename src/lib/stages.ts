export const STAGES = [
  { id: "new_prospect", label: "New Prospect" },
  { id: "audit_in_progress", label: "Audit In Progress" },
  { id: "audit_ready", label: "Audit Ready" },
  { id: "contacted", label: "Contacted" },
  { id: "audit_delivered", label: "Audit Delivered" },
  { id: "follow_up_due", label: "Follow-Up Due" },
  { id: "interested", label: "Interested" },
  { id: "consultation_scheduled", label: "Consultation Scheduled" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "do_not_contact", label: "Do Not Contact" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export const STAGE_IDS = STAGES.map((s) => s.id) as [StageId, ...StageId[]];

export function stageLabel(id: string): string {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}
