// Eine Runde = eine Woche. Feste Reihenfolge der Subsysteme.
import { TIME } from '../../config/balance.js';
import { note } from './core.js';
import { tickStaff } from './staff.js';
import { tickProjects, tickSupport } from './projects.js';
import { tickResearch } from './research.js';
import { tickMarket } from './market.js';
import { tickRivals } from './rivals.js';
import { tickEcosystem } from './ecosystem.js';
import { tickFinance } from './finance.js';
import { tickCampaigns } from './marketing.js';
import { tickEvents, tickFlags } from './events.js';
import { checkVictory, checkEra } from './victory.js';
import { clamp } from '../util/math.js';

export function advanceWeek(s) {
  if (s.gameOver || s.queue.length) return false;
  s.week++;
  s.report = { week: s.week, notes: [], income: 0, expense: 0 };

  tickFlags(s);
  tickCampaigns(s);
  tickProjects(s);
  tickSupport(s);
  tickResearch(s);
  tickMarket(s);
  tickRivals(s);
  tickEcosystem(s);
  tickReputation(s);
  tickFinance(s);
  tickStaff(s);
  checkEra(s);
  tickEvents(s);
  checkVictory(s);
  return true;
}

function tickReputation(s) {
  const own = s.products.filter((p) => p.owner === 'player');
  let newFans = 0;
  for (const p of own) newFans += (p.newUsers || 0) * 0.03 * Math.max(0, p.rating - 2.5) + (p.model === 'openSource' ? p.users * 0.0004 : 0);
  s.fans = Math.max(0, s.fans * 0.997 + newFans);
  if (!own.length) return;
  const users = own.reduce((a, p) => a + p.users, 0);
  const avgR = users > 0 ? own.reduce((a, p) => a + p.rating * p.users, 0) / users : own.reduce((a, p) => a + p.rating, 0) / own.length;
  const oss = own.filter((p) => p.model === 'openSource').length;
  const target = clamp(4 + (avgR - 3) * 15 + Math.log10(1 + users) * 3.2 + oss * 3, 0, 100);
  s.rep = clamp(s.rep + (target - s.rep) * 0.012, 0, 100);
}

// ⏩ Vorspulen bis etwas Wichtiges passiert
export function skipWeeks(s, max = TIME.skipMaxWeeks) {
  let n = 0;
  while (n < max) {
    if (!advanceWeek(s)) break;
    n++;
    if (s.queue.length || s.gameOver || s.report.notes.some((x) => x.stop)) break;
  }
  return n;
}
