import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// Private file storage for client uploads.
// On the live site: Supabase Storage (bucket "client-files"). The browser uploads
// straight to Supabase with a one-time signed link, so big phone photos never pass
// through our server. Locally (no Supabase keys, not on Vercel): files go in .data/.

export const BUCKET = "client-files";
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const rawUrl = () => (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
/** The project address, only when it really is one (a key pasted into the wrong box must never end up in a request or a log). */
const supabaseUrl = () => (/^https:\/\/[a-z0-9.-]+$/i.test(rawUrl()) ? rawUrl() : "");
const serviceKey = () => (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

export function storageMode(): "supabase" | "local" | "off" {
  if (supabaseUrl() && serviceKey()) return "supabase";
  if (!process.env.VERCEL && !rawUrl()) return "local";
  return "off";
}

/** Plain-language setup problem for the dashboard, or "" when uploads are ready. Never includes the values. */
export function storageProblem(): string {
  if (storageMode() !== "off") return "";
  if (rawUrl() && !supabaseUrl()) return "SUPABASE_URL in Vercel isn't a web address. It should be your Supabase Project URL, like https://abcdefgh.supabase.co (not a key).";
  if (!serviceKey()) return "SUPABASE_SERVICE_ROLE_KEY is missing in Vercel. Add your Supabase secret key.";
  return "File uploads need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.";
}

function authHeaders(): Record<string, string> {
  const key = serviceKey();
  // New-style secret keys (sb_secret_...) go only in "apikey"; older service_role JWTs go in both.
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

/** A safe, unique storage path like "<project>/<item>/1732400000-ab12cd-photo.jpg". */
export function storagePath(projectId: string, itemId: string, filename: string): string {
  const clean = filename.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+/, "").slice(-80) || "file";
  return `${projectId}/${itemId}/${Date.now()}-${randomBytes(3).toString("hex")}-${clean}`;
}

export type UploadTarget = { url: string; method: "PUT"; headers: Record<string, string> };

/** Where the browser should send the file. */
export async function createUploadTarget(objectPath: string, contentType: string): Promise<UploadTarget> {
  const mode = storageMode();
  if (mode === "supabase") {
    const res = await fetch(`${supabaseUrl()}/storage/v1/object/upload/sign/${BUCKET}/${encodePath(objectPath)}`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`Storage refused the upload link (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const { url } = (await res.json()) as { url: string };
    return { url: `${supabaseUrl()}/storage/v1${url}`, method: "PUT", headers: { "Content-Type": contentType || "application/octet-stream", "x-upsert": "false" } };
  }
  if (mode === "local") {
    const sig = sign(objectPath);
    return { url: `/portal/upload?path=${encodeURIComponent(objectPath)}&sig=${sig}`, method: "PUT", headers: { "Content-Type": contentType || "application/octet-stream" } };
  }
  throw new Error("File uploads aren't set up yet.");
}

/** Size of a stored file, or null when it isn't there. */
export async function storedSize(objectPath: string): Promise<number | null> {
  const mode = storageMode();
  if (mode === "supabase") {
    const res = await fetch(`${supabaseUrl()}/storage/v1/object/info/${BUCKET}/${encodePath(objectPath)}`, { headers: authHeaders() });
    if (!res.ok) return null;
    const info = (await res.json().catch(() => ({}))) as { size?: number; metadata?: { size?: number } };
    return Number(info.size ?? info.metadata?.size ?? 0);
  }
  if (mode === "local") {
    try {
      return (await stat(localFile(objectPath))).size;
    } catch {
      return null;
    }
  }
  return null;
}

/** A short-lived download link for the dashboard. Local mode returns null (the file is streamed instead). */
export async function downloadUrl(objectPath: string, filename: string): Promise<string | null> {
  if (storageMode() !== "supabase") return null;
  const res = await fetch(`${supabaseUrl()}/storage/v1/object/sign/${BUCKET}/${encodePath(objectPath)}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!res.ok) throw new Error(`Storage refused the download link (${res.status})`);
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${supabaseUrl()}/storage/v1${signedURL}&download=${encodeURIComponent(filename)}`;
}

export async function removeStored(objectPath: string): Promise<void> {
  const mode = storageMode();
  if (mode === "supabase") {
    await fetch(`${supabaseUrl()}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [objectPath] }),
    });
  } else if (mode === "local") {
    await rm(localFile(objectPath), { force: true });
  }
}

// ---------- Local development storage ----------

function localFile(objectPath: string): string {
  const root = path.resolve(process.cwd(), ".data", BUCKET);
  const full = path.resolve(root, objectPath);
  if (!full.startsWith(root + path.sep)) throw new Error("Bad path");
  return full;
}

function sign(objectPath: string): string {
  return createHmac("sha256", `${process.env.SESSION_SECRET ?? ""}:local-upload`).update(objectPath).digest("hex");
}

export function verifyLocalSignature(objectPath: string, sig: string): boolean {
  const expected = Buffer.from(sign(objectPath));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function writeLocal(objectPath: string, data: Buffer): Promise<void> {
  const file = localFile(objectPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data, { flag: "wx" });
}

export async function readLocal(objectPath: string): Promise<Buffer> {
  return readFile(localFile(objectPath));
}

function encodePath(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}
