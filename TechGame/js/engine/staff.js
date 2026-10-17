// Team: Bewerber, Einstellen, Moral, Erfahrung, Kündigungen.
import { START, STAFF, WORK } from '../../config/balance.js';
import { ROLE, ROLES, ROLE_WEIGHTS, FIRST_NAMES, LAST_NAMES } from '../../config/roles.js';
import { HARDWARE } from '../../config/offices.js';
import { rand, gauss, pick, weighted, chance, randInt } from '../util/rng.js';
import { clamp } from '../util/math.js';
import { nid, sIdx, yf, fx, office, freeSeats, hwBonus, note, log, projectById, productById } from './core.js';

export function makeFounder(s) {
  return {
    id: nid(s), name: START.founderName, role: 'dev', founder: true,
    skill: START.founderSkill + (s.boosts.includes('founder') ? 20 : 0), speed: START.founderSpeed,
    morale: 85, salary: 0, xp: 0, level: 1, assign: null, hired: 0,
  };
}

export function fairSalary(s, role, skill, speed = 1) {
  return Math.round(ROLE[role].salary * sIdx(s) * (0.55 + skill / 110) * (0.9 + speed / 10) * (1 + fx(s, 'salary')));
}

function makeApplicant(s, role) {
  const r = role || weighted(s, Object.entries(ROLE_WEIGHTS));
  const mean = 30 + s.rep * 0.32 + s.office * 3.5 + (yf(s) - 1985) * 0.25;
  const skill = Math.round(clamp(gauss(s, mean, 12), 8, 96));
  const speed = Math.round(clamp(gauss(s, 1, 0.14), 0.65, 1.45) * 100) / 100;
  return {
    id: nid(s), name: `${pick(s, FIRST_NAMES)} ${pick(s, LAST_NAMES)}`, role: r,
    skill, speed, salary: Math.round(fairSalary(s, r, skill, speed) * (0.9 + rand(s) * 0.25)),
  };
}

export function refreshApplicants(s) {
  s.applicants = [];
  for (let i = 0; i < STAFF.applicants; i++) s.applicants.push(makeApplicant(s));
  s.applicantsWeek = s.week;
}

export const searchCost = (s) => Math.round(STAFF.searchCost * sIdx(s));

export function searchApplicants(s) {
  const c = searchCost(s);
  if (s.money < c) return 'Zu wenig Geld';
  s.money -= c;
  refreshApplicants(s);
  return null;
}

export const hireFee = (s, a) => Math.round(a.salary * STAFF.hireFeeWeeks + (HARDWARE[s.hardware].cost * sIdx(s)) * 0.5);

function addStaff(s, a) {
  const m = {
    id: a.id, name: a.name, role: a.role, skill: a.skill, speed: a.speed, salary: a.salary,
    morale: 75, xp: 0, level: 1, assign: a.role === 'research' ? 'research' : null, hired: s.week,
  };
  s.staff.push(m);
  return m;
}

export function hire(s, appId) {
  const a = s.applicants.find((x) => x.id === appId);
  if (!a) return 'Bewerber nicht gefunden';
  if (freeSeats(s) <= 0) return 'Kein Platz im Büro – zieh um!';
  const fee = hireFee(s, a);
  if (s.money < fee) return 'Zu wenig Geld';
  s.money -= fee;
  s.applicants = s.applicants.filter((x) => x.id !== appId);
  addStaff(s, a);
  return null;
}

// Mehrere Leute einer Rolle auf einmal (generische Bewerber)
export function bulkCost(s, role, n) {
  let total = 0;
  const salary = fairSalary(s, role, 30 + s.rep * 0.32 + s.office * 3.5 + (yf(s) - 1985) * 0.25);
  total = n * Math.round(salary * STAFF.hireFeeWeeks + HARDWARE[s.hardware].cost * sIdx(s) * 0.5);
  return { total, salary };
}

export function hireBulk(s, role, n) {
  n = Math.min(n, freeSeats(s));
  if (n <= 0) return 'Kein Platz im Büro';
  const { total } = bulkCost(s, role, n);
  if (s.money < total) return 'Zu wenig Geld';
  s.money -= total;
  for (let i = 0; i < n; i++) addStaff(s, makeApplicant(s, role));
  return null;
}

export function fire(s, id) {
  const m = s.staff.find((x) => x.id === id);
  if (!m || m.founder) return 'Geht nicht';
  s.money -= m.salary * 2;
  s.staff = s.staff.filter((x) => x.id !== id);
  for (const o of s.staff) o.morale = Math.max(0, o.morale - 2);
  return null;
}

export function raise(s, id) {
  const m = s.staff.find((x) => x.id === id);
  if (!m || m.founder) return 'Geht nicht';
  m.salary = Math.round(m.salary * (1 + STAFF.raiseFactor));
  m.morale = Math.min(100, m.morale + STAFF.raiseMorale);
  return null;
}

export function assign(s, id, target) {
  const m = s.staff.find((x) => x.id === id);
  if (!m) return;
  m.assign = target || null;
}

// Leistung einer Person pro Woche (ohne Rollen-Gewichtung)
export function basePoints(s, m) {
  const moraleF = 0.6 + m.morale / 250;
  const crunch = s.crunch ? WORK.crunchSpeed : 1;
  return WORK.pointsPerWeek * m.speed * (0.5 + m.skill / 100) * hwBonus(s) * moraleF * crunch;
}

export const roleKey = (m) => (m.founder ? 'founder' : m.role);

// Marketing-/Sales-Stärke der Firma (wirkt global)
export function teamPower(s, role) {
  let p = 0;
  for (const m of s.staff) if (m.role === role && !m.founder) p += (m.skill / 100) * m.speed * (0.6 + m.morale / 250);
  return p;
}

export function weeklySalaries(s) {
  let t = 0;
  for (const m of s.staff) t += m.salary;
  return t;
}

export const avgMorale = (s) => s.staff.reduce((a, m) => a + m.morale, 0) / Math.max(1, s.staff.length);

export function gainXp(s, m, pts) {
  m.xp += pts;
  const need = STAFF.xpPerLevel * m.level;
  if (m.xp >= need && m.level < STAFF.maxLevel) {
    m.xp -= need;
    m.level++;
    m.skill = Math.min(100, m.skill + randInt(s, ...STAFF.skillPerLevel));
    if (!m.founder) m.salary = Math.round(m.salary * (1 + STAFF.salaryRaisePerLevel));
    if (m.founder || m.level % 5 === 0) log(s, '⬆️', `${m.name} ist jetzt Level ${m.level} (Skill ${m.skill})`);
  }
}

export function tickStaff(s) {
  // ungültige Zuweisungen aufräumen
  for (const m of s.staff) {
    if (!m.assign) continue;
    if (m.assign.startsWith('p:') && !projectById(s, +m.assign.slice(2))) m.assign = null;
    if (m.assign.startsWith('s:')) {
      const p = productById(s, +m.assign.slice(2));
      if (!p || p.owner !== 'player') m.assign = null;
    }
  }

  const base = STAFF.moraleBase + office(s).morale + fx(s, 'morale') + (s.crunch ? WORK.crunchMorale : 0) + (s.flags.pandemicMorale || 0);
  const leaving = [];
  for (const m of s.staff) {
    let target = base;
    if (!m.founder) {
      const fair = fairSalary(s, m.role, m.skill, m.speed);
      target += clamp((m.salary / fair - 1) * 40, -15, 15);
      if (!m.assign && ROLE[m.role].work) target -= 4;
    } else {
      target += 10;
    }
    m.morale = clamp(m.morale + (target - m.morale) * 0.15, 0, 100);
    if (!m.founder && m.morale < STAFF.quitMorale && chance(s, STAFF.quitChance)) leaving.push(m);
  }
  for (const m of leaving) {
    s.staff = s.staff.filter((x) => x !== m);
    note(s, '🚪', `${m.name} (${ROLE[m.role].short}) hat gekündigt – Moral zu niedrig.`);
  }

  if (s.week - s.applicantsWeek >= STAFF.refreshWeeks) refreshApplicants(s);
}

export const ROLE_LIST = ROLES;
