import "server-only";
import { sql } from "./db";
import { phoneDigits } from "./validation";
import type { StageId } from "./stages";

export type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone: string;
  website_url: string;
  source: string;
  stage: StageId;
  next_follow_up: string | null;
  recommended_package: string;
  quote_amount_cents: number | null;
  trade: string;
  city: string;
  ai_monitoring: boolean;
  created_at: Date;
  updated_at: Date;
};

export type LeadInput = {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  website?: string;
  trade?: string;
  city?: string;
  source: "audit_form" | "ai_search" | "contact_form" | "outreach" | "geo_quiz";
  stage: StageId;
  note: string;
  meta?: Record<string, unknown>;
};

/**
 * Creates a lead, or updates the existing one when the email or phone number
 * matches. Existing values are only filled in, never overwritten with blanks,
 * and a lead already marked Do Not Contact keeps that stage.
 */
export async function upsertLead(input: LeadInput): Promise<{ lead: Lead; duplicate: boolean }> {
  const digits = phoneDigits(input.phone);
  return sql.begin(async (tx) => {
    const [existing] = await tx<Lead[]>`
      select * from leads
      where (${input.email} <> '' and lower(email) = ${input.email.toLowerCase()})
         or (${digits} <> '' and phone_digits = ${digits})
      order by created_at
      limit 1
      for update`;

    let lead: Lead;
    if (existing) {
      const keepStage = existing.stage !== "new_prospect" && existing.stage !== "lost";
      [lead] = await tx<Lead[]>`
        update leads set
          first_name = coalesce(nullif(${input.firstName}, ''), first_name),
          last_name = coalesce(nullif(${input.lastName}, ''), last_name),
          business_name = coalesce(nullif(${input.businessName}, ''), business_name),
          email = coalesce(nullif(email, ''), ${input.email}),
          phone = coalesce(nullif(phone, ''), ${input.phone}),
          phone_digits = coalesce(nullif(phone_digits, ''), ${digits}),
          website_url = coalesce(nullif(${input.website ?? ""}, ''), website_url),
          trade = coalesce(nullif(${input.trade ?? ""}, ''), trade),
          city = coalesce(nullif(${input.city ?? ""}, ''), city),
          stage = ${keepStage ? existing.stage : input.stage},
          updated_at = now()
        where id = ${existing.id}
        returning *`;
    } else {
      [lead] = await tx<Lead[]>`
        insert into leads (first_name, last_name, business_name, email, phone, phone_digits, website_url, trade, city, source, stage)
        values (${input.firstName}, ${input.lastName}, ${input.businessName}, ${input.email}, ${input.phone},
                ${digits}, ${input.website ?? ""}, ${input.trade ?? ""}, ${input.city ?? ""}, ${input.source}, ${input.stage})
        returning *`;
    }

    await tx`
      insert into activities (lead_id, kind, body, meta)
      values (${lead.id}, ${input.source}, ${input.note},
              ${tx.json({ ...(input.meta ?? {}), duplicate: Boolean(existing) } as never)})`;

    return { lead, duplicate: Boolean(existing) };
  });
}

/** Counts recent form submissions from one visitor fingerprint, for rate limiting. */
export async function recentSubmissions(ipHash: string, minutes: number): Promise<number> {
  const [row] = await sql<{ count: number }[]>`
    select count(*)::int as count from activities
    where meta->>'ipHash' = ${ipHash}
      and created_at > now() - make_interval(mins => ${minutes})`;
  return row.count;
}

export async function isSuppressed(email: string): Promise<boolean> {
  const [row] = await sql`select 1 from suppressions where email = ${email.toLowerCase()}`;
  return Boolean(row);
}
