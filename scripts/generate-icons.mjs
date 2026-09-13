/**
 * Generates the PWA icon set with no image dependencies.
 * Draws the Adalat Diary mark — a gold scale of justice on judicial navy —
 * into an RGBA buffer and encodes it as PNG via zlib.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const NAVY = [0x1a, 0x2b, 0x49];
const GOLD = [0xf8, 0xbd, 0x3d];
const PAPER = [0xf8, 0xf9, 0xff];

// ── PNG encoding ────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // 10-12 stay 0: deflate / adaptive filtering / no interlace

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing ─────────────────────────────────────────────────────────────────
function canvas(size, bg) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = bg[0];
    buf[i * 4 + 1] = bg[1];
    buf[i * 4 + 2] = bg[2];
    buf[i * 4 + 3] = 255;
  }
  return buf;
}

/** Coverage-based blend so edges are not jagged at 192px. */
function blend(buf, size, x, y, colour, coverage) {
  if (x < 0 || y < 0 || x >= size || y >= size || coverage <= 0) return;
  const a = Math.min(1, coverage);
  const i = (y * size + x) * 4;
  buf[i] = Math.round(buf[i] * (1 - a) + colour[0] * a);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + colour[1] * a);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + colour[2] * a);
}

/** 3x3 supersampled shape fill: `inside(px, py)` works in unit coordinates. */
function fill(buf, size, colour, inside) {
  const S = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = (x + (sx + 0.5) / S) / size;
          const py = (y + (sy + 0.5) / S) / size;
          if (inside(px, py)) hits++;
        }
      }
      if (hits) blend(buf, size, x, y, colour, hits / (S * S));
    }
  }
}

const rect = (x0, y0, x1, y1) => (px, py) => px >= x0 && px <= x1 && py >= y0 && py <= y1;

const roundedRect = (x0, y0, x1, y1, r) => (px, py) => {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.min(Math.max(px, x0 + r), x1 - r);
  const cy = Math.min(Math.max(py, y0 + r), y1 - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
};

/** Triangular scale pan hanging from (apexX, apexY). */
const pan = (apexX, apexY, halfWidth, depth) => (px, py) => {
  if (py < apexY || py > apexY + depth) return false;
  const t = (py - apexY) / depth;
  const half = halfWidth * (0.25 + 0.75 * Math.sqrt(1 - (1 - t) ** 2));
  return Math.abs(px - apexX) <= half && py >= apexY + depth * 0.55 * (1 - t) * 0;
};

const panBowl = (cx, topY, halfWidth, depth) => (px, py) => {
  if (py < topY || py > topY + depth) return false;
  const t = (py - topY) / depth;
  const half = halfWidth * Math.sqrt(Math.max(0, 1 - t * t));
  return Math.abs(px - cx) <= Math.max(half, halfWidth * 0.06);
};

function drawMark(buf, size, { bg, ink, inset = 0.16 }) {
  const s = (v) => inset + v * (1 - inset * 2); // map 0..1 into the safe area

  // Central post
  fill(buf, size, ink, rect(s(0.475), s(0.16), s(0.525), s(0.78)));
  // Beam
  fill(buf, size, ink, rect(s(0.13), s(0.265), s(0.87), s(0.315)));
  // Finial
  fill(buf, size, ink, (px, py) => (px - s(0.5)) ** 2 + (py - s(0.16)) ** 2 <= (0.045 * (1 - inset * 2)) ** 2);
  // Hangers
  fill(buf, size, ink, rect(s(0.185), s(0.315), s(0.205), s(0.44)));
  fill(buf, size, ink, rect(s(0.795), s(0.315), s(0.815), s(0.44)));
  // Pans
  fill(buf, size, ink, panBowl(s(0.195), s(0.44), 0.155 * (1 - inset * 2), 0.16 * (1 - inset * 2)));
  fill(buf, size, ink, panBowl(s(0.805), s(0.44), 0.155 * (1 - inset * 2), 0.16 * (1 - inset * 2)));
  // Base
  fill(buf, size, ink, roundedRect(s(0.33), s(0.78), s(0.67), s(0.85), 0.02));
  void bg;
  void pan;
}

function writeIcon(name, size, { bg, ink, rounded, inset }) {
  const buf = canvas(size, bg);
  if (rounded) {
    // Punch a rounded silhouette out of a paper ground for the non-maskable icon.
    const ground = canvas(size, PAPER);
    fill(ground, size, bg, roundedRect(0.02, 0.02, 0.98, 0.98, 0.22));
    ground.copy(buf);
  }
  drawMark(buf, size, { bg, ink, inset });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, name), encodePng(size, buf));
  console.log('wrote', name, `${size}x${size}`);
}

writeIcon('icon-192.png', 192, { bg: NAVY, ink: GOLD, rounded: true, inset: 0.2 });
writeIcon('icon-512.png', 512, { bg: NAVY, ink: GOLD, rounded: true, inset: 0.2 });
// Maskable: art stays inside the 80% safe zone, ground bleeds to the edge.
writeIcon('icon-maskable-512.png', 512, { bg: NAVY, ink: GOLD, rounded: false, inset: 0.26 });
writeIcon('apple-touch-icon.png', 180, { bg: NAVY, ink: GOLD, rounded: false, inset: 0.2 });
