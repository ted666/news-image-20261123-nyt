// Entry point for the news-image-20261123 make.fun entry (NYT-style).
// Node 22, standard library only. No network, no randomness.
// Copies entry.png (sitting next to this file) into the output
// directory after checking it against the competition's image gate,
// then confirms the written copy is byte-for-byte identical.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 1_048_576; // 1 MiB
const MAX_SIDE = 1024; // pixels

function die(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

// Resolve the image relative to this script's own folder, never the
// process working directory (the grader runs us from elsewhere).
const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "entry.png");

if (!existsSync(source)) {
  die(`entry.png not found next to main.ts (looked in ${here})`);
}

const bytes = readFileSync(source);

if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_MAGIC)) {
  die("entry.png is not a valid PNG (bad signature)");
}

if (bytes.length > MAX_BYTES) {
  die(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
}

// PNG header layout: 4-byte length (13) at offset 8, "IHDR" at 12,
// big-endian width at 16, big-endian height at 20.
if (bytes.length < 24) {
  die("entry.png is too short to hold an IHDR chunk");
}
if (bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
  die("entry.png is missing its IHDR chunk");
}
const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);

if (width > MAX_SIDE || height > MAX_SIDE) {
  die(`entry.png is ${width}x${height}, over the 1024x1024 limit`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });

const target = join(outDir, "entry.png");
writeFileSync(target, bytes);

const written = readFileSync(target);
if (!written.equals(bytes)) {
  die("written output does not match the source byte-for-byte");
}

console.log(`entry.png -> ${target} (${bytes.length} bytes, ${width}x${height})`);
