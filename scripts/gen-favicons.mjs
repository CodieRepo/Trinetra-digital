// scripts/gen-favicons.mjs
// Generates all favicon PNG sizes from public/favicon.svg using sharp
// Run: node scripts/gen-favicons.mjs

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");
const svgPath = path.join(publicDir, "favicon.svg");

const svgBuffer = fs.readFileSync(svgPath);

const sizes = [
  { name: "favicon-16x16.png",          size: 16  },
  { name: "favicon-32x32.png",          size: 32  },
  { name: "apple-touch-icon.png",       size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

for (const { name, size } of sizes) {
  const out = path.join(publicDir, name);
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(out);
  console.log(`✓ ${name} (${size}×${size})`);
}

// Also write a minimal ICO (just embed the 32x32 PNG as ICO header)
// We'll write a proper ICO file manually for favicon.ico
// ICO format: header + directory + image data
const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();

// Build a 2-image ICO file (16x16 and 32x32)
function buildIco(images) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const count = images.length;
  const headerBuf = Buffer.alloc(HEADER_SIZE);
  headerBuf.writeUInt16LE(0, 0);      // reserved
  headerBuf.writeUInt16LE(1, 2);      // type: ICO
  headerBuf.writeUInt16LE(count, 4);  // number of images

  const dirBufs = [];
  let dataOffset = HEADER_SIZE + count * ENTRY_SIZE;

  for (const { width, height, data } of images) {
    const entry = Buffer.alloc(ENTRY_SIZE);
    entry.writeUInt8(width === 256 ? 0 : width, 0);  // width (0 = 256)
    entry.writeUInt8(height === 256 ? 0 : height, 1); // height
    entry.writeUInt8(0, 2);  // color count
    entry.writeUInt8(0, 3);  // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);   // size of image data
    entry.writeUInt32LE(dataOffset, 12);   // offset of image data
    dirBufs.push(entry);
    dataOffset += data.length;
  }

  return Buffer.concat([
    headerBuf,
    ...dirBufs,
    ...images.map(({ data }) => data),
  ]);
}

const icoBuffer = buildIco([
  { width: 16, height: 16, data: png16 },
  { width: 32, height: 32, data: png32 },
]);

fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
console.log("✓ favicon.ico (16×16 + 32×32 embedded)");

console.log("\n✅ All favicon assets generated in /public");
