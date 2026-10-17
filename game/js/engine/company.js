import { HARDWARE, CLOUD, CLOUD_MAX } from '../../config/hardware.js';
import { LOCATIONS } from '../../config/locations.js';
import { STAFF } from '../../config/staff.js';
import { COMPUTE, ECONOMY, QUANT } from '../../config/formulas.js';
import { gameYear } from '../util/format.js';
import { effects, isDone } from './research.js';

export const location = (state) => LOCATIONS[state.location];

export function usage(state) {
  let space = 0, power = 0, tflops = 0;
  for (const [id, n] of Object.entries(state.hardware)) {
    const h = HARDWARE[id];
    space += h.space * n;
    power += h.power * n;
    tflops += h.tflops * n;
  }
  const staff = state.staff.engineer + state.staff.researcher;
  return { space, power, tflops, staff };
}

export function cloudType(state) {
  const y = gameYear(state.week);
  return [...CLOUD].reverse().find((c) => y >= c.year) || CLOUD[0];
}

export const cloudWeeklyPrice = (state) => cloudType(state).pricePerHour * 168;

export function utilization(state) {
  const e = effects(state);
  const eng = Math.min(state.staff.engineer * COMPUTE.engineerUtil, COMPUTE.engineerUtilCap);
  return Math.min(0.9, COMPUTE.baseUtilization + e.util + eng);
}

// FLOP pro Woche, die ins Training gehen
export function weeklyCompute(state) {
  const own = usage(state).tflops;
  const cloud = state.cloudGpus * cloudType(state).tflops;
  return (own + cloud) * 1e12 * utilization(state) * COMPUTE.secondsPerWeek;
}

export function hardwareAvailable(state, id) {
  const h = HARDWARE[id];
  if (h.cost === 0) return false;
  if (h.year && gameYear(state.week) < h.year) return false;
  if (h.research && !isDone(state, h.research)) return false;
  return true;
}

export function canBuyHardware(state, id) {
  const h = HARDWARE[id], loc = location(state), u = usage(state);
  if (!hardwareAvailable(state, id)) return 'Nicht verfügbar';
  if (state.money < h.cost) return 'Zu wenig Geld';
  if (u.space + h.space > loc.space) return 'Kein Platz';
  if (u.power + h.power > loc.power) return 'Zu wenig Strom';
  return null;
}

export function buyHardware(state, id) {
  if (canBuyHardware(state, id)) return;
  state.money -= HARDWARE[id].cost;
  state.hardware[id] = (state.hardware[id] || 0) + 1;
}

export function sellHardware(state, id) {
  const h = HARDWARE[id];
  if (!state.hardware[id] || h.sellable === false) return;
  state.hardware[id]--;
  if (!state.hardware[id]) delete state.hardware[id];
  state.money += h.cost * ECONOMY.sellRefund;
}

export function canMove(state, id) {
  const loc = LOCATIONS[id], u = usage(state);
  if (id === state.location) return 'Aktueller Ort';
  if (loc.research && !isDone(state, loc.research)) return 'Forschung fehlt';
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

export function setCloud(state, n) {
  state.cloudGpus = Math.max(0, Math.min(CLOUD_MAX, n));
}

export function canHire(state, role) {
  if (usage(state).staff >= location(state).staff) return 'Kein Platz im Büro';
  if (state.money < STAFF[role].salary) return 'Zu wenig Geld';
  return null;
}

export function hire(state, role) {
  if (!canHire(state, role)) state.staff[role]++;
}

export function fire(state, role) {
  if (state.staff[role] > 0) state.staff[role]--;
}

export function hostingCost(model) {
  const q = model.bits ? QUANT[model.bits].hosting : 1;
  return (model.params / 1e9) * ECONOMY.hostingPerBillionParams * q;
}

// Laufende Kosten pro Woche, aufgeschlüsselt
export function weeklyCosts(state) {
  const loc = location(state), u = usage(state);
  const rent = loc.rent;
  const salaries = Object.entries(state.staff).reduce((a, [r, n]) => a + STAFF[r].salary * n, 0);
  const power = u.power * 168 * ECONOMY.powerPrice * loc.cooling;
  const cloud = state.cloudGpus * cloudWeeklyPrice(state);
  const hosting = Object.values(state.apps).reduce((a, id) => {
    const m = state.models.find((x) => x.id === id);
    return a + (m ? hostingCost(m) : 0);
  }, 0);
  return { rent, salaries, power, cloud, hosting, total: rent + salaries + power + cloud + hosting };
}
