// Siegbedingung & Prestige
import { VICTORY } from '../../config/balance.js';
import { BOOSTS } from '../../config/prestige.js';
import { ERAS } from '../../config/eras.js';
import { rand } from '../util/rng.js';
import { yf, note } from './core.js';
import { playerRank } from './rivals.js';
import { ownOSShare } from './market.js';
import { loadMeta, saveMeta } from '../state.js';

export function victoryStatus(s) {
  const rank = playerRank(s);
  const osShare = Math.max(ownOSShare(s, 'os_desktop'), ownOSShare(s, 'os_mobile'));
  return { rank, osShare, rankOk: rank <= VICTORY.needRank, osOk: osShare >= VICTORY.osShare };
}

export function checkVictory(s) {
  if (s.won) return;
  const v = victoryStatus(s);
  if (v.rankOk && v.osOk) {
    s.won = true;
    const pool = BOOSTS.filter((b) => !s.boosts.includes(b.id));
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rand(s) * pool.length), 1)[0].id);
    s.queue.push({ type: 'victory', picks });
    note(s, '👑', 'Du bist das größte Software-Unternehmen der Welt!', true);
  }
}

export function chooseBoost(id) {
  const meta = loadMeta();
  meta.prestige = (meta.prestige || 0) + 1;
  if (id && !meta.boosts.includes(id)) meta.boosts.push(id);
  saveMeta(meta);
  return meta;
}

export function checkEra(s) {
  const current = [...ERAS].reverse().find((e) => yf(s) >= e.year);
  if (current && current.id !== s.era) {
    s.era = current.id;
    s.queue.push({ type: 'era', id: current.id });
    note(s, current.icon, `Neue Ära: ${current.name}`, true);
  }
}
