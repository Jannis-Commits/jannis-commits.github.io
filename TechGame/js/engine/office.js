// Büro & Hardware
import { OFFICES, HARDWARE } from '../../config/offices.js';
import { sIdx, yf, note } from './core.js';

export const moveCost = (s, idx) => Math.round(OFFICES[idx].cost * sIdx(s));

export function moveOffice(s, idx) {
  if (idx <= s.office || !OFFICES[idx]) return 'Geht nicht';
  const c = moveCost(s, idx);
  if (s.money < c) return 'Zu wenig Geld';
  s.money -= c;
  s.office = idx;
  for (const m of s.staff) m.morale = Math.min(100, m.morale + 6);
  note(s, OFFICES[idx].icon, `Umzug ins ${OFFICES[idx].name}! Platz für ${OFFICES[idx].seats} Leute.`);
  return null;
}

export function downsizeOffice(s, idx) {
  if (idx >= s.office || idx < 0) return 'Geht nicht';
  if (s.staff.length > OFFICES[idx].seats) return 'Zu viele Mitarbeiter für das kleinere Büro';
  s.office = idx;
  return null;
}

export const hwAvailable = (s, idx) => HARDWARE[idx] && yf(s) >= HARDWARE[idx].year;
export const hwCost = (s, idx) => Math.round(HARDWARE[idx].cost * sIdx(s) * Math.max(1, s.staff.length));

export function upgradeHardware(s, idx) {
  if (idx <= s.hardware || !hwAvailable(s, idx)) return 'Nicht verfügbar';
  const c = hwCost(s, idx);
  if (s.money < c) return 'Zu wenig Geld';
  s.money -= c;
  s.hardware = idx;
  for (const m of s.staff) m.morale = Math.min(100, m.morale + 4);
  note(s, HARDWARE[idx].icon, `Neue Hardware: ${HARDWARE[idx].name} für alle.`);
  return null;
}
