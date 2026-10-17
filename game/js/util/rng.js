// Deterministischer Zufall (mulberry32), Zustand liegt im Spielstand.
export function rand(state) {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randInt = (state, a, b) => a + Math.floor(rand(state) * (b - a + 1));
export const pick = (state, arr) => arr[Math.floor(rand(state) * arr.length)];
