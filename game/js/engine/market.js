import { CONTRACTS, APPS } from '../../config/contracts.js';
import { ECONOMY } from '../../config/formulas.js';
import { TASKS } from '../../config/tasks.js';
import { DATASETS } from '../../config/datasets.js';
import { rand, randInt, pick } from '../util/rng.js';
import { gameYear } from '../util/format.js';
import { isDone } from './research.js';
import { taskUnlocked } from './training.js';
import { rivalTopScores } from './rivals.js';

const eraMult = (state) => 1 + state.week / ECONOMY.eraGrowth;

export function generateContract(state) {
  const tasks = Object.keys(TASKS).filter((t) => taskUnlocked(state, t));
  const task = pick(state, tasks);
  const range = TASKS[task].contractScore || CONTRACTS.minScore;
  const minScore = randInt(state, ...range);
  const reward = Math.round(
    TASKS[task].contractBase * Math.pow((minScore - range[0]) / (range[1] - range[0]) + 0.6, CONTRACTS.difficultyExp)
      * eraMult(state) * (1 + state.rep / CONTRACTS.repBonus) * (0.8 + rand(state) * 0.4) / 50,
  ) * 50;
  return {
    id: state.nextId++,
    task,
    minScore,
    reward,
    client: pick(state, CONTRACTS.clients),
    expires: state.week + randInt(state, ...CONTRACTS.expires),
  };
}

export function tickContracts(state) {
  state.contracts = state.contracts.filter((c) => c.expires > state.week);
  if (state.contracts.length < CONTRACTS.maxOpen && rand(state) < CONTRACTS.newChance) {
    state.contracts.push(generateContract(state));
  }
}

export function bestModelFor(state, task) {
  return state.models
    .filter((m) => m.task === task && m.status === 'ready')
    .sort((a, b) => b.score - a.score)[0];
}

export function deliver(state, contractId) {
  const c = state.contracts.find((x) => x.id === contractId);
  if (!c) return null;
  const m = bestModelFor(state, c.task);
  if (!m || m.score < c.minScore) return null;
  state.money += c.reward;
  state.rep = Math.min(100, state.rep + TASKS[c.task].rep);
  state.contracts = state.contracts.filter((x) => x !== c);
  return c;
}

// Marktanteil eines LLM gegen die stärksten Rivalen
export function llmShare(state, score) {
  const rivals = rivalTopScores(state);
  const e = APPS.llmShareExp;
  const mine = Math.pow(score, e);
  const others = rivals.reduce((a, r) => a + Math.pow(r.score, e), 0);
  return mine + others > 0 ? mine / (mine + others) : 0;
}

export function appIncome(state, model) {
  const t = TASKS[model.task];
  let v = t.appBase * Math.pow(model.score / 100, APPS.scoreExp) * (1 + state.rep / APPS.repFactor);
  if (model.task === 'llm') v *= llmShare(state, model.score);
  return v;
}

export function weeklyIncome(state) {
  let total = 0;
  for (const id of Object.values(state.apps)) {
    const m = state.models.find((x) => x.id === id);
    if (m) total += appIncome(state, m);
  }
  return total;
}

export function deployApp(state, id) {
  const m = state.models.find((x) => x.id === id);
  if (m && m.status === 'ready') state.apps[m.task] = m.id;
}

export function stopApp(state, task) {
  delete state.apps[task];
}

export function datasetAvailable(state, id) {
  const d = DATASETS[id];
  if (state.datasets.includes(id)) return false;
  if (d.research && !isDone(state, d.research)) return false;
  if (d.year && gameYear(state.week) < d.year) return false;
  return true;
}

export function buyDataset(state, id) {
  const d = DATASETS[id];
  if (!datasetAvailable(state, id) || state.money < d.cost) return;
  state.money -= d.cost;
  state.datasets.push(id);
}
