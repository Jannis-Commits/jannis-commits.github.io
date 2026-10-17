// Kleine HTML-Bausteine. Aktionen laufen über data-act + data-* (siehe main.js).
import { esc } from '../util/format.js';
import { clamp } from '../util/math.js';

const attrs = (o = {}) => Object.entries(o).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');

export function btn(label, act, data = {}, { cls = '', disabled = false } = {}) {
  return `<button class="btn ${cls}" data-act="${act}"${attrs(data)}${disabled ? ' disabled' : ''}>${label}</button>`;
}

export const kv = (k, v, cls = '') => `<div class="kv"><span>${k}</span><span class="${cls}">${v}</span></div>`;
export const stat = (k, v) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
export const chip = (t, cls = '') => `<span class="chip ${cls}">${t}</span>`;
export const h2 = (t, meta = '') => `<h2>${t}${meta ? `<span class="meta">${meta}</span>` : ''}</h2>`;
export const empty = (t, action = '') => `<div class="empty">${t}${action ? `<div>${action}</div>` : ''}</div>`;

export const bar = (p, cls = '', thin = false) =>
  `<div class="bar ${cls}${thin ? ' thin' : ''}"><i style="width:${(clamp(p, 0, 1) * 100).toFixed(1)}%"></i></div>`;

export function stars(r) {
  const w = (clamp(r, 0, 5) / 5) * 100;
  return `<span class="stars" aria-label="${r.toFixed(1)} von 5 Sternen">★★★★★<i style="width:${w.toFixed(0)}%">★★★★★</i></span>`;
}

export function stepper(label, act, data = {}) {
  return `<div class="stepper">${btn('−', act, { ...data, d: -1 }, { cls: 'ghost' })}<span class="n">${label}</span>${btn('+', act, { ...data, d: 1 }, { cls: 'ghost' })}</div>`;
}

export function seg(options, current, act, extra = {}) {
  return `<div class="seg">${options.map(([id, label]) =>
    `<button class="${id === current ? 'on' : ''}" data-act="${act}" data-id="${esc(id)}"${attrs(extra)}>${label}</button>`).join('')}</div>`;
}

export const toggle = (on, act, data = {}) => `<button class="toggle ${on ? 'on' : ''}" data-act="${act}"${attrs(data)} aria-pressed="${on}"></button>`;

export function pick(on, inner, act, data = {}, { disabled = false, check = true } = {}) {
  return `<button class="pick ${on ? 'on' : ''}" data-act="${act}"${attrs(data)}${disabled ? ' disabled' : ''}>${check ? '<span class="check">✓</span>' : ''}<span class="grow">${inner}</span></button>`;
}

export function sheetHead(title, icon = '') {
  return `<div class="head">${icon ? `<div class="ico blue">${icon}</div>` : ''}<h3>${title}</h3><button class="close" data-act="close" aria-label="Schließen">✕</button></div>`;
}

export const initials = (name) => name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

// Mini-Liniendiagramm. series: [{ values, color }]
export function lineChart(series, { w = 320, h = 120, pad = 4, log = false } = {}) {
  const all = series.flatMap((s) => s.values).filter((v) => isFinite(v));
  if (!all.length) return '';
  const f = (v) => (log ? Math.log10(Math.max(1, v)) : v);
  const min = Math.min(...all.map(f), log ? Infinity : 0);
  const max = Math.max(...all.map(f));
  const span = max - min || 1;
  const n = Math.max(...series.map((s) => s.values.length));
  const x = (i) => pad + (i / Math.max(1, n - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((f(v) - min) / span) * (h - pad * 2);
  const paths = series.map((s) => {
    const off = n - s.values.length;
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i + off).toFixed(1)},${y(v).toFixed(1)}`).join('');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
}

export function miniBars(values) {
  const max = Math.max(1, ...values.map(Math.abs));
  return `<div class="mini-bars">${values.map((v) => `<i class="${v < 0 ? 'neg' : ''}" style="height:${(Math.abs(v) / max * 100).toFixed(0)}%"></i>`).join('')}</div>`;
}
