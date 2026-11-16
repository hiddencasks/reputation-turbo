// Makes a short vertical video (Reel) for a social post from its cards: each card
// shows for a few seconds with a slow zoom, with crossfades between them.
// Saves public/social/video/<post id>.mp4, which the auto-poster publishes as a Reel.
//
// Usage (with the site running, e.g. `npm run dev`):
//   npm run social:reel -- <post id> [site url, default http://localhost:3000]
// Needs ffmpeg installed.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cardsOf, getSocialPost, imagePath } from "../src/lib/social";

const [id, siteUrl = "http://localhost:3000"] = process.argv.slice(2);
const post = id ? getSocialPost(id) : undefined;
if (!post) {
  console.error(`No social post with id "${id ?? ""}". See src/lib/social.ts.`);
  process.exit(1);
}

const SCENE = 3.5; // seconds each card shows
const FADE = 0.5;
const FPS = 30;
const frames = Math.round(SCENE * FPS);

const work = mkdtempSync(path.join(tmpdir(), "reel-"));
try {
  const cards = cardsOf(post);
  const files: string[] = [];
  for (let i = 1; i <= cards.length; i++) {
    const res = await fetch(`${siteUrl}${imagePath(post, i, true)}`);
    if (!res.ok) throw new Error(`Couldn't get card ${i} (${res.status}). Is the site running at ${siteUrl}?`);
    const file = path.join(work, `card${i}.jpg`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    files.push(file);
  }

  const inputs = files.flatMap((f) => ["-i", f]);
  const scenes = files.map(
    (_, i) => `[${i}:v]scale=2160:3840,zoompan=z='min(zoom+0.0007,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS},setsar=1,format=yuv420p[s${i}]`,
  );
  let last = "s0";
  const fades: string[] = [];
  for (let i = 1; i < files.length; i++) {
    const out = i === files.length - 1 ? "v" : `x${i}`;
    fades.push(`[${last}][s${i}]xfade=transition=fade:duration=${FADE}:offset=${(i * (SCENE - FADE)).toFixed(2)}[${out}]`);
    last = out;
  }
  if (files.length === 1) fades.push(`[s0]null[v]`);
  const total = files.length * SCENE - (files.length - 1) * FADE;

  const outDir = path.join(process.cwd(), "public/social/video");
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${post.id}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      ...inputs,
      // A silent sound track: some apps treat videos without one as broken.
      "-f", "lavfi", "-t", total.toFixed(2), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-filter_complex", [...scenes, ...fades].join(";"),
      "-map", "[v]", "-map", `${files.length}:a`,
      "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart",
      out,
    ],
    { stdio: "inherit" },
  );
  console.log(`Saved ${path.relative(process.cwd(), out)} (${total.toFixed(1)} s, ${cards.length} scenes).`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
