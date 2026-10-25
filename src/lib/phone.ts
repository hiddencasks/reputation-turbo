/** Formats US digits as (619) 555-0123 while typing. Anything else, like +44 numbers, is left as typed. */
export function formatPhone(input: string): string {
  if (input.trim().startsWith("+")) return input;
  const d = phoneDigits(input);
  if (d.length === 0 || d.length > 10) return input;
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Digits only, without a leading US country code. */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}
