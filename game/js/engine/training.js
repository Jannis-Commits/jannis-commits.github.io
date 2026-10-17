import { SCALING, LLM, TRAINING, MOE, QUANT } from '../../config/formulas.js';
import { TASKS, SKILLS } from '../../config/tasks.js';
import { DATASETS } from '../../config/datasets.js';
import { effects, isDone } from './research.js';
import { weeklyCompute } from './company.js';
import { rand } from '../util/rng.js';

export const taskUnlocked = (state, task) => isDone(state, TASKS[task].research);

export function datasetsFor(state, task) {
  return state.datasets.filter((id) => DATASETS[id].tags.includes(TASKS[task].tag));
}

// Mehrere Datasets zusammenwerfen: Tokens addieren, Qualität und Mix gewichten.
export function combine(state, ids) {
  const bonus = effects(state).quality;
  let tokens = 0, q = 0;
  const mix = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0]));
  for (const id of ids) {
    const d = DATASETS[id];
    tokens += d.tokens;
    q += d.quality * d.tokens;
    const m = d.mix || { language: 1 };
    for (const k of Object.keys(mix)) mix[k] += (m[k] || 0) * d.tokens;
  }
  if (!tokens) return { tokens: 0, quality: 0, mix };
  for (const k of Object.keys(mix)) mix[k] /= tokens;
  return { tokens, quality: Math.min(1, q / tokens + bonus), mix };
}

const activeParams = (spec) => spec.params * (spec.arch === 'moe' ? MOE.activeShare : 1);

export function analyze(state, spec) {
  const S = SCALING;
  const c = combine(state, spec.datasets);
  const e = effects(state);
  const nEff = spec.arch === 'moe' ? Math.pow(spec.params, MOE.qualityExp) : spec.params;
  const dSeen = c.tokens * spec.epochs;
  const dEff = c.tokens * (1 + S.epochGain * (spec.epochs - 1)) * Math.pow(c.quality, S.qualityExp);
  const overfit = c.tokens ? Math.max(0, Math.log10((S.tokensPerParam * spec.params) / c.tokens)) : 0;
  const loss = S.E + S.A / Math.pow(nEff, S.alpha) + S.B / Math.pow(Math.max(dEff, 1), S.beta)
    + S.overfitLoss * overfit * overfit - (e.taskLoss[spec.task] || 0);
  const flopsNeeded = 6 * activeParams(spec) * dSeen;
  const perWeek = weeklyCompute(state);
  const weeks = Math.max(TASKS[spec.task].minWeeks, Math.ceil(flopsNeeded / perWeek));
  const fail = Math.max(TRAINING.minFail, TRAINING.baseFail - state.staff.engineer * TRAINING.failPerEngineer - e.failRed)
    + overfit * TRAINING.overfitFail;
  return { combo: c, loss, overfit, flopsNeeded, weeks, fail: Math.min(0.9, fail), ...evaluate(state, spec.task, loss, c.mix) };
}

// Loss -> Score (und bei LLMs Fähigkeiten)
export function evaluate(state, task, loss, mix) {
  const t = TASKS[task];
  if (task !== 'llm') return { score: 100 / (1 + Math.exp((loss - t.l50) * t.slope)) };
  const cap = 100 / (1 + Math.pow(Math.max(loss - SCALING.E, 0.001) / LLM.capScale, LLM.capExp));
  const e = effects(state);
  const skills = {};
  for (const k of Object.keys(SKILLS)) {
    const f = Math.min(1, LLM.skillFloor + LLM.skillGain * Math.sqrt(mix[k] || 0));
    skills[k] = Math.min(100, cap * f * (1 + (e.skills[k] || 0)));
  }
  const score = Object.values(skills).reduce((a, b) => a + b, 0) / Object.keys(skills).length;
  return { score, skills };
}

export function validate(state, spec) {
  if (state.training) return 'Es läuft schon ein Training';
  if (!taskUnlocked(state, spec.task)) return 'Modell-Typ nicht erforscht';
  if (!spec.datasets.length) return 'Wähle mindestens ein Dataset';
  if (spec.params > effects(state).maxParams) return 'Zu viele Parameter für deinen Forschungsstand';
  if (spec.arch === 'moe' && !effects(state).features.has('moe')) return 'MoE nicht erforscht';
  if (weeklyCompute(state) <= 0) return 'Kein Compute';
  return null;
}

export function startTraining(state, spec) {
  if (validate(state, spec)) return null;
  const a = analyze(state, spec);
  const model = {
    id: state.nextId++,
    name: spec.name || TASKS[spec.task].name,
    task: spec.task,
    params: spec.params,
    arch: spec.arch,
    datasets: [...spec.datasets],
    epochs: spec.epochs,
    status: 'training',
    flopsNeeded: a.flopsNeeded,
    flopsDone: 0,
    weeksDone: 0,
    estWeeks: a.weeks,
    fail: a.fail,
    created: state.week,
  };
  state.models.unshift(model);
  state.training = model.id;
  return model;
}

export function abortTraining(state) {
  const m = state.models.find((x) => x.id === state.training);
  if (m) state.models = state.models.filter((x) => x !== m);
  state.training = null;
}

export function tickTraining(state, events) {
  const m = state.models.find((x) => x.id === state.training);
  if (!m) { state.training = null; return; }
  m.flopsDone += weeklyCompute(state);
  m.weeksDone++;
  const pWeek = 1 - Math.pow(1 - m.fail, 1 / Math.max(1, m.estWeeks));
  if (rand(state) < pWeek) {
    m.status = 'failed';
    state.training = null;
    const why = m.fail > 0.25 ? 'Overfitting – das Modell hat nur auswendig gelernt' : 'Absturz im Training (NaN-Loss)';
    events.push({ type: 'fail', text: `Training gescheitert: ${m.name}. ${why}.`, important: true });
    return;
  }
  if (m.flopsDone >= m.flopsNeeded && m.weeksDone >= TASKS[m.task].minWeeks) {
    const a = analyze(state, m);
    m.loss = a.loss * (1 + (rand(state) * 2 - 1) * SCALING.noise);
    Object.assign(m, evaluate(state, m.task, m.loss, a.combo.mix));
    m.mix = a.combo.mix;
    m.status = 'ready';
    state.training = null;
    events.push({ type: 'trained', text: `Training fertig: ${m.name} – Score ${Math.round(m.score)}`, important: true });
  }
}

export function canQuantize(state, m, bits) {
  if (!effects(state).features.has('quantize')) return 'Quantisierung nicht erforscht';
  if (m.status !== 'ready') return 'Modell nicht fertig';
  if (m.bits && m.bits <= bits) return 'Schon quantisiert';
  return null;
}

export function quantize(state, id, bits) {
  const m = state.models.find((x) => x.id === id);
  if (!m || canQuantize(state, m, bits)) return;
  const q = { ...m, id: state.nextId++, name: `${m.name.replace(/ Q\d$/, '')} Q${bits}`, bits, created: state.week };
  q.loss = m.loss / (m.bits ? QUANT[m.bits].lossMult : 1) * QUANT[bits].lossMult;
  Object.assign(q, evaluate(state, q.task, q.loss, m.mix || {}));
  state.models.unshift(q);
}

export function deleteModel(state, id) {
  if (state.training === id) return;
  state.models = state.models.filter((m) => m.id !== id);
  for (const [t, mid] of Object.entries(state.apps)) if (mid === id) delete state.apps[t];
}
