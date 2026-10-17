// Gemeinsame Helfer der Engine (ohne DOM).
import { salaryIndex, workIndex } from '../../config/balance.js';
import { TYPE } from '../../config/productTypes.js';
import { NODE } from '../../config/research.js';
import { BOOST } from '../../config/prestige.js';
import { OFFICES, HARDWARE, HW_AGING } from '../../config/offices.js';
import { yearOf, yearFrac } from '../util/format.js';

export const year = (s) => yearOf(s.week);
export const yf = (s) => yearFrac(s.week);
export const sIdx = (s) => salaryIndex(yf(s));
export const wIdx = (s) => workIndex(yf(s));

export const nid = (s) => s.nextId++;
export const hasTech = (s, id) => !id || s.research.done.includes(id);

// Summe eines Effekts aus Forschung + Prestige-Boosts (gecacht pro Zustand der Listen)
const fxCache = { key: '', map: {} };
export function fx(s, key) {
  const k = `${s.research.done.length}|${s.boosts.join(',')}`;
  if (fxCache.key !== k || fxCache.ref !== s) {
    const map = {};
    for (const id of s.research.done) for (const [fk, v] of Object.entries(NODE[id]?.fx || {})) map[fk] = (map[fk] || 0) + v;
    for (const id of s.boosts) for (const [fk, v] of Object.entries(BOOST[id]?.fx || {})) map[fk] = (map[fk] || 0) + v;
    fxCache.key = k;
    fxCache.ref = s;
    fxCache.map = map;
  }
  return fxCache.map[key] || 0;
}
export const resetFxCache = () => { fxCache.key = ''; };

export const office = (s) => OFFICES[s.office];
export const seats = (s) => OFFICES[s.office].seats;
export const freeSeats = (s) => seats(s) - s.staff.length;

export function hwBonus(s) {
  const hw = HARDWARE[s.hardware];
  const age = Math.max(0, yf(s) - hw.year - HW_AGING.graceYears);
  return hw.bonus * Math.max(HW_AGING.floor, 1 - age * HW_AGING.perYear);
}

export const playerProducts = (s) => s.products.filter((p) => p.owner === 'player');
export const productById = (s, id) => s.products.find((p) => p.id === id);
export const projectById = (s, id) => s.projects.find((p) => p.id === id);
export const staffById = (s, id) => s.staff.find((m) => m.id === id);
export const rivalById = (s, id) => s.rivals.find((r) => r.id === id);

// Eigene Betriebssysteme des Spielers (auch per Übernahme erworbene)
export const playerOS = (s, cat) => s.products.filter((p) => p.owner === 'player' && p.cat === cat);
export const hasOwnOS = (s) => s.products.some((p) => p.owner === 'player' && TYPE[p.cat].group === 'os');

export function catUnlocked(s, cat) {
  const t = TYPE[cat];
  if (yf(s) < t.year || !hasTech(s, t.unlock)) return false;
  if (t.group === 'store') return hasOwnOS(s) && !s.products.some((p) => p.owner === 'player' && p.cat === 'app_store');
  return true;
}

export function log(s, icon, text) {
  s.log.unshift({ w: s.week, icon, text });
  if (s.log.length > 80) s.log.length = 80;
}

// Wichtige Meldung der aktuellen Woche (stop = ⏩ hält hier an)
export function note(s, icon, text, stop = false) {
  if (!s.report) s.report = { notes: [] };
  s.report.notes.push({ icon, text, stop });
  log(s, icon, text);
}

export function companyName(s, owner) {
  if (owner === 'player') return s.companyName;
  return rivalById(s, owner)?.name || owner;
}
