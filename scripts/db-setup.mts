// Creates the tables and loads the starting offerings.
// Usage: DATABASE_URL=... npm run db:setup
import postgres from "postgres";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = path.join(process.cwd(), "db");

await sql.file(path.join(dir, "schema.sql"));
await sql.file(path.join(dir, "seed.sql"));
console.log("Database is ready.");
await sql.end();
