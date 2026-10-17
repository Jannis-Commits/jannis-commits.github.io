// Deterministischer Zufall (mulberry32). Der Zustand liegt im Spielstand → Speichern/Laden ist reproduzierbar.
export function rand(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (s, p) => rand(s) < p;
export const randInt = (s, a, b) => a + Math.floor(rand(s) * (b - a + 1));
export const randRange = (s, a, b) => a + rand(s) * (b - a);
export const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];

// Normalverteilt (Box-Muller)
export function gauss(s, mean = 0, sd = 1) {
  const u = Math.max(1e-9, rand(s));
  const v = rand(s);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// items: [[value, weight], …]
export function weighted(s, items) {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rand(s) * total;
  for (const [v, w] of items) {
    r -= w;
    if (r <= 0) return v;
  }
  return items[items.length - 1]?.[0];
}
