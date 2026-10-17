import { esc } from '../util/format.js';

// Kleine HTML-Bausteine. Aktionen laufen über data-act + data-* Attribute (siehe main.js).

const attrs = (o = {}) => Object.entries(o).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');

export function btn(label, act, data = {}, { cls = '', disabled = false, title = '' } = {}) {
  return `<button class="btn ${cls}" data-act="${act}"${attrs(data)}${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}>${label}</button>`;
}

export const kv = (k, v, cls = '') => `<div class="kv"><span>${k}</span><span class="${cls}">${v}</span></div>`;
export const stat = (k, v) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
export const chip = (t, cls = '') => `<span class="chip ${cls}">${t}</span>`;
export const bar = (p, thin = false) => `<div class="bar${thin ? ' thin' : ''}"><i style="width:${Math.max(0, Math.min(100, p * 100)).toFixed(1)}%"></i></div>`;
export const h2 = (t) => `<h2>${t}</h2>`;
export const empty = (t) => `<div class="empty">${t}</div>`;

export function stepper(n, act, data) {
  return `<div class="stepper">${btn('−', act, { ...data, d: -1 }, { cls: 'ghost' })}<span class="n">${n}</span>${btn('+', act, { ...data, d: 1 }, { cls: 'ghost' })}</div>`;
}

export function seg(options, current, act) {
  return `<div class="seg">${options.map(([id, label]) =>
    `<button class="${id === current ? 'on' : ''}" data-act="${act}" data-id="${id}">${label}</button>`).join('')}</div>`;
}

export function scoreChip(score) {
  const s = Math.round(score);
  return chip(`Score ${s}`, s >= 85 ? 'green' : s >= 60 ? 'blue' : 'amber');
}
