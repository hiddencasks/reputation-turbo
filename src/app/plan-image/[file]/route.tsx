import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getPost } from "@/lib/plans";
import { safeColor } from "@/lib/plan-schedule";
import { readStored } from "@/lib/storage";

// The image for one client post: its headline over the client's photo (or their brand color).
// Served as a JPEG because Instagram only accepts JPEG photos. Meta fetches it when posting,
// so it has to be public; post ids are random and unguessable.
//   /plan-image/<postId>.jpg         1080 x 1350 (4:5) for Facebook and Instagram
//   /plan-image/<postId>.google.jpg  1200 x 900 (4:3) for the Google profile

export const runtime = "nodejs";

const cwd = process.cwd();
const fonts = Promise.all([
  readFile(join(cwd, "src/assets/fonts/BarlowCondensed-ExtraBold.ttf")),
  readFile(join(cwd, "src/assets/fonts/Barlow-SemiBold.ttf")),
  readFile(join(cwd, "src/assets/fonts/Barlow-Medium.ttf")),
]);

const ID = /^([0-9a-f-]{36})(\.google)?\.jpg$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const match = ID.exec((await params).file);
  const post = match ? await getPost(match[1]).catch(() => null) : null;
  if (!match || !post) return new Response("Not found", { status: 404 });

  const google = Boolean(match[2]);
  const W = google ? 1200 : 1080;
  const H = google ? 900 : 1350;
  const color = safeColor(post.brand_color);
  const source = post.photo_path ? await readStored(post.photo_path).catch(() => null) : null;
  const photo = source
    ? `data:image/jpeg;base64,${(await sharp(source).rotate().resize(W, H, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer()).toString("base64")}`
    : null;
  const [heading, bodySemi, bodyMedium] = await fonts;
  const headline = post.headline.trim();
  const size = (google ? 0.9 : 1) * (headline.length > 60 ? 84 : headline.length > 36 ? 100 : 120);

  const png = new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", background: color, fontFamily: "Body" }}>
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={photo} width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.82) 100%)" }} />
          </>
        ) : null}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, justifyContent: photo ? "flex-end" : "center", padding: google ? "60px 72px 0" : "90px 84px 0" }}>
          <div style={{ display: "flex", width: 120, height: 14, background: photo ? color : "rgba(255,255,255,0.9)", marginBottom: 36, borderRadius: 4 }} />
          {headline ? <div style={{ display: "flex", fontFamily: "Heading", fontSize: size, lineHeight: 1.02, textTransform: "uppercase", color: "white" }}>{headline}</div> : null}
          {post.subline ? <div style={{ display: "flex", marginTop: 30, fontSize: google ? 40 : 46, lineHeight: 1.3, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{post.subline}</div> : null}
        </div>
        <div style={{ position: "relative", display: "flex", padding: google ? "36px 72px 48px" : "48px 84px 64px", fontSize: 36, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>
          {post.business_name}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Heading", data: heading, weight: 800, style: "normal" },
        { name: "Body", data: bodySemi, weight: 600, style: "normal" },
        { name: "Body", data: bodyMedium, weight: 500, style: "normal" },
      ],
    },
  );

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
}
