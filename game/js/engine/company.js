import { LOCATIONS } from '../../config/locations.js';
import { CHASSIS } from '../../config/parts.js';
import { STAFF } from '../../config/staff.js';
import { ECONOMY } from '../../config/formulas.js';
import { gameYear } from '../util/format.js';
import { isDone } from './research.js';
import { usage, powerDraw, cloudWeekly } from './hardware.js';

export const location = (state) => LOCATIONS[state.location];

// ---------- Standort ----------

export function canMove(state, id) {
  const loc = LOCATIONS[id], u = usage(state);
  if (id === state.location) return 'Aktueller Ort';
  if (loc.research && !isDone(state, loc.research)) return 'Forschung fehlt';
  if (state.machines.some((m) => !loc.classes.includes(CHASSIS[m.chassis].cls))) return 'Server passen dort nicht hin';
  if (u.space > loc.space) return 'Hardware passt nicht';
  if (u.power > loc.power) return 'Zu wenig Strom';
  if (u.staff > loc.staff) return 'Zu wenig Plätze fürs Team';
  if (state.money < loc.rent * ECONOMY.moveDepositWeeks) return 'Kaution zu hoch';
  return null;
}

export function move(state, id) {
  if (canMove(state, id)) return;
  state.money -= LOCATIONS[id].rent * ECONOMY.moveDepositWeeks;
  state.location = id;
}

// ---------- Team ----------

export const salary = (state, role) => STAFF[role].salary * (1 + Math.max(0, gameYear(state.week) - ECONOMY.salaryFrom) * ECONOMY.salaryGrowth);

export function canHire(state, role) {
  if (usage(state).staff >= location(state).staff) return 'Kein Platz im Büro';
  if (state.money < salary(state, role) * 2) return 'Zu wenig Geld';
  return null;
}

export function hire(state, role, n = 1) {
  for (let i = 0; i < n && !canHire(state, role); i++) state.staff[role]++;
}

export function fire(state, role, n = 1) {
  state.staff[role] = Math.max(0, state.staff[role] - n);
}

// ---------- Kosten ----------

export function hostingCost(model) {
  return (model.params / 1e9) * ECONOMY.hostingPerBillionParams * ((model.bits || 16) / 16);
}

export function weeklyCosts(state) {
  const loc = location(state);
  const rent = loc.rent;
  const salaries = Object.keys(state.staff).reduce((a, r) => a + salary(state, r) * state.staff[r], 0);
  const power = powerDraw(state) * 168 * ECONOMY.powerPrice * loc.cooling;
  const cloud = state.cloud.reduce((a, c) => a + c.n * cloudWeekly(state, c.offer), 0);
  const hosting = Object.values(state.apps).reduce((a, id) => {
    const m = state.models.find((x) => x.id === id);
    return a + (m ? hostingCost(m) : 0);
  }, 0);
  return { rent, salaries, power, cloud, hosting, total: rent + salaries + power + cloud + hosting };
}
