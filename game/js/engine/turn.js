import { ECONOMY } from '../../config/formulas.js';
import { tickResearch } from './research.js';
import { tickJob, tickQuick } from './training.js';
import { tickContracts, weeklyIncome } from './market.js';
import { weeklyCosts } from './company.js';
import { tickRivals } from './rivals.js';
import { tickProducts } from './products.js';
import { tickEvents } from './events.js';
import { checkGoals } from './goals.js';
import { canRaise } from './funding.js';
import { money } from '../util/format.js';

// Eine Woche simulieren. Gibt die Ereignisse der Woche zurück.
export function advanceWeek(state) {
  if (state.gameOver || state.pending.length) return [];
  const events = [];

  tickResearch(state, events, state.research.bonus || 0);
  state.research.bonus = 0;
  tickJob(state, events);
  tickQuick(state, events);

  const income = weeklyIncome(state);
  const costs = weeklyCosts(state);
  state.money += income - costs.total;

  tickProducts(state, events);

  state.week++;
  tickRivals(state, events);
  tickContracts(state);
  tickEvents(state, events);

  const couldRaise = state.fundingReady;
  state.fundingReady = canRaise(state);
  if (state.fundingReady && !couldRaise) events.push({ type: 'funding', text: 'Investoren klopfen an! Business → Firma.', important: true });

  for (const g of checkGoals(state)) {
    events.push({ type: 'goal', text: `Ziel erreicht: ${g.text}${g.reward ? ` (+${money(g.reward)})` : ''}`, important: true });
  }

  if (state.money < 0) {
    state.negWeeks++;
    const left = ECONOMY.bankruptWeeks - state.negWeeks;
    if (left <= 0) {
      state.gameOver = true;
      events.push({ type: 'gameover', text: 'Pleite! Deine Firma ist insolvent.', important: true });
    } else {
      events.push({ type: 'warn', text: `Konto im Minus! Noch ${left} Woche(n) bis zur Pleite.`, important: true });
    }
  } else {
    state.negWeeks = 0;
  }

  state.lastWeek = { income, costs, events };
  state.log = [...events.map((e) => ({ ...e, week: state.week })), ...state.log].slice(0, 120);
  return events;
}

// Vorspulen bis etwas Wichtiges passiert (max. maxWeeks)
export function skip(state, maxWeeks = 26) {
  const all = [];
  for (let i = 0; i < maxWeeks && !state.gameOver && !state.pending.length; i++) {
    const ev = advanceWeek(state);
    all.push(...ev);
    if (ev.some((e) => e.important)) break;
  }
  return all;
}
