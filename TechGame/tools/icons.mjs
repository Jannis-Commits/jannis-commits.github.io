// Erzeugt die PWA-Icons als PNG (ohne Abhängigkeiten): node tools/icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = px(x, y);
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Motiv in Einheitskoordinaten (0..1): blaue Fläche, weißes Fenster mit Prompt ">_"
function shape(u, v, maskable) {
  const inset = maskable ? 0 : 0.0;
  const rr = (x, y, x0, y0, x1, y1, r) => {
    const cx = Math.max(x0 + r, Math.min(x1 - r, x)); const cy = Math.max(y0 + r, Math.min(y1 - r, y));
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  const bg = maskable ? true : rr(u, v, inset, inset, 1 - inset, 1 - inset, 0.22);
  if (!bg) return null;
  const s = maskable ? 0.72 : 1; const o = (1 - s) / 2;
  const x = (u - o) / s; const y = (v - o) / s;
  const win = rr(x, y, 0.18, 0.24, 0.82, 0.76, 0.07);
  const titlebar = y < 0.34 && win;
  // ">" Chevron
  const inChevron = (() => {
    const px = x - 0.30; const py = y - 0.52;
    const d = 0.1 - Math.abs(py);
    return px >= d - 0.0 && px <= d + 0.07 && Math.abs(py) <= 0.1 && px >= 0;
  })();
  const underscore = x > 0.48 && x < 0.66 && y > 0.6 && y < 0.65;
  if (win && !titlebar && (inChevron || underscore)) return 'blue';
  if (win) return titlebar ? 'soft' : 'white';
  return 'blue';
}

const COLORS = { blue: [29, 91, 255, 255], white: [255, 255, 255, 255], soft: [214, 226, 255, 255] };
function render(size, maskable = false) {
  const ss = 4;
  return png(size, (x, y) => {
    const acc = [0, 0, 0, 0];
    for (let i = 0; i < ss; i++) for (let j = 0; j < ss; j++) {
      const c = shape((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size, maskable);
      if (!c) continue;
      const col = COLORS[c];
      for (let k = 0; k < 4; k++) acc[k] += col[k];
    }
    const n = ss * ss;
    const a = acc[3] / n;
    return a ? [Math.round(acc[0] / (acc[3] / 255)), Math.round(acc[1] / (acc[3] / 255)), Math.round(acc[2] / (acc[3] / 255)), Math.round(a)] : [0, 0, 0, 0];
  });
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
const out = (name, buf) => writeFileSync(new URL(`../icons/${name}`, import.meta.url), buf);
out('icon-192.png', render(192));
out('icon-512.png', render(512));
out('icon-maskable-512.png', render(512, true));
out('apple-touch-icon.png', render(180, true));
console.log('Icons geschrieben.');
