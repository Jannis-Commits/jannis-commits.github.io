import { CONTRACTS, APPS, SUBS } from '../../config/contracts.js';
import { ECONOMY } from '../../config/formulas.js';
import { TASKS, SKILLS } from '../../config/tasks.js';
import { DATASETS } from '../../config/datasets.js';
import { DOMAINS } from '../../config/pipeline.js';
import { STAFF_FX } from '../../config/staff.js';
import { rand, randInt, pick } from '../util/rng.js';
import { gameYear } from '../util/format.js';
import { isDone, effects } from './research.js';
import { taskUnlocked, domainScore, readyModels } from './training.js';
import { minServeGb } from './memory.js';
import { bestRivalScore } from './rivals.js';
import { productRevenue } from './products.js';

const eraMult = (state) => 1 + state.week / ECONOMY.eraGrowth;
const salesMult = (state) => 1 + Math.min(state.staff.sales * STAFF_FX.salesReward, STAFF_FX.salesRewardCap);
export const maxContracts = (state) => CONTRACTS.maxOpen + Math.min(Math.floor(state.staff.sales / STAFF_FX.salesSlotsPer), STAFF_FX.salesSlotsCap);

// LLM-Aufträge (Lizenz-Deals) wachsen mit dem Stand der Rivalen mit
function scoreRange(state, task) {
  if (TASKS[task].contractScore !== 'rival') return CONTRACTS.minScore;
  const best = Math.max(CONTRACTS.llmMinBest, bestRivalScore(state));
  return CONTRACTS.llmRange.map((f) => Math.max(3, Math.round(best * f)));
}

export function generateContract(state, bonus = 1) {
  const tasks = Object.keys(TASKS).filter((t) => taskUnlocked(state, t));
  const task = pick(state, tasks);
  const range = scoreRange(state, task);
  let minScore = randInt(state, ...range);
  const base = TASKS[task].contractBase * Math.pow((minScore - range[0]) / (range[1] - range[0]) + 0.6, CONTRACTS.difficultyExp);
  let mult = 1;
  const req = {};
  const y = gameYear(state.week);

  if (task === 'llm') {
    const r = rand(state);
    if (r < CONTRACTS.domain.chance) {
      req.domain = pick(state, Object.keys(DOMAINS));
      req.domainMin = minScore;
      minScore = Math.round(minScore * 0.7);
      mult *= CONTRACTS.domain.mult;
    } else if (r < CONTRACTS.domain.chance + CONTRACTS.skill.chance) {
      req.skill = pick(state, ['coding', 'math', 'reasoning']);
      req.skillMin = minScore;
      minScore = Math.round(minScore * 0.7);
      mult *= CONTRACTS.skill.mult;
    }
    if (rand(state) < CONTRACTS.edge.chance) {
      const devs = CONTRACTS.devices.filter((d) => d.year <= y);
      const d = pick(state, devs);
      req.device = d.name;
      req.vram = d.vram;
      minScore = Math.max(3, Math.round(minScore * 0.6));
      req.domainMin &&= Math.round(req.domainMin * 0.6);
      req.skillMin &&= Math.round(req.skillMin * 0.6);
      mult *= CONTRACTS.edge.mult;
    }
  } else if (rand(state) < CONTRACTS.edge.chance) {
    const opts = CONTRACTS.smallEdge.filter((p) => p <= effects(state).maxParams);
    if (opts.length) {
      req.maxParams = pick(state, opts);
      req.device = 'Smartphone-App';
      mult *= CONTRACTS.edge.mult;
    }
  }
  const reward = Math.round(
    base * mult * bonus * eraMult(state) * salesMult(state) * (1 + state.rep / CONTRACTS.repBonus) * (0.8 + rand(state) * 0.4) / 50,
  ) * 50;
  return {
    id: state.nextId++, task, minScore, reward, req,
    client: pick(state, CONTRACTS.clients),
    expires: state.week + randInt(state, ...CONTRACTS.expires),
  };
}

export function tickContracts(state) {
  state.contracts = state.contracts.filter((c) => c.expires > state.week);
  state.subs = state.subs.filter((x) => x.until > state.week);
  if (state.contracts.length < maxContracts(state) && rand(state) < CONTRACTS.newChance) {
    state.contracts.push(generateContract(state));
  }
}

// Welche Anforderungen erfüllt ein Modell? Liste von [Text, ok]
export function checks(state, c, m) {
  const out = [[`Score ≥ ${c.minScore}`, !!m && m.score >= c.minScore]];
  const r = c.req || {};
  if (r.domain) out.push([`${DOMAINS[r.domain].name} ≥ ${r.domainMin}`, !!m && domainScore(m, r.domain) >= r.domainMin]);
  if (r.skill) out.push([`${SKILLS[r.skill]} ≥ ${r.skillMin}`, !!m && (m.skills?.[r.skill] || 0) >= r.skillMin]);
  if (r.vram) out.push([`läuft auf ${r.device}`, !!m && minServeGb(state, m) <= r.vram]);
  if (r.maxParams) out.push([`≤ ${(r.maxParams / 1e6).toLocaleString('de-DE')} M Parameter`, !!m && m.params <= r.maxParams]);
  return out;
}

export const meets = (state, c, m) => checks(state, c, m).every(([, ok]) => ok);

// Bestes passendes Modell (oder bestes Modell überhaupt, zur Anzeige)
export function candidate(state, c) {
  const ms = readyModels(state).filter((m) => m.task === c.task).sort((a, b) => b.score - a.score);
  return ms.find((m) => meets(state, c, m)) || ms[0];
}

export function bestModelFor(state, task) {
  return readyModels(state).filter((m) => m.task === task).sort((a, b) => b.score - a.score)[0];
}

export function deliver(state, contractId) {
  const c = state.contracts.find((x) => x.id === contractId);
  if (!c) return null;
  const m = candidate(state, c);
  if (!m || !meets(state, c, m)) return null;
  state.money += c.reward;
  state.rep = Math.min(100, state.rep + TASKS[c.task].rep);
  state.contracts = state.contracts.filter((x) => x !== c);
  state.stats.delivered++;
  // Zufriedene Kunden kommen wieder: wöchentliches Abo
  if (state.subs.length < SUBS.max && rand(state) < SUBS.chance) {
    c.sub = { id: state.nextId++, client: c.client, task: c.task, weekly: Math.round(c.reward * SUBS.share), until: state.week + randInt(state, ...SUBS.weeks) };
    state.subs.push(c.sub);
  }
  return c;
}

// ---------- Apps (kleine Modelle) ----------

export function appIncome(state, model) {
  const t = TASKS[model.task];
  return t.appBase * Math.pow(model.score / 100, APPS.scoreExp) * (1 + state.rep / APPS.repFactor);
}

export function incomeBreakdown(state) {
  const p = productRevenue(state);
  let apps = 0;
  for (const id of Object.values(state.apps)) {
    const m = state.models.find((x) => x.id === id);
    if (m) apps += appIncome(state, m);
  }
  const subs = state.subs.reduce((a, x) => a + x.weekly, 0);
  return { apps, subs, chat: p.chat, api: p.api, domains: p.domains, total: apps + subs + p.total };
}

export const weeklyIncome = (state) => incomeBreakdown(state).total;

export function deployApp(state, id) {
  const m = state.models.find((x) => x.id === id);
  if (m && m.status === 'ready' && m.task !== 'llm') state.apps[m.task] = m.id;
}

export function stopApp(state, task) {
  delete state.apps[task];
}

// ---------- Datasets ----------

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
