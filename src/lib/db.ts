import "server-only";
import postgres from "postgres";

declare global {
  var __rtSql: postgres.Sql | undefined;
}

function connect(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    ssl: local ? false : "require",
    // Supabase's connection pooler does not support prepared statements.
    prepare: false,
    max: 5,
    // Keep calendar dates (like next_follow_up) as "YYYY-MM-DD" strings.
    types: { date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v } },
    onnotice: () => {},
  });
}

/** One shared connection pool per server process. */
export const sql: postgres.Sql = globalThis.__rtSql ?? (globalThis.__rtSql = connect());
