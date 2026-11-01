import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getSocialPost, type SocialCard } from "@/lib/social";

// The image for one Facebook and Instagram post, drawn from its card text.
// Served as a JPEG because Instagram only accepts JPEG photos.
// 1080 x 1350 (4:5) shows full size in both feeds.

export const runtime = "nodejs";

const W = 1080;
const H = 1350;
const navy = "#061b3e";
const navy800 = "#0c2a5c";
const orange = "#ff6500";

const assets = Promise.all([
  readFile(join(process.cwd(), "src/assets/fonts/BarlowCondensed-ExtraBold.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/Barlow-SemiBold.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/Barlow-Medium.ttf")),
  readFile(join(process.cwd(), "public/brand/logo-full-white.png")),
]);

function Statement({ card }: { card: Extract<SocialCard, { layout: "statement" }> }) {
  const long = card.headline.length > 48;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: long ? 88 : 104, lineHeight: 1.02, fontFamily: "Heading", textTransform: "uppercase", color: "white" }}>
        {card.headline}
      </div>
      {card.subline ? (
        <div style={{ display: "flex", marginTop: 44, fontSize: 44, lineHeight: 1.3, color: "rgba(255,255,255,0.82)", fontFamily: "Body", fontWeight: 500 }}>
          {card.subline}
        </div>
      ) : null}
    </div>
  );
}

function Compare({ card }: { card: Extract<SocialCard, { layout: "compare" }> }) {
  const column = (side: { title: string; points: string[] }, good: boolean) => (
    <div
      style={{
        display: "flex", flexDirection: "column", flex: 1, padding: "36px 34px", borderRadius: 22,
        background: good ? "white" : navy800, border: good ? `6px solid ${orange}` : "6px solid rgba(255,255,255,0.15)",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Heading", fontSize: 52, textTransform: "uppercase", color: good ? navy : "white" }}>{side.title}</div>
      {side.points.map((p) => (
        <div key={p} style={{ display: "flex", alignItems: "flex-start", marginTop: 24, fontSize: 34, lineHeight: 1.25, fontFamily: "Body", fontWeight: 600, color: good ? navy : "rgba(255,255,255,0.8)" }}>
          <div style={{ display: "flex", width: 40, flexShrink: 0, paddingTop: 13 }}>
            <div style={{ display: "flex", width: 16, height: 16, borderRadius: 999, background: good ? orange : "rgba(255,255,255,0.35)" }} />
          </div>
          <div style={{ display: "flex", flex: 1 }}>{p}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: 92, lineHeight: 1.02, fontFamily: "Heading", textTransform: "uppercase", color: "white" }}>{card.headline}</div>
      <div style={{ display: "flex", gap: 28, marginTop: 50 }}>
        {column(card.left, false)}
        {column(card.right, true)}
      </div>
    </div>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const post = file.endsWith(".jpg") ? getSocialPost(file.slice(0, -4)) : undefined;
  if (!post) return new Response("Not found", { status: 404 });

  const [heading, bodySemi, bodyMedium, logo] = await assets;
  const card = post.card;
  const png = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: navy, fontFamily: "Body" }}>
        <div style={{ display: "flex", height: 18, background: orange }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "90px 84px 0", justifyContent: "center" }}>
          <div style={{ display: "flex", alignSelf: "flex-start", marginBottom: 46, padding: "12px 26px", borderRadius: 999, background: orange, color: "white", fontSize: 34, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2 }}>
            {card.kicker}
          </div>
          {card.layout === "compare" ? <Compare card={card} /> : <Statement card={card} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "48px 84px 70px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={`data:image/png;base64,${logo.toString("base64")}`} width={360} height={108} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 30, color: orange, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>Free online audit</div>
            <div style={{ display: "flex", fontSize: 32, color: "white", fontWeight: 500, marginTop: 6 }}>reputationturbo.com/free-audit</div>
          </div>
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
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
