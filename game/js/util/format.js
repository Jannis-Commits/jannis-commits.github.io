import { WEEKS_PER_YEAR, START } from '../../config/formulas.js';

const nf = (d) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 });

export function money(v) {
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1e9) return `${sign}${nf(1).format(a / 1e9)} Mrd. $`;
  if (a >= 1e6) return `${sign}${nf(1).format(a / 1e6)} Mio. $`;
  return `${sign}${nf(0).format(Math.round(a))} $`;
}

// "1 billion Parameter" – englische Zahlwörter wie im Spiel gewünscht
export function count(v) {
  const units = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'k']];
  for (const [u, name] of units) {
    if (v >= u) {
      const x = nf(v / u < 10 ? 1 : 0).format(v / u);
      return name === 'k' ? `${x}k` : `${x} ${name}`;
    }
  }
  return nf(0).format(v);
}

export const params = (n) => `${count(n)} Parameter`;
export const tokens = (n) => `${count(n)} Tokens`;

export function flops(v) {
  const units = [[1e24, 'Y'], [1e21, 'Z'], [1e18, 'E'], [1e15, 'P'], [1e12, 'T'], [1e9, 'G']];
  for (const [u, p] of units) if (v >= u) return `${nf(1).format(v / u)} ${p}FLOP`;
  return `${nf(0).format(v)} FLOP`;
}

export const pct = (v, d = 0) => `${nf(d).format(v * 100)} %`;
export const num = (v, d = 0) => nf(d).format(v);

export function gameYear(week) {
  return START.year + week / WEEKS_PER_YEAR;
}

export function date(week) {
  const y = gameYear(week);
  const q = Math.floor((y % 1) * 4) + 1;
  return `Q${q} ${Math.floor(y)}`;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
