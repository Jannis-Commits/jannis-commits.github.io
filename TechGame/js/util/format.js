import { START, TIME } from '../../config/balance.js';

const nf = (d) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const NF0 = nf(0);
const NF1 = nf(1);

const big = (a) => (a < 10 ? NF1 : NF0);

// Geld: 12.300 $ · 1,2 Mio. $ · 3,4 billion $ (billion = Milliarde) · 1,1 trillion $
export function money(v, { sign = false } = {}) {
  const s = v < 0 ? '−' : sign && v > 0 ? '+' : '';
  const a = Math.abs(v);
  if (a >= 1e12) return `${s}${big(a / 1e12).format(a / 1e12)} trillion $`;
  if (a >= 1e9) return `${s}${big(a / 1e9).format(a / 1e9)} billion $`;
  if (a >= 1e6) return `${s}${big(a / 1e6).format(a / 1e6)} Mio. $`;
  return `${s}${NF0.format(Math.round(a))} $`;
}

// Anzahlen: 950 · 12,3k · 4,5 Mio. · 1,2 billion
export function count(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${big(a / 1e9).format(v / 1e9)} billion`;
  if (a >= 1e6) return `${big(a / 1e6).format(v / 1e6)} Mio.`;
  if (a >= 1e4) return `${NF0.format(v / 1e3)}k`;
  if (a >= 1e3) return `${NF1.format(v / 1e3)}k`;
  return NF0.format(Math.round(v));
}

export const num = (v, d = 0) => nf(d).format(v);
export const pct = (v, d = 0) => `${nf(d).format(v * 100)} %`;

export const yearOf = (week) => START.year + Math.floor(week / TIME.weeksPerYear);
export const yearFrac = (week) => START.year + week / TIME.weeksPerYear;
export const kw = (week) => (week % TIME.weeksPerYear) + 1;
export const date = (week) => `KW ${kw(week)} · ${yearOf(week)}`;

export function stars(r) {
  const full = Math.round(r * 2) / 2;
  let out = '';
  for (let i = 1; i <= 5; i++) out += full >= i ? '★' : full >= i - 0.5 ? '⯪' : '☆';
  return out;
}

export function weeks(n) {
  if (!isFinite(n)) return '∞';
  const w = Math.ceil(n);
  return w === 1 ? '1 Woche' : `${w} Wochen`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
