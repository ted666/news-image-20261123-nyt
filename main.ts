// NYT front page for news-image-20261123: one image, one program.
// Node 22 standard library only — nothing is fetched, nothing is
// random, nothing depends on the clock. The program locates
// entry.png beside itself, checks it against the image gate,
// copies it into the output folder and proves the copy matches.

import * as fs from "node:fs";
import * as path from "node:path";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BYTE_LIMIT = 1048576;
const SIDE_LIMIT = 1024;

class GateError extends Error {}

function loadEntry() {
  const location = path.join(import.meta.dirname, "entry.png");
  if (!fs.existsSync(location)) {
    throw new GateError(`entry.png is missing next to main.ts (${location})`);
  }
  return fs.readFileSync(location);
}

function checkImage(image) {
  if (image.length < 8 || !image.subarray(0, 8).equals(SIGNATURE)) {
    throw new GateError("entry.png fails the PNG signature check");
  }
  if (image.length > BYTE_LIMIT) {
    throw new GateError(`entry.png is ${image.length} bytes, above the 1 MiB cap`);
  }
  if (image.length < 24) {
    throw new GateError("entry.png is too short to carry an IHDR chunk");
  }
  const declaredLength = image.readUInt32BE(8);
  const chunkName = image.subarray(12, 16).toString("ascii");
  if (declaredLength !== 13 || chunkName !== "IHDR") {
    throw new GateError("entry.png has no IHDR chunk");
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width === 0 || height === 0) {
    throw new GateError("entry.png declares a zero dimension");
  }
  if (width > SIDE_LIMIT || height > SIDE_LIMIT) {
    throw new GateError(`entry.png is ${width} by ${height}, above the 1024 by 1024 cap`);
  }
  return { width, height };
}

function writeEntry(image) {
  const folder = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(folder, { recursive: true });
  const destination = path.join(folder, "entry.png");
  fs.writeFileSync(destination, image);
  const back = fs.readFileSync(destination);
  if (!back.equals(image)) {
    throw new GateError("the written copy is not identical to the source");
  }
  return destination;
}

try {
  const image = loadEntry();
  const size = checkImage(image);
  const destination = writeEntry(image);
  console.log(`wrote ${destination} (${image.length} bytes, ${size.width}x${size.height})`);
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
