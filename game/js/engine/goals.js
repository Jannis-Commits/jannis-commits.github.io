import { GOALS } from '../../config/goals.js';
import { leaderboard } from './rivals.js';
import { totalUsers, chatModel } from './products.js';
import { isDone } from './research.js';

// Bedingungen der Ziele (gleiche Reihenfolge/IDs wie config/goals.js)
const own = (s) => s.models.filter((m) => m.status === 'ready');
const rank = (s) => { const i = leaderboard(s).findIndex((r) => r.mine); return i < 0 ? Infinity : i + 1; };

const CHECKS = {
  'buy-pc': (s) => s.machines.some((m) => m.chassis !== 'laptop'),
  'install-gpu': (s) => s.machines.some((m) => m.gpus.length > 0),
  'buy-data': (s) => s.datasets.length > 0,
  train: (s) => own(s).length > 0,
  deliver: (s) => s.stats.delivered > 0,
  app: (s) => Object.keys(s.apps).length > 0,
  hire: (s) => Object.values(s.staff).some((n) => n > 0),
  upgrade: (s) => s.stats.upgrades > 0,
  'two-gpus': (s) => s.machines.some((m) => m.gpus.length >= 2),
  funding: (s) => s.funding.round > 0,
  transformer: (s) => isDone(s, 'transformer'),
  llm: (s) => own(s).some((m) => m.task === 'llm' && m.origin === 'own'),
  quantize: (s) => s.models.some((m) => (m.bits || 16) < 16),
  server: (s) => s.machines.some((m) => ['server4u', 'hgx', 'nvl72'].includes(m.chassis)) || s.cloud.length > 0,
  sft: (s) => own(s).some((m) => m.stages?.includes('sft') && m.origin !== 'open'),
  chat: (s) => !!chatModel(s),
  users: (s) => totalUsers(s) >= 1e5,
  top10: (s) => rank(s) <= 10,
  top3: (s) => rank(s) <= 3,
  top1: (s) => rank(s) <= 1,
};

export const currentGoal = (state) => GOALS[state.goal];

// Erledigte Ziele abhaken (auch mehrere auf einmal). Gibt die erreichten zurück.
export function checkGoals(state) {
  const done = [];
  while (GOALS[state.goal] && CHECKS[GOALS[state.goal].id]?.(state)) {
    const g = GOALS[state.goal];
    state.money += g.reward;
    done.push(g);
    state.goal++;
  }
  return done;
}
