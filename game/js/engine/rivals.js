import { RIVAL_RELEASES, COMPANIES } from '../../config/rivals.js';
import { WEEKS_PER_YEAR, START } from '../../config/formulas.js';
import { SKILLS } from '../../config/tasks.js';

const releaseWeek = (r) => Math.round((r.year - START.year) * WEEKS_PER_YEAR);
const overall = (scores) => Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

export function releasedRivals(state) {
  return RIVAL_RELEASES.filter((r) => releaseWeek(r) <= state.week)
    .map((r) => ({ ...r, score: overall(r.scores), companyName: COMPANIES[r.company].name, week: releaseWeek(r) }));
}

// Bestes Modell je Firma (für Marktanteil)
export function rivalTopScores(state) {
  const best = {};
  for (const r of releasedRivals(state)) if (!best[r.company] || r.score > best[r.company].score) best[r.company] = r;
  return Object.values(best);
}

export function tickRivals(state, events) {
  const released = releasedRivals(state);
  for (const r of released.slice(state.seenRivals)) {
    events.push({ type: 'rival', text: `${r.companyName} veröffentlicht ${r.name} (Score ${Math.round(r.score)})`, important: false });
  }
  state.seenRivals = released.length;
}

// Rangliste: Rivalen + eigene LLMs, sortiert nach Gesamt oder einer Fähigkeit
export function leaderboard(state, key = 'score') {
  const rows = releasedRivals(state).map((r) => ({
    name: r.name, owner: r.companyName, color: COMPANIES[r.company].color, mine: false,
    score: r.score, ...r.scores,
  }));
  for (const m of state.models) {
    if (m.task === 'llm' && m.status === 'ready') {
      rows.push({ name: m.name, owner: 'Du', color: '#2563eb', mine: true, score: m.score, ...m.skills });
    }
  }
  return rows.sort((a, b) => b[key] - a[key]);
}

export const SKILL_KEYS = Object.keys(SKILLS);
