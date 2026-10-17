// Forschung: Punkte sammeln, Knoten abschließen, Tech-Level je Kategorie.
import { RESEARCH as RCFG } from '../../config/balance.js';
import { RESEARCH, NODE, BRANCHES } from '../../config/research.js';
import { TYPE, PRODUCT_TYPES } from '../../config/productTypes.js';
import { FEATURES } from '../../config/features.js';
import { clamp } from '../util/math.js';
import { yf, fx, hasTech, note, sIdx, resetFxCache } from './core.js';
import { basePoints, roleKey, gainXp } from './staff.js';

export function nodeState(s, n) {
  if (s.research.done.includes(n.id)) return 'done';
  if (s.research.current === n.id) return 'active';
  if (yf(s) < n.year) return 'future';
  if (!n.req.every((r) => hasTech(s, r))) return 'locked';
  return 'available';
}

export function researchPointsPerWeek(s) {
  let pts = 0;
  for (const m of s.staff) if (m.assign === 'research') pts += basePoints(s, m) * (RCFG.roleFactor[roleKey(m)] ?? 0.4);
  return pts * (1 + fx(s, 'researchSpeed'));
}

export function startResearch(s, id) {
  const n = NODE[id];
  if (!n) return 'Unbekannt';
  const st = nodeState(s, n);
  if (st === 'active') return null;
  if (st !== 'available') return 'Noch nicht verfügbar';
  const paid = s.research.progress[id] !== undefined;
  if (!paid) {
    if (s.money < n.cost) return 'Zu wenig Geld';
    s.money -= n.cost;
    s.research.progress[id] = 0;
  }
  s.research.current = id;
  return null;
}

export function addResearchPoints(s, pts) {
  const id = s.research.current;
  if (!id) return;
  s.research.progress[id] = (s.research.progress[id] || 0) + pts;
  if (s.research.progress[id] >= NODE[id].pts) completeResearch(s, id);
}

export function completeResearch(s, id) {
  if (!s.research.done.includes(id)) s.research.done.push(id);
  delete s.research.progress[id];
  if (s.research.current === id) s.research.current = null;
  resetFxCache();
  const n = NODE[id];
  const unlocks = unlocksOf(id);
  note(s, '🔬', `Forschung abgeschlossen: ${n.name}${unlocks.length ? ' → ' + unlocks.join(', ') : ''}`, true);
}

export function unlocksOf(id) {
  const out = [];
  for (const t of PRODUCT_TYPES) if (t.unlock === id) out.push(t.name);
  const feats = FEATURES.filter((f) => f.tech === id);
  if (feats.length) out.push(`${feats.length} Feature${feats.length > 1 ? 's' : ''}`);
  if (id === 'net_webapps') out.push('Plattform Web');
  return out;
}

export function tickResearch(s) {
  const id = s.research.current;
  if (!id) return;
  let pts = 0;
  for (const m of s.staff) {
    if (m.assign !== 'research') continue;
    const p = basePoints(s, m) * (RCFG.roleFactor[roleKey(m)] ?? 0.4);
    pts += p;
    gainXp(s, m, p * 0.8);
  }
  addResearchPoints(s, pts * (1 + fx(s, 'researchSpeed')));
}

// Tech-Level für eine Kategorie: erforschte vs. "erwartete" Knoten in den relevanten Branches
export function techFit(s, cat) {
  const branches = TYPE[cat].branches;
  const nodes = RESEARCH.filter((n) => branches.includes(n.branch));
  const expected = nodes.filter((n) => n.year <= yf(s) - 2).length;
  if (!expected) return 1;
  const done = nodes.filter((n) => s.research.done.includes(n.id)).length;
  return clamp(done / expected, 0.3, 1.1);
}

export { BRANCHES };
