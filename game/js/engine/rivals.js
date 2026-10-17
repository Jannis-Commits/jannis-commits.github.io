import { RIVAL_RELEASES, COMPANIES, FUTURE } from '../../config/rivals.js';
import { WEEKS_PER_YEAR, START } from '../../config/formulas.js';
import { SKILLS } from '../../config/tasks.js';

// Fiktive Releases einmal vorberechnen (deterministisch, nicht im Spielstand)
function futureReleases() {
  const out = [];
  for (const [company, f] of Object.entries(FUTURE.series)) {
    for (let i = 0, y = FUTURE.start + f.phase; y < FUTURE.end; i++, y += f.every) {
      const base = FUTURE.ceiling - (FUTURE.ceiling - FUTURE.startScore) * Math.exp(-(y - FUTURE.start) / FUTURE.tau) + f.offset;
      const v = f.version + i * f.step;
      const scores = {};
      for (const [k, b] of Object.entries(FUTURE.bias[company])) scores[k] = Math.min(100, base + b);
      out.push({ company, name: `${f.prefix}${Number.isInteger(v) ? v : v.toFixed(1)}`, year: y, scores });
    }
  }
  return out;
}

const ALL_RELEASES = [...RIVAL_RELEASES, ...futureReleases()].sort((a, b) => a.year - b.year);

const releaseWeek = (r) => Math.round((r.year - START.year) * WEEKS_PER_YEAR);
const overall = (scores) => Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

export function releasedRivals(state) {
  return ALL_RELEASES.filter((r) => releaseWeek(r) <= state.week)
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

// Marktanteil eines Scores gegen das beste Modell jeder Rivalen-Firma
export function llmShare(state, score, exp = 3) {
  const mine = Math.pow(score, exp);
  const others = rivalTopScores(state).reduce((a, r) => a + Math.pow(r.score, exp), 0);
  return mine + others > 0 ? mine / (mine + others) : 0;
}

export function bestRivalScore(state) {
  return rivalTopScores(state).reduce((a, r) => Math.max(a, r.score), 0);
}
