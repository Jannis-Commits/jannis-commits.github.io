import { ECONOMY } from '../../config/formulas.js';
import { tickResearch } from './research.js';
import { tickTraining } from './training.js';
import { tickContracts, weeklyIncome } from './market.js';
import { weeklyCosts } from './company.js';
import { tickRivals } from './rivals.js';
import { tickProducts } from './products.js';

// Eine Woche simulieren. Gibt die Ereignisse der Woche zurück.
export function advanceWeek(state) {
  if (state.gameOver) return [];
  const events = [];

  tickResearch(state, events);
  if (state.training) tickTraining(state, events);

  const income = weeklyIncome(state);
  const costs = weeklyCosts(state).total;
  state.money += income - costs;

  tickProducts(state, events);

  state.week++;
  tickRivals(state, events);
  tickContracts(state);

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
  state.log = [...events.map((e) => ({ ...e, week: state.week })), ...state.log].slice(0, 80);
  return events;
}

// Vorspulen bis etwas Wichtiges passiert (max. maxWeeks)
export function skip(state, maxWeeks = 26) {
  const all = [];
  let income = 0, costs = 0;
  for (let i = 0; i < maxWeeks && !state.gameOver; i++) {
    const ev = advanceWeek(state);
    income += state.lastWeek.income;
    costs += state.lastWeek.costs;
    all.push(...ev);
    if (ev.some((e) => e.important)) break;
  }
  state.lastWeek = { income, costs, events: all };
  return all;
}
