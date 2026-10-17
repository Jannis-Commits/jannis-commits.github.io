// Zufalls-Events: Auswahl, Ziel bestimmen, Optionen auswerten (fx-Interpreter).
import { EVENTS as ECFG, STAFF } from '../../config/balance.js';
import { EVENTS, EVENT } from '../../config/events.js';
import { TYPE } from '../../config/productTypes.js';
import { HARDWARE } from '../../config/offices.js';
import { clamp } from '../util/math.js';
import { rand, chance, pick, weighted } from '../util/rng.js';
import { yf, sIdx, fx, nid, freeSeats, note, log, productById, staffById, rivalById } from './core.js';
import { avgMorale, fairSalary } from './staff.js';
import { addResearchPoints } from './research.js';
import { NODE } from '../../config/research.js';
import { playerRank } from './rivals.js';
import { updateRating } from './projects.js';
import { avgOf } from './rivals.js';
import { hwAvailable } from './office.js';

const own = (s) => s.products.filter((p) => p.owner === 'player' && TYPE[p.cat].group !== 'store');

// Helfer für cond()-Funktionen in config/events.js
export const H = {
  totalUsers: (s) => own(s).reduce((a, p) => a + p.users, 0),
  bestRating: (s) => Math.max(0, ...own(s).map((p) => p.rating)),
  worstRating: (s) => Math.min(5, ...own(s).map((p) => p.rating)),
  bestStaff: (s) => s.staff.filter((m) => !m.founder && m.skill >= 55).sort((a, b) => b.skill - a.skill)[0] || null,
  freeSeats: (s) => freeSeats(s),
  avgMorale: (s) => avgMorale(s),
  canUpgradeHw: (s) => hwAvailable(s, s.hardware + 1) && yf(s) - HARDWARE[s.hardware + 1].year < 3 && s.staff.length >= 2,
  rivalAlive: (s, id) => s.rivals.some((r) => r.id === id && r.alive && r.active),
  playerRank: (s) => playerRank(s),
};

function scale(s) {
  return Math.max(1500 * sIdx(s), avgOf(s.finance.revHist, 0, 8));
}

function pickTarget(s, e) {
  const ctx = {};
  const t = e.target;
  if (t) {
    let list = [];
    if (t === 'product') list = own(s).filter((p) => p.users > 100);
    if (t === 'onlineProduct') list = own(s).filter((p) => ['web', 'os'].includes(TYPE[p.cat].group) || ['subscription', 'freemium', 'ads'].includes(p.model));
    if (t === 'bizProduct') list = own(s).filter((p) => p.aud === 'b' || p.model === 'license');
    if (t === 'ossProduct') list = own(s).filter((p) => p.model === 'openSource');
    if (t === 'staff') list = e.id === 'poach' ? [H.bestStaff(s)].filter(Boolean) : s.staff.filter((m) => !m.founder);
    if (!list.length) return null;
    const x = pick(s, list);
    if (t === 'staff') ctx.staffId = x.id;
    else ctx.productId = x.id;
  }
  if (e.needRival) {
    let rs = s.rivals.filter((r) => r.alive && r.active);
    if (e.needRival === 'big') rs = rs.filter((r) => r.value > s.finance.value * 3);
    else if (typeof e.needRival === 'string') rs = rs.filter((r) => r.id === e.needRival);
    if (!rs.length) return null;
    ctx.rivalId = pick(s, rs).id;
  }
  return ctx;
}

export function eventText(s, e, ctx, text = e.text) {
  return text
    .replace('{product}', productById(s, ctx.productId)?.name || 'dein Produkt')
    .replace('{staff}', staffById(s, ctx.staffId)?.name || 'jemand')
    .replace('{rival}', rivalById(s, ctx.rivalId)?.name || 'Ein Konkurrent');
}

function eligible(s, e) {
  const y = yf(s);
  if (e.year && y < e.year) return false;
  if (e.until && y >= e.until + 1) return false;
  if (e.once && s.events.seen[e.id]) return false;
  if (!e.once && s.week - (s.events.cooldown[e.id] ?? -999) < ECFG.cooldownWeeks) return false;
  if (e.cond && !e.cond(s, H)) return false;
  return true;
}

export function tickEvents(s) {
  if (s.week < ECFG.startWeek || s.queue.some((q) => q.type === 'event')) return;
  // Pflicht-Events (z. B. Kartellklage, einmalige Weltereignisse) haben hohes Gewicht
  if (!chance(s, ECFG.chancePerWeek)) return;
  const pool = [];
  for (const e of EVENTS) {
    if (!eligible(s, e)) continue;
    let w = e.weight ?? 1;
    if (e.id === 'security_hole' || e.id === 'data_leak') w *= Math.max(0.2, 1 - fx(s, 'security'));
    pool.push([e, w]);
  }
  for (let tries = 0; tries < 4 && pool.length; tries++) {
    const e = weighted(s, pool);
    const ctx = pickTarget(s, e);
    if (!ctx) { pool.splice(pool.findIndex(([x]) => x === e), 1); continue; }
    triggerEvent(s, e.id, ctx);
    return;
  }
}

export function triggerEvent(s, id, ctx = null) {
  const e = EVENT[id];
  ctx = ctx || pickTarget(s, e) || {};
  s.events.seen[id] = true;
  s.events.cooldown[id] = s.week;
  s.queue.push({ type: 'event', id, ctx });
}

export function resolveEvent(s, qi, optIdx) {
  const item = s.queue[qi];
  if (!item || item.type !== 'event') return null;
  const e = EVENT[item.id];
  const o = e.options[optIdx];
  s.queue.splice(qi, 1);
  let text = null;
  let effects = o.fx || {};
  if (o.chance !== undefined && rand(s) >= o.chance) {
    effects = o.fail || {};
    text = o.failText || 'Hat nicht geklappt.';
  }
  applyFx(s, effects, item.ctx || {});
  log(s, e.icon, `${e.title}: ${o.label}${text ? ' – ' + text : ''}`);
  return text;
}

export function applyFx(s, f, ctx) {
  const prod = ctx.productId ? productById(s, ctx.productId) : null;
  const member = ctx.staffId ? staffById(s, ctx.staffId) : null;
  if (f.cost) s.money -= f.cost * scale(s);
  if (f.gain) s.money += f.gain * scale(s);
  if (f.moneyPct) s.money += Math.abs(s.money) * f.moneyPct;
  if (f.rep) s.rep = clamp(s.rep + f.rep, 0, 100);
  if (f.fans) s.fans = Math.max(0, s.fans * (1 + f.fans) + (f.fans > 0 ? 50 : 0));
  if (f.morale) for (const m of s.staff) m.morale = clamp(m.morale + f.morale, 0, 100);
  if (f.hype) {
    if (prod) prod.hype += f.hype;
    else {
      for (const p of s.products) if (p.owner === 'player') p.hype += f.hype * 0.5;
      for (const p of s.projects) p.hype += f.hype;
    }
  }
  if (prod) {
    if (f.users) prod.users = Math.max(0, prod.users * (1 + f.users));
    if (f.bugs) prod.bugs = Math.max(0, prod.bugs + f.bugs);
    if (f.quality) prod.quality = Math.min(100, prod.quality + f.quality);
    if (f.rating) prod.baseRating = clamp(prod.baseRating + f.rating, 1, 5);
    updateRating(s, prod);
  } else if (f.bugs) {
    for (const p of s.products) if (p.owner === 'player') { p.bugs = Math.max(0, p.bugs + f.bugs / 2); updateRating(s, p); }
  }
  if (f.antitrust) s.antitrust = clamp(s.antitrust + f.antitrust, 0, 100);
  if (f.researchPts && s.research.current) addResearchPoints(s, NODE[s.research.current].pts * f.researchPts);
  if (f.crunchOff) s.crunch = false;
  if (f.preinstallOff) for (const p of s.products) if (p.owner === 'player') p.preinstall = false;
  if (f.staffLeave && member && !member.founder) s.staff = s.staff.filter((m) => m !== member);
  if (f.staffRaise && member) { member.salary = Math.round(member.salary * (1 + f.staffRaise)); member.morale = Math.min(100, member.morale + 15); }
  if (f.salaryAll) for (const m of s.staff) if (!m.founder) m.salary = Math.round(m.salary * (1 + f.salaryAll));
  if (f.hireStar && freeSeats(s) > 0) {
    const salary = fairSalary(s, 'dev', 90, 1.3) * 2;
    s.staff.push({ id: nid(s), name: 'Ada Kowalski', role: 'dev', skill: 90, speed: 1.3, salary, morale: 90, xp: 0, level: 5, assign: null, hired: s.week });
  }
  if (f.hwUpgrade && hwAvailable(s, s.hardware + 1)) {
    s.money -= HARDWARE[s.hardware + 1].cost * sIdx(s) * s.staff.length;
    s.hardware++;
  }
  if (f.flag) s.flags[f.flag.id] = s.week + f.flag.weeks;
  if (f.investorShare) s.finance.ownedShare = Math.min(1, s.finance.ownedShare + f.investorShare);
  if (f.gameOver) {
    s.gameOver = f.gameOver;
    s.queue.push({ type: 'gameover', reason: f.gameOver });
  }
}

export function tickFlags(s) {
  for (const [k, until] of Object.entries(s.flags)) if (s.week >= until) delete s.flags[k];
}

// Für die Anzeige: Optionsbeschreibung
export const eventById = (id) => EVENT[id];
