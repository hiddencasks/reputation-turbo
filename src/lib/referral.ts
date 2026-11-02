// Where a visitor came from, set by links we share: ?from=instagram-dm etc.
// Links sent by the comment-to-DM automations carry these, so the dashboard
// shows which leads came from a social post.
export const referrals = {
  "instagram-dm": "Instagram DM",
  "facebook-dm": "Facebook DM",
  instagram: "Instagram",
  facebook: "Facebook",
} as const;

export type Referral = keyof typeof referrals;

/** The known referral in a query or form value, or undefined. */
export function parseReferral(value: unknown): Referral | undefined {
  return typeof value === "string" && value in referrals ? (value as Referral) : undefined;
}

/** " Came from: Instagram DM." for a lead note, or "" when unknown. */
export function referralNote(value: unknown): string {
  const r = parseReferral(value);
  return r ? ` Came from: ${referrals[r]}.` : "";
}
