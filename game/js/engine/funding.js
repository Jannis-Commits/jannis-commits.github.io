import { ROUNDS } from '../../config/funding.js';
import { gameYear } from '../util/format.js';
import { weeklyIncome } from './market.js';
import { totalUsers } from './products.js';
import { diff } from './difficulty.js';

// Finanzierungsrunden: eine nach der anderen, sobald die Bedingungen erfüllt sind.

export const nextRound = (state) => ROUNDS[state.funding.round];

export function roundChecks(state, r = nextRound(state)) {
  if (!r) return [];
  const q = r.req, out = [];
  const bestLlm = Math.max(0, ...state.models.filter((m) => m.task === 'llm' && m.status === 'ready' && m.origin !== 'open').map((m) => m.score));
  if (q.minYear) out.push([`ab ${Math.floor(q.minYear)}`, gameYear(state.week) >= q.minYear]);
  if (q.minModels) out.push([`${q.minModels} fertiges Modell`, state.models.filter((m) => m.status === 'ready').length >= q.minModels]);
  if (q.minIncome) out.push([`Einnahmen ≥ ${q.minIncome.toLocaleString('de-DE')} $/Wo`, weeklyIncome(state) >= q.minIncome]);
  if (q.minRep) out.push([`Ruf ≥ ${q.minRep}`, state.rep >= q.minRep]);
  if (q.minLlm) out.push([`eigenes LLM mit Score ≥ ${q.minLlm}`, bestLlm >= q.minLlm]);
  if (q.minUsers) out.push([`${q.minUsers.toLocaleString('de-DE')} Chat-Nutzer`, totalUsers(state) >= q.minUsers]);
  return out;
}

export const canRaise = (state) => !!nextRound(state) && roundChecks(state).every(([, ok]) => ok);

export function raise(state) {
  if (!canRaise(state)) return null;
  const r = nextRound(state);
  const amount = roundMoney(state, r);
  state.money += amount;
  state.funding.equity *= 1 - r.equity;
  state.funding.raised += amount;
  state.funding.round++;
  state.funding.history.push({ id: r.id, week: state.week, money: amount, equity: r.equity });
  return { ...r, money: amount };
}

export const roundMoney = (state, r) => Math.round(r.money * diff(state).funding);
export const valuation = (state, r) => roundMoney(state, r) / r.equity;
