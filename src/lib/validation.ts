import { z } from "zod";

/** Digits only, without a leading US country code. */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** Adds https:// when missing; returns "" for blank input and null when it is not a usable web address. */
export function normalizeWebsite(input: string): string | null {
  const value = input.trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const text = (max: number) => z.string().trim().max(max);
const required = (label: string, max = 100) => text(max).min(1, `Please enter your ${label}.`);

const phone = z
  .string()
  .trim()
  .refine((v) => phoneDigits(v).length === 10, "Please enter a 10-digit phone number.");

const email = z.string().trim().toLowerCase().max(200).email("Please enter a valid email address.");

const website = z
  .string()
  .default("")
  .transform((v, ctx) => {
    const normalized = normalizeWebsite(v);
    if (normalized === null) {
      ctx.addIssue({ code: "custom", message: "Please enter a website address like yourbusiness.com, or leave it blank." });
      return z.NEVER;
    }
    return normalized;
  });

export const auditRequestSchema = z.object({
  firstName: required("first name", 60),
  lastName: required("last name", 60),
  businessName: required("business name", 120),
  phone,
  email,
  website,
});

export const contactSchema = z.object({
  firstName: required("first name", 60),
  lastName: text(60).default(""),
  businessName: text(120).default(""),
  phone: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || phoneDigits(v).length === 10, "Please enter a 10-digit phone number."),
  email,
  message: required("message", 3000),
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;
export type ContactRequest = z.infer<typeof contactSchema>;

export type FieldErrors = Partial<Record<string, string>>;

export function firstErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
