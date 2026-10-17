import { RESEARCH_TREE } from '../../config/research.js';
import { RESEARCH } from '../../config/formulas.js';

// Fasst die Effekte aller abgeschlossenen Forschungen zusammen.
export function effects(state) {
  const e = { maxParams: 0, util: 0, failRed: 0, quality: 0, taskLoss: {}, skills: {}, features: new Set() };
  for (const id of state.research.done) {
    const fx = RESEARCH_TREE[id]?.effects || {};
    if (fx.maxParams) e.maxParams = Math.max(e.maxParams, fx.maxParams);
    e.util += fx.util || 0;
    e.failRed += fx.failRed || 0;
    e.quality += fx.quality || 0;
    for (const [k, v] of Object.entries(fx.taskLoss || {})) e.taskLoss[k] = (e.taskLoss[k] || 0) + v;
    for (const [k, v] of Object.entries(fx.skills || {})) e.skills[k] = (e.skills[k] || 0) + v;
    for (const f of fx.features || []) e.features.add(f);
  }
  return e;
}

export const isDone = (state, id) => state.research.done.includes(id);

export function isAvailable(state, id) {
  const n = RESEARCH_TREE[id];
  return !isDone(state, id) && n.req.every((r) => isDone(state, r));
}

export function pointsPerWeek(state) {
  return RESEARCH.founderPoints + state.staff.researcher * RESEARCH.researcherPoints;
}

export function startResearch(state, id) {
  if (!isAvailable(state, id)) return;
  if (state.research.current !== id) {
    state.research.current = id;
    state.research.progress = 0;
  }
}

export function tickResearch(state, events) {
  const id = state.research.current;
  if (!id) return;
  state.research.progress += pointsPerWeek(state);
  const node = RESEARCH_TREE[id];
  if (state.research.progress >= node.cost) {
    state.research.done.push(id);
    state.research.current = null;
    state.research.progress = 0;
    events.push({ type: 'research', text: `Forschung fertig: ${node.name}`, important: true });
  }
}
