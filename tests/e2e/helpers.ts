import postgres from "postgres";
import { readFileSync } from "node:fs";

function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1) : "";
}

export const db = postgres(env("DATABASE_URL"), { max: 1, onnotice: () => {} });

export async function resetData() {
  await db`truncate leads, activities, emails, suppressions cascade`;
  await db`update settings set value = 'false' where key = 'show_prices'`;
  await db`update offerings set price_cents = 149700 where slug = 'business-website-launch'`;
}

export const ADMIN_EMAIL = env("ADMIN_EMAIL");
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "test-password-123";
