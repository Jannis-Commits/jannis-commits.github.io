import { RESEARCH_TREE } from '../../config/research.js';
import { RESEARCH } from '../../config/formulas.js';
import { gameYear } from '../util/format.js';
import { diff } from './difficulty.js';

// Fasst die Effekte aller abgeschlossenen Forschungen zusammen (pro Woche gecacht).
let cache = { key: '', fx: null };

export function effects(state) {
  const key = state.research.done.join(',');
  if (cache.key === key) return cache.fx;
  const e = { maxParams: 0, util: 0, failRed: 0, quality: 0, capMult: 1, quantLevel: 0, cluster: 0, taskLoss: {}, skills: {}, features: new Set() };
  for (const id of state.research.done) {
    const fx = RESEARCH_TREE[id]?.effects || {};
    if (fx.maxParams) e.maxParams = Math.max(e.maxParams, fx.maxParams);
    e.util += fx.util || 0;
    e.failRed += fx.failRed || 0;
    e.quality += fx.quality || 0;
    e.cluster += fx.cluster || 0;
    e.quantLevel = Math.max(e.quantLevel, fx.quantLevel || 0);
    e.capMult *= 1 - (fx.capBoost || 0);
    for (const [k, v] of Object.entries(fx.taskLoss || {})) e.taskLoss[k] = (e.taskLoss[k] || 0) + v;
    for (const [k, v] of Object.entries(fx.skills || {})) e.skills[k] = (e.skills[k] || 0) + v;
    for (const f of fx.features || []) e.features.add(f);
  }
  cache = { key, fx: e };
  return e;
}

export const has = (state, feature) => effects(state).features.has(feature);
export const isDone = (state, id) => state.research.done.includes(id);

export const tooEarly = (state, id) => (RESEARCH_TREE[id].year || 0) > gameYear(state.week);

export function isAvailable(state, id) {
  const n = RESEARCH_TREE[id];
  return !isDone(state, id) && !tooEarly(state, id) && n.req.every((r) => isDone(state, r));
}

export function pointsPerWeek(state) {
  return Math.round((RESEARCH.founderPoints + state.staff.researcher * RESEARCH.researcherPoints) * diff(state).research);
}

// Erforschen: läuft schon etwas, kommt es in die Warteschlange.
export function startResearch(state, id) {
  const r = state.research;
  if (!isAvailable(state, id) || r.current === id || r.queue.includes(id)) return;
  if (!r.current) { r.current = id; r.progress = 0; return; }
  if (r.queue.length < RESEARCH.queueMax) r.queue.push(id);
}

export function unqueue(state, id) {
  state.research.queue = state.research.queue.filter((x) => x !== id);
}

export function tickResearch(state, events, bonus = 0) {
  const r = state.research;
  if (!r.current) return;
  r.progress += pointsPerWeek(state) + bonus;
  const node = RESEARCH_TREE[r.current];
  if (r.progress < node.cost) return;
  r.done.push(r.current);
  events.push({ type: 'research', text: `Forschung fertig: ${node.name}`, important: true });
  const rest = r.progress - node.cost;
  r.current = null;
  r.progress = 0;
  // Nächstes aus der Warteschlange (übersprungen, wenn es noch zu früh ist)
  r.queue = r.queue.filter((q) => !isDone(state, q));
  const next = r.queue.find((q) => isAvailable(state, q));
  if (next) {
    r.queue = r.queue.filter((q) => q !== next);
    r.current = next;
    r.progress = rest;
  }
}
