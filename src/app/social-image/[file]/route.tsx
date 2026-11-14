import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { activeKeyword, cardsOf, formatOf, getSocialPost, parseImageFile, type CardPhoto, type CardTheme, type SocialCard } from "@/lib/social";

// One card of a Facebook and Instagram post, drawn from its text. Served as a JPEG
// because Instagram only accepts JPEG photos.
//   /social-image/<id>.jpg         the image, or the carousel's first slide (1080 x 1350, 4:5)
//   /social-image/<id>.s3.jpg      carousel slide 3
//   /social-image/<id>.s2.tall.jpg a 1080 x 1920 (9:16) version, used to make Reels

export const runtime = "nodejs";

const W = 1080;
const navy = "#061b3e";
const navy800 = "#0c2a5c";
const orange = "#ff6500";

const cwd = process.cwd();
const assets = Promise.all([
  readFile(join(cwd, "src/assets/fonts/BarlowCondensed-ExtraBold.ttf")),
  readFile(join(cwd, "src/assets/fonts/Barlow-SemiBold.ttf")),
  readFile(join(cwd, "src/assets/fonts/Barlow-Medium.ttf")),
  readFile(join(cwd, "public/brand/logo-full-white.png")),
  readFile(join(cwd, "public/brand/logo.png")),
]);

// Literal paths so only these files are bundled with the function.
const photos: Record<CardPhoto, () => Promise<Buffer>> = {
  "hero-contractor": () => readFile(join(cwd, "public/images/hero-contractor.jpg")),
  "trade-concrete": () => readFile(join(cwd, "public/images/trade-concrete.jpg")),
  "trade-electrical": () => readFile(join(cwd, "public/images/trade-electrical.jpg")),
  "trade-hvac": () => readFile(join(cwd, "public/images/trade-hvac.jpg")),
  "trade-landscaping": () => readFile(join(cwd, "public/images/trade-landscaping.jpg")),
  "trade-plumbing": () => readFile(join(cwd, "public/images/trade-plumbing.jpg")),
  "trade-roofing": () => readFile(join(cwd, "public/images/trade-roofing.jpg")),
  "services-desk": () => readFile(join(cwd, "public/images/services-desk.jpg")),
  "ai-search-landscaper": () => readFile(join(cwd, "public/images/ai-search-landscaper.jpg")),
};

type Palette = { bg: string; text: string; sub: string; accent: string; pillBg: string; pillText: string; panel: string; logo: "white" | "dark"; footerBg?: string };

const palettes: Record<CardTheme, Palette> = {
  navy: { bg: navy, text: "white", sub: "rgba(255,255,255,0.82)", accent: orange, pillBg: orange, pillText: "white", panel: navy800, logo: "white" },
  light: { bg: "#eef2f9", text: navy, sub: "#5b6475", accent: orange, pillBg: navy, pillText: "white", panel: "white", logo: "dark" },
  // The logo's orange would vanish on orange, so the footer sits on navy.
  orange: { bg: orange, text: "white", sub: "rgba(255,255,255,0.9)", accent: navy, pillBg: navy, pillText: "white", panel: "#e05800", logo: "white", footerBg: navy },
};

const headlineStyle = (p: Palette, size: number) =>
  ({ display: "flex", fontSize: size, lineHeight: 1.02, fontFamily: "Heading", textTransform: "uppercase", color: p.text }) as const;

const sublineStyle = (p: Palette) =>
  ({ display: "flex", marginTop: 40, fontSize: 44, lineHeight: 1.3, color: p.sub, fontFamily: "Body", fontWeight: 500 }) as const;

function headlineSize(text: string, big = 104) {
  return text.length > 70 ? big * 0.72 : text.length > 48 ? big * 0.85 : big;
}

function Body({ card, p }: { card: SocialCard; p: Palette }) {
  switch (card.layout) {
    case "compare": {
      const column = (side: { title: string; points: string[] }, good: boolean) => (
        <div
          style={{
            display: "flex", flexDirection: "column", flex: 1, padding: "36px 34px", borderRadius: 22,
            background: good ? "white" : p.panel, border: good ? `6px solid ${orange}` : "6px solid rgba(255,255,255,0.15)",
          }}
        >
          <div style={{ display: "flex", fontFamily: "Heading", fontSize: 52, textTransform: "uppercase", color: good ? navy : p.text }}>{side.title}</div>
          {side.points.map((pt) => (
            <div key={pt} style={{ display: "flex", alignItems: "flex-start", marginTop: 24, fontSize: 34, lineHeight: 1.25, fontFamily: "Body", fontWeight: 600, color: good ? navy : p.sub }}>
              <div style={{ display: "flex", width: 40, flexShrink: 0, paddingTop: 13 }}>
                <div style={{ display: "flex", width: 16, height: 16, borderRadius: 999, background: good ? orange : "rgba(127,127,127,0.5)" }} />
              </div>
              <div style={{ display: "flex", flex: 1 }}>{pt}</div>
            </div>
          ))}
        </div>
      );
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={headlineStyle(p, 92)}>{card.headline}</div>
          <div style={{ display: "flex", gap: 28, marginTop: 50 }}>
            {column(card.left, false)}
            {column(card.right, true)}
          </div>
        </div>
      );
    }
    case "stat":
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: card.stat.length > 4 ? 200 : 280, lineHeight: 0.9, fontFamily: "Heading", color: p.accent }}>{card.stat}</div>
          <div style={{ ...headlineStyle(p, headlineSize(card.headline, 88)), marginTop: 30 }}>{card.headline}</div>
          {card.subline ? <div style={sublineStyle(p)}>{card.subline}</div> : null}
        </div>
      );
    case "quote":
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 220, lineHeight: 0.6, height: 120, fontFamily: "Heading", color: p.accent }}>“</div>
          <div style={{ display: "flex", fontSize: card.quote.length > 90 ? 62 : 76, lineHeight: 1.15, fontFamily: "Body", fontWeight: 600, color: p.text }}>{card.quote}</div>
          {card.by ? <div style={{ ...sublineStyle(p), fontSize: 38 }}>{card.by}</div> : null}
        </div>
      );
    case "point":
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {card.number !== undefined ? (
            <div style={{ display: "flex", width: 150, height: 150, borderRadius: 999, alignItems: "center", justifyContent: "center", background: p.accent, color: p.bg === orange ? "white" : "white", fontFamily: "Heading", fontSize: 100, marginBottom: 44 }}>
              {card.number}
            </div>
          ) : null}
          <div style={headlineStyle(p, headlineSize(card.headline, 96))}>{card.headline}</div>
          {card.subline ? <div style={sublineStyle(p)}>{card.subline}</div> : null}
        </div>
      );
    default:
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={headlineStyle(p, headlineSize(card.headline))}>{card.headline}</div>
          {card.subline ? <div style={sublineStyle(p)}>{card.subline}</div> : null}
        </div>
      );
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const parsed = parseImageFile(file);
  const post = parsed ? getSocialPost(parsed.id) : undefined;
  const cards = post ? cardsOf(post) : [];
  const card = parsed ? cards[parsed.slide - 1] : undefined;
  if (!post || !parsed || !card) return new Response("Not found", { status: 404 });

  const H = parsed.tall ? 1920 : 1350;
  const p = palettes[card.layout === "photo" ? "navy" : (card.theme ?? "navy")];
  const [heading, bodySemi, bodyMedium, logoWhite, logoDark] = await assets;
  const keyword = parsed.slide === 1 ? activeKeyword(post) : undefined;
  const carousel = formatOf(post) === "carousel";
  const photo =
    card.layout === "photo"
      ? `data:image/jpeg;base64,${(await sharp(await photos[card.photo]()).resize(W, H, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer()).toString("base64")}`
      : null;
  const logo = p.logo === "white" ? logoWhite : logoDark;
  const [logoW, logoH] = p.logo === "white" ? [360, 108] : [360, 78];

  const png = new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", background: p.bg, fontFamily: "Body" }}>
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={photo} width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex", background: "linear-gradient(180deg, rgba(6,27,62,0.35) 0%, rgba(6,27,62,0.75) 45%, rgba(6,27,62,0.95) 100%)" }} />
          </>
        ) : null}
        <div style={{ display: "flex", height: 18, background: p.bg === orange ? navy : orange }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, padding: parsed.tall ? "120px 84px 0" : "90px 84px 0", justifyContent: photo ? "flex-end" : "center" }}>
          {keyword ? (
            <div style={{ position: "absolute", top: 60, right: 60, display: "flex", padding: "12px 24px", borderRadius: 14, border: `3px solid ${p.accent}`, color: p.text, fontSize: 30, fontWeight: 600 }}>
              Comment&nbsp;<span style={{ color: p.accent }}>{keyword}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", alignSelf: "flex-start", marginBottom: 46, padding: "12px 26px", borderRadius: 999, background: p.pillBg, color: p.pillText, fontSize: 34, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2 }}>
            {card.kicker}
          </div>
          <Body card={card} p={p} />
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 48, padding: parsed.tall ? "40px 84px 140px" : "40px 84px 56px", ...(p.footerBg ? { background: p.footerBg } : {}) }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={`data:image/png;base64,${logo.toString("base64")}`} width={logoW} height={logoH} />
          {carousel && !parsed.tall && parsed.slide < cards.length ? (
            <div style={{ display: "flex", alignItems: "center", fontSize: 36, fontWeight: 600, color: p.footerBg ? orange : p.accent }}>
              {parsed.slide === 1 ? "Swipe" : `${parsed.slide} / ${cards.length}`}&nbsp;→
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 30, color: p.footerBg ? orange : p.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>Free online audit</div>
              <div style={{ display: "flex", fontSize: 32, color: p.footerBg ? "white" : p.text, fontWeight: 500, marginTop: 6 }}>reputationturbo.com/free-audit</div>
            </div>
          )}
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
