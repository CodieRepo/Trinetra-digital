import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_FRAMES_DIR = path.join(ROOT, "public", "hero-sequence");
const SRC_VIDEOS_DIR = path.join(ROOT, "public", "videos");
const OUT_DIR = path.join(ROOT, ".wrangler", "r2-upload");
const OUT_FRAMES_DIR = path.join(OUT_DIR, "hero-sequence");
const OUT_VIDEOS_DIR = path.join(OUT_DIR, "videos");

async function main() {
  fs.mkdirSync(OUT_FRAMES_DIR, { recursive: true });
  fs.mkdirSync(OUT_VIDEOS_DIR, { recursive: true });

  let rawBytes = 0;
  let optimizedBytes = 0;
  let frameCount = 0;

  if (fs.existsSync(SRC_FRAMES_DIR)) {
    const files = fs.readdirSync(SRC_FRAMES_DIR).filter((f) => /\.(png|jpg|jpeg)$/i.test(f)).sort();
    for (const file of files) {
      const srcPath = path.join(SRC_FRAMES_DIR, file);
      const destName = file.replace(/\.(png|jpg|jpeg)$/i, ".webp");
      const destPath = path.join(OUT_FRAMES_DIR, destName);
      const srcStat = fs.statSync(srcPath);
      rawBytes += srcStat.size;

      await sharp(srcPath).webp({ quality: 82, effort: 4 }).toFile(destPath);
      optimizedBytes += fs.statSync(destPath).size;
      frameCount++;
    }
  }

  let videoBytes = 0;
  let videoCount = 0;
  if (fs.existsSync(SRC_VIDEOS_DIR)) {
    const videos = fs.readdirSync(SRC_VIDEOS_DIR).filter((f) => /\.(mp4|webm)$/i.test(f)).sort();
    for (const v of videos) {
      const srcPath = path.join(SRC_VIDEOS_DIR, v);
      const destPath = path.join(OUT_VIDEOS_DIR, v);
      fs.copyFileSync(srcPath, destPath);
      videoBytes += fs.statSync(destPath).size;
      videoCount++;
    }
  }

  const rawMB = (rawBytes / (1024 * 1024)).toFixed(2);
  const optMB = (optimizedBytes / (1024 * 1024)).toFixed(2);
  const vidMB = (videoBytes / (1024 * 1024)).toFixed(2);
  const savedPct = rawBytes > 0 ? (((rawBytes - optimizedBytes) / rawBytes) * 100).toFixed(1) : "0.0";

  console.log(`Optimized ${frameCount} hero frames: ${rawMB} MB PNG -> ${optMB} MB WebP (-${savedPct}%)`);
  console.log(`Copied ${videoCount} canonical videos: ${vidMB} MB -> ${OUT_VIDEOS_DIR}`);
  console.log(`R2 Upload staging directory ready at: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Failed optimizing media for R2:", err);
  process.exit(1);
});
