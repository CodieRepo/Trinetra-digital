/**
 * Upload optimized static media from .wrangler/r2-upload/ to a Cloudflare R2 bucket
 * via Cloudflare R2 REST API (concurrent, preserves Content-Type & Cache-Control).
 *
 * Prerequisites:
 *   1. Run `npm run media:optimize` so `.wrangler/r2-upload/` exists.
 *   2. Provide `CLOUDFLARE_API_TOKEN` in env or `.env` / `.env.local` (with R2:Edit).
 *
 * Usage:
 *   node scripts/upload_r2_media.mjs                  # uploads to trinetra-media
 *   node scripts/upload_r2_media.mjs trinetra-media-staging
 *   node scripts/upload_r2_media.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const UPLOAD_DIR = path.join(ROOT, ".wrangler", "r2-upload");
const DEFAULT_ACCOUNT_ID = "52ca2c75d5ee0677be20c4d1a1597859";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const positionalArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const BUCKET = positionalArgs[0] || "trinetra-media";
const DRY_RUN = process.argv.includes("--dry-run");
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

if (!fs.existsSync(UPLOAD_DIR)) {
  console.error("Missing .wrangler/r2-upload. Run `npm run media:optimize` first.");
  process.exit(1);
}

if (!DRY_RUN && !TOKEN) {
  console.error("Missing CLOUDFLARE_API_TOKEN in environment or .env/.env.local.");
  process.exit(1);
}

const MIME = {
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

function collectFiles(dir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, key));
    } else {
      out.push({ full, key });
    }
  }
  return out;
}

async function uploadOne({ full, key }) {
  const ext = path.extname(full).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${key}`;

  if (DRY_RUN) {
    return { key, ok: true, size: fs.statSync(full).size };
  }

  const body = fs.readFileSync(full);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body,
    });
    if (res.ok) {
      return { key, ok: true, size: body.byteLength };
    }
    if (attempt === 3 || (res.status < 500 && res.status !== 429)) {
      const errTxt = await res.text();
      return { key, ok: false, error: `${res.status} ${errTxt}` };
    }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
}

const files = collectFiles(UPLOAD_DIR);
console.log(`Uploading ${files.length} files to R2 bucket "${BUCKET}"${DRY_RUN ? " (dry-run)" : ""}...`);

const CONCURRENCY = 10;
let idx = 0;
let uploaded = 0;
let failed = 0;
let totalBytes = 0;

async function worker() {
  while (idx < files.length) {
    const current = files[idx++];
    const res = await uploadOne(current);
    if (res.ok) {
      uploaded++;
      totalBytes += res.size;
    } else {
      failed++;
      console.error(`Failed ${res.key}: ${res.error}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
console.log(
  `R2 upload finished (${BUCKET}): ${uploaded} succeeded, ${failed} failed (${(totalBytes / 1048576).toFixed(2)} MB).`
);
if (failed > 0) process.exit(1);
