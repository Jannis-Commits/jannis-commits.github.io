import { esc } from '../util/format.js';

// Kleine HTML-Bausteine. Aktionen laufen über data-act + data-* Attribute (siehe main.js).

const attrs = (o = {}) => Object.entries(o).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');

export function btn(label, act, data = {}, { cls = '', disabled = false, title = '' } = {}) {
  return `<button class="btn ${cls}" data-act="${act}"${attrs(data)}${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}>${label}</button>`;
}

export const kv = (k, v, cls = '') => `<div class="kv"><span>${k}</span><span class="${cls}">${v}</span></div>`;
export const stat = (k, v, sub = '') => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
export const chip = (t, cls = '') => `<span class="chip ${cls}">${t}</span>`;
export const bar = (p, thin = false, cls = '') => `<div class="bar${thin ? ' thin' : ''} ${cls}"><i style="width:${Math.max(0, Math.min(100, p * 100)).toFixed(1)}%"></i></div>`;
export const h2 = (t, right = '') => `<h2><span>${t}</span>${right}</h2>`;
export const empty = (t) => `<div class="empty">${t}</div>`;
export const note = (t, cls = '') => `<div class="note ${cls}">${t}</div>`;

export function stepper(n, act, data, { min = true } = {}) {
  return `<div class="stepper">${btn('−', act, { ...data, d: -1 }, { cls: 'ghost', disabled: min && n <= 0 })}<span class="n">${n}</span>${btn('+', act, { ...data, d: 1 }, { cls: 'ghost' })}</div>`;
}

export function seg(options, current, act, data = {}) {
  return `<div class="seg">${options.map(([id, label, dis]) =>
    `<button class="${String(id) === String(current) ? 'on' : ''}" data-act="${act}" data-id="${id}"${attrs(data)}${dis ? ' disabled' : ''}>${label}</button>`).join('')}</div>`;
}

// Filter-Chips (horizontal scrollbar)
export function fchips(options, current, act, data = {}) {
  return `<div class="fchips">${options.map(([id, label]) =>
    `<button class="${String(id) === String(current) ? 'on' : ''}" data-act="${act}" data-id="${id}"${attrs(data)}>${label}</button>`).join('')}</div>`;
}

// Kompakte, antippbare Listenzeile
export function row({ icon = '', title, sub = '', right = '', act = '', data = {}, cls = '', chips = '' }) {
  const inner = `${icon ? `<span class="ico">${icon}</span>` : ''}<span class="grow"><span class="title">${title}</span>${sub ? `<span class="sub">${sub}</span>` : ''}${chips ? `<span class="chips">${chips}</span>` : ''}</span>${right ? `<span class="right">${right}</span>` : ''}${act ? '<span class="chev">›</span>' : ''}`;
  return act ? `<button class="lrow ${cls}" data-act="${act}"${attrs(data)}>${inner}</button>` : `<div class="lrow ${cls}">${inner}</div>`;
}

export const list = (rows) => `<div class="list">${rows.join('')}</div>`;

// Aufklappbarer Abschnitt; Zustand liegt in ui.open
export function section(ui, id, title, body, { count = null, open = false } = {}) {
  const isOpen = ui.open[id] ?? open;
  return `<div class="section ${isOpen ? 'open' : ''}"><button class="sec-h" data-act="toggle" data-id="${id}">
    <span>${title}${count != null ? ` <span class="cnt">${count}</span>` : ''}</span><span class="caret">${isOpen ? '▾' : '▸'}</span></button>
    ${isOpen ? `<div class="sec-b">${body}</div>` : ''}</div>`;
}

// Gestapelter Balken (z. B. VRAM: Gewichte | Gradienten | Optimizer | Aktivierungen) mit Kapazitäts-Linie
export function stackBar(parts, cap, fmt) {
  const total = parts.reduce((a, p) => a + p.v, 0);
  const max = Math.max(cap, total) || 1;
  const segs = parts.map((p) => `<i class="${p.cls}" style="width:${((p.v / max) * 100).toFixed(2)}%"></i>`).join('');
  const marker = cap > 0 ? `<b style="left:${((cap / max) * 100).toFixed(2)}%"></b>` : '';
  const legend = parts.filter((p) => p.v > 0).map((p) => `<span><i class="${p.cls}"></i>${p.label} ${fmt(p.v)}</span>`).join('');
  return `<div class="stack ${total > cap ? 'over' : ''}"><div class="track">${segs}${marker}</div><div class="legend">${legend}</div></div>`;
}

// Sparkline (Loss-Kurve)
export function spark(points, { w = 320, h = 64, cls = '' } = {}) {
  if (points.length < 2) return '';
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((v, i) => `${((i / (points.length - 1)) * w).toFixed(1)},${(h - 4 - ((v - min) / span) * (h - 8)).toFixed(1)}`);
  return `<svg class="spark ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${xy.join(' ')}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

// Schritt-Anzeige im Wizard
export function steps(labels, cur, act) {
  return `<div class="steps">${labels.map((l, i) =>
    `<button class="${i === cur ? 'on' : i < cur ? 'done' : ''}" data-act="${act}" data-id="${i}"><span>${i < cur ? '✓' : i + 1}</span>${l}</button>`).join('')}</div>`;
}

// Faktor-Zeile (0–1) mit Mini-Balken
export function factor(label, v, hint = '') {
  const cls = v >= 0.97 ? 'ok' : v >= 0.8 ? 'mid' : 'low';
  return `<div class="factor ${cls}"><span>${label}</span>${bar(v, true)}<span class="v">${Math.round(v * 100)} %</span>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
}

export function scoreChip(score, approx = false) {
  const s = Math.round(score);
  return chip(`${approx ? '~' : ''}${s}`, s >= 85 ? 'green' : s >= 60 ? 'blue' : 'amber');
}

export const check = ([text, ok]) => chip(`${ok ? '✓' : '✗'} ${text}`, ok ? 'green' : 'red');
