import { SCALING, LLM, TRAINING, PRECISION, MEMORY, PARAM_STEPS } from '../../config/formulas.js';
import { TASKS, SKILLS } from '../../config/tasks.js';
import { DATASETS } from '../../config/datasets.js';
import { METHODS, ADAPTERS, QUANT, DISTILL, EVAL } from '../../config/pipeline.js';
import { STAFF_FX } from '../../config/staff.js';
import { effects, has, isDone } from './research.js';
import { pool, flopsPerWeek } from './hardware.js';
import { trainMemory, memoryTips, activeParams } from './memory.js';
import { releaseModel } from './products.js';
import { rand } from '../util/rng.js';

// ---------- Hilfen ----------

export const taskUnlocked = (state, task) => isDone(state, TASKS[task].research);
export const findModel = (state, id) => state.models.find((m) => m.id === id);
export const readyModels = (state) => state.models.filter((m) => m.status === 'ready');

const uses = (d, kind) => (d.use || ['pretrain']).includes(kind);

export function datasetsFor(state, task) {
  return state.datasets.filter((id) => uses(DATASETS[id], 'pretrain') && DATASETS[id].tags.includes(TASKS[task].tag));
}

export function postDatasets(state, method) {
  return state.datasets.filter((id) => uses(DATASETS[id], METHODS[method].data));
}

export const datasetTb = (ids) => ids.reduce((a, id) => a + DATASETS[id].tokens * (DATASETS[id].bpt ?? 2), 0) / 1e12;
export const ckptTb = (params, every) => (every ? (params * TRAINING.ckptBytesPerParam * TRAINING.ckptCopies) / 1e12 : 0);

export function qualityBonus(state) {
  return effects(state).quality + Math.min(state.staff.data * STAFF_FX.dataQuality, STAFF_FX.dataQualityCap);
}

// Mehrere Datasets zusammenwerfen: Tokens addieren, Qualität und Mix gewichten.
export function combine(state, ids) {
  const bonus = qualityBonus(state);
  let tokens = 0, q = 0, mixWeight = 0;
  const mix = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0]));
  for (const id of ids) {
    const d = DATASETS[id];
    tokens += d.tokens;
    q += d.quality * d.tokens;
    const m = d.mix || { language: 1 };
    const w = d.tokens * (d.upsample || 1);   // kleine, wertvolle Datasets zählen im Mix stärker
    mixWeight += w;
    for (const k of Object.keys(mix)) mix[k] += (m[k] || 0) * w;
  }
  if (!tokens) return { tokens: 0, quality: 0, mix };
  for (const k of Object.keys(mix)) mix[k] /= mixWeight;
  return { tokens, quality: Math.min(1, q / tokens + bonus), mix };
}

// Chinchilla-Loss
function scalingLoss(state, task, params, arch, tokens, quality, epochs) {
  const S = SCALING;
  const nEff = arch === 'moe' ? Math.pow(params, 0.9) : params;
  const dEff = tokens * (1 + S.epochGain * (epochs - 1)) * Math.pow(quality, S.qualityExp);
  const overfit = tokens ? Math.max(0, Math.log10((S.overfitRatio * Math.sqrt(epochs) * params) / tokens)) : 0;
  const loss = S.E + S.A / Math.pow(nEff, S.alpha) + S.B / Math.pow(Math.max(dEff, 1), S.beta)
    + S.overfitLoss * overfit * overfit - (effects(state).taskLoss[task] || 0);
  return { loss, overfit };
}

// Loss -> Score (und bei LLMs Fähigkeiten). model liefert capMult & skillBonus aus dem Post-Training.
export function evaluate(state, task, loss, mix, model = {}) {
  const t = TASKS[task];
  if (task !== 'llm') return { score: 100 / (1 + Math.exp((loss - t.l50) * t.slope)) };
  const e = effects(state);
  const excess = Math.max(loss - SCALING.E, 0.001) * e.capMult * (model.capMult || 1);
  const cap = 100 / (1 + Math.pow(excess / LLM.capScale, LLM.capExp));
  const skills = {};
  for (const k of Object.keys(SKILLS)) {
    const f = Math.min(1, LLM.skillFloor + LLM.skillGain * Math.sqrt(mix?.[k] || 0));
    skills[k] = Math.min(100, cap * f * (1 + (e.skills[k] || 0) + (model.skillBonus?.[k] || 0)));
  }
  const score = Object.values(skills).reduce((a, b) => a + b, 0) / Object.keys(skills).length;
  return { score, skills };
}

export const domainScore = (m, d) => Math.min(100, m.score * (m.domainF?.[d] ?? LLM.domainBase));

// Was der Spieler sieht: ungetestete LLMs haben einen ungenauen Score
export const shownScore = (m) => (m.task === 'llm' && !m.evaluated ? m.score + (m.evalNoise || 0) : m.score);

// ---------- Risiken ----------

export function crashRate(state, pl, overfit = 0, params = 1e6) {
  const ml = 1 - Math.min(state.staff.ml * STAFF_FX.mlRisk, STAFF_FX.mlRiskCap);
  const base = TRAINING.crashPerWeek + TRAINING.crashPerLog10Gpu * Math.log10(Math.max(1, pl.gpus))
    + TRAINING.crashPerLog10Size * Math.max(0, Math.log10(params / 1e8))
    + (pl.hot ? TRAINING.crashThrottle : 0) + overfit * TRAINING.crashOverfit;
  return Math.max(TRAINING.minCrash, base * ml - effects(state).failRed);
}

export function spikeRate(state, lr) {
  const ml = 1 - Math.min(state.staff.ml * STAFF_FX.mlRisk, STAFF_FX.mlRiskCap);
  return TRAINING.lr[lr].spike * ml;
}

// ---------- Planung (für Wizard und Start) ----------

// Erlaubte Post-Training-Methoden für ein Modell
export function methodAllowed(state, m, method) {
  const M = METHODS[method];
  if (!isDone(state, M.research)) return 'Nicht erforscht';
  if (m.task !== 'llm') return 'Nur für LLMs';
  if ((m.bits || 16) < 16) return 'Nicht auf quantisierten Modellen';
  if (M.needs && !m.stages.includes(M.needs)) return `Braucht zuerst ${METHODS[M.needs].short}`;
  if (method !== 'sft' && m.stages.includes(method)) return 'Schon angewendet';
  if (M.group && m.stages.some((s) => METHODS[s]?.group === M.group)) return 'Präferenz-Tuning schon angewendet';
  return null;
}

export function adapterAllowed(state, adapter) {
  const f = ADAPTERS[adapter].feature;
  return !f || has(state, f);
}

// Modell-Eckdaten, die der Job erzeugt (ohne Zufall)
function memSpec(state, spec) {
  if (spec.kind === 'post') {
    const b = findModel(state, spec.baseId);
    return { params: b?.params || 0, arch: b?.arch, activeShare: b?.activeShare, adapter: spec.adapter };
  }
  return { params: spec.params, arch: spec.arch || 'dense', adapter: 'full' };
}

export function plan(state, spec) {
  const pl = pool(state, 'train', spec.precision);
  const ms = { ...memSpec(state, spec), precision: spec.precision, ckpt: spec.ckpt, sharding: spec.sharding, offload: spec.offload, kind: spec.kind };
  const mem = trainMemory(state, ms, pl);
  const speed = (spec.ckpt ? MEMORY.ckptSpeed : 1) * (spec.offload ? MEMORY.offloadSpeed : 1);
  const perWeek = flopsPerWeek(state, pl.tf) * speed;
  const out = { pl, mem, tips: memoryTips(state, ms, mem), perWeek, err: null };

  let flops = 0, dataTb = 0, overfit = 0, result = null, minWeeks = 1;
  if (spec.kind === 'pretrain') {
    const c = combine(state, spec.datasets);
    const s = scalingLoss(state, spec.task, spec.params, spec.arch, c.tokens, c.quality, spec.epochs);
    const loss = s.loss * PRECISION[spec.precision].loss * TRAINING.lr[spec.lr].loss;
    const model = { task: spec.task, params: spec.params, arch: spec.arch };
    result = { ...model, loss, fpLoss: loss, mix: c.mix, ...evaluate(state, spec.task, loss, c.mix) };
    flops = 6 * activeParams(model) * c.tokens * spec.epochs;
    dataTb = datasetTb(spec.datasets);
    overfit = s.overfit;
    out.combo = c;
    minWeeks = TASKS[spec.task].minWeeks;
  } else if (spec.kind === 'post') {
    const b = findModel(state, spec.baseId);
    if (b) {
      const M = METHODS[spec.method], A = ADAPTERS[spec.adapter];
      const c = combine(state, spec.datasets);
      const tokens = Math.min(c.tokens, b.params * M.tokPerParam);
      const amount = c.tokens ? Math.sqrt(Math.min(1, c.tokens / (b.params * M.tokPerParam))) : 0;
      const strength = A.eff * amount * c.quality;
      const first = !b.stages.includes(spec.method);
      const capMult = (b.capMult || 1) * (first ? 1 - M.boost * strength : 1);
      const skillBonus = { ...(b.skillBonus || {}) };
      for (const [k, v] of Object.entries(M.skills || {})) skillBonus[k] = (skillBonus[k] || 0) + v * strength;
      let mix = b.mix;
      if (spec.method === 'sft' && c.tokens) {
        mix = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0.85 * (b.mix?.[k] || 0) + 0.15 * (c.mix[k] || 0)]));
      }
      const domainF = { ...(b.domainF || {}) };
      if (spec.method === 'sft') {
        for (const id of spec.datasets) {
          const d = DATASETS[id];
          if (d.domain) domainF[d.domain] = Math.max(domainF[d.domain] || LLM.domainBase, 0.75 + 0.35 * d.quality * A.eff * amount);
        }
      }
      const next = { capMult, skillBonus };
      result = {
        task: 'llm', params: b.params, arch: b.arch, activeShare: b.activeShare, loss: b.loss, fpLoss: b.fpLoss ?? b.loss,
        mix, capMult, skillBonus, domainF, chat: b.chat || !!M.chat, stages: first ? [...b.stages, spec.method] : [...b.stages],
        ...evaluate(state, 'llm', b.loss, mix, next),
      };
      flops = M.flopMult * A.flop * 6 * activeParams(b) * tokens;
      dataTb = datasetTb(spec.datasets);
      out.amount = amount;
      out.strength = strength;
      out.base = b;
    }
  } else if (spec.kind === 'distill') {
    const t = findModel(state, spec.teacherId);
    if (t) {
      const D = spec.params * SCALING.tokensPerParam * spec.tokenMult;
      const s = scalingLoss(state, t.task, spec.params, 'dense', D * DISTILL.dataBoost, 1, 1);
      const loss = Math.max((t.fpLoss ?? t.loss) * DISTILL.teacherGap, s.loss) * TRAINING.lr[spec.lr].loss;
      const domainF = Object.fromEntries(Object.entries(t.domainF || {}).map(([k, v]) => [k, v * DISTILL.domainKeep]));
      const model = { capMult: t.capMult, skillBonus: t.skillBonus };
      result = {
        task: t.task, params: spec.params, arch: 'dense', loss, fpLoss: loss, mix: t.mix, capMult: t.capMult, skillBonus: t.skillBonus,
        domainF, chat: t.chat, stages: [...(t.stages || []).filter((x) => x !== 'base'), 'distill'],
        ...evaluate(state, t.task, loss, t.mix, model),
      };
      flops = 6 * spec.params * D + 2 * activeParams(t) * D;
      dataTb = (D * 2) / 1e12;
      minWeeks = TASKS[t.task].minWeeks;
      out.tokens = D;
      out.teacher = t;
    }
  }
  out.result = result;
  out.flopsNeeded = flops;
  out.overfit = overfit;
  out.weeks = perWeek > 0 ? Math.max(minWeeks, Math.ceil(flops / perWeek)) : Infinity;
  out.minWeeks = minWeeks;
  out.storageNeed = dataTb + ckptTb(ms.params, spec.ckptEvery);
  out.storageCap = pl.storTb;
  out.crash = crashRate(state, pl, overfit, ms.params);
  out.spike = spikeRate(state, spec.lr);
  out.err = validate(state, spec, out);
  return out;
}

export function validate(state, spec, p) {
  if (state.job) return 'Es läuft schon ein Training';
  if (!p.pl.machines) return 'Keine Maschine mit Rolle „Training“ (Infra-Tab)';
  if (spec.precision !== 'fp32' && !has(state, PRECISION[spec.precision].feature)) return 'Präzision nicht erforscht';
  if (spec.kind === 'pretrain') {
    if (!taskUnlocked(state, spec.task)) return 'Modell-Typ nicht erforscht';
    if (!spec.datasets.length) return 'Wähle mindestens ein Dataset';
    if (spec.params > effects(state).maxParams) return 'Zu viele Parameter für deinen Forschungsstand';
    if (spec.arch === 'moe' && !has(state, 'moe')) return 'MoE nicht erforscht';
  }
  if (spec.kind === 'post') {
    const b = findModel(state, spec.baseId);
    if (!b) return 'Wähle ein Basis-Modell';
    const why = methodAllowed(state, b, spec.method);
    if (why) return why;
    if (!adapterAllowed(state, spec.adapter)) return `${ADAPTERS[spec.adapter].name} nicht erforscht`;
    if (!spec.datasets.length) return 'Wähle passende Daten (Labor → Daten)';
  }
  if (spec.kind === 'distill') {
    const t = findModel(state, spec.teacherId);
    if (!t) return 'Wähle ein Lehrer-Modell';
    if (!has(state, 'distill')) return 'Distillation nicht erforscht';
    if (spec.params > t.params * DISTILL.maxRatio) return 'Schüler muss höchstens halb so groß sein';
  }
  if (!p.mem.fits) return `VRAM reicht nicht: ${p.mem.perGpu.toFixed(1)} GB pro GPU nötig, ${p.mem.cap.toFixed(0)} GB da`;
  if (!p.mem.ramOk) return 'Zu wenig RAM für CPU-Offload';
  if (p.storageNeed > p.storageCap) return `Speicher reicht nicht: ${p.storageNeed.toFixed(1)} TB nötig, ${p.storageCap.toFixed(1)} TB da`;
  return null;
}

// ---------- Jobs ----------

function newModel(state, base) {
  return {
    id: state.nextId++, stages: [], bits: 16, capMult: 1, skillBonus: {}, domainF: {}, chat: false,
    origin: 'own', evaluated: false, evalNoise: 0, created: state.week, ...base,
  };
}

export function startJob(state, spec) {
  const p = plan(state, spec);
  if (p.err) return null;
  const r = p.result;
  const m = newModel(state, {
    name: spec.name, task: r.task, params: r.params, arch: r.arch, activeShare: r.activeShare, status: 'training',
    parent: spec.baseId || spec.teacherId || null, datasets: spec.datasets ? [...spec.datasets] : [],
    origin: spec.kind === 'post' && p.base.origin !== 'own' ? 'derived' : 'own',
  });
  state.models.unshift(m);
  state.job = {
    modelId: m.id, spec: { ...spec }, flopsNeeded: p.flopsNeeded, flopsDone: 0, ckptFlops: 0, weeksDone: 0,
    estWeeks: p.weeks, minWeeks: p.minWeeks, estLoss: r.loss, curve: [], penalty: 1, lr: spec.lr, overfit: p.overfit, paused: null,
  };
  return m;
}

export function abortJob(state) {
  const j = state.job;
  if (!j) return;
  state.models = state.models.filter((m) => m.id !== j.modelId);
  state.job = null;
  state.pending = state.pending.filter((e) => e.type !== 'spike');
}

const LR_ORDER = ['low', 'mid', 'high'];

function failJob(state, events, why) {
  const j = state.job, m = findModel(state, j.modelId);
  if (m) m.status = 'failed';
  state.job = null;
  events.push({ type: 'fail', text: `Training gescheitert: ${m?.name}. ${why}`, important: true });
}

function curvePoint(j, spike = false) {
  const p = Math.min(1, j.flopsDone / Math.max(j.flopsNeeded, 1));
  const v = j.estLoss * (1 + (TRAINING.curveStart - 1) * Math.pow(1 - p, 1.6)) * (spike ? 1.35 : 1);
  j.curve.push(+v.toFixed(4));
  if (j.curve.length > 60) j.curve.splice(1, 1);
}

export function tickJob(state, events) {
  const j = state.job;
  if (!j) return;
  const m = findModel(state, j.modelId);
  if (!m) { state.job = null; return; }
  if (j.paused === 'spike') return;
  const p = plan(state, { ...j.spec, lr: j.lr });
  // Hardware geändert? Pause statt Abbruch.
  const why = !p.pl.machines ? 'keine Trainings-Maschinen' : !p.mem.fits ? 'VRAM reicht nicht mehr' : !p.mem.ramOk ? 'RAM reicht nicht' : p.storageNeed > p.storageCap ? 'Speicher reicht nicht' : null;
  if (why) {
    if (j.paused !== why) events.push({ type: 'warn', text: `Training pausiert: ${why}.`, important: true });
    j.paused = why;
    return;
  }
  j.paused = null;
  j.flopsDone += p.perWeek;
  j.weeksDone++;
  j.estWeeks = j.weeksDone + Math.max(0, Math.ceil((j.flopsNeeded - j.flopsDone) / Math.max(p.perWeek, 1)));

  if (j.weeksDone > 1 && rand(state) < p.crash) {
    if (j.spec.ckptEvery && j.ckptFlops > 0) {
      const lost = Math.round((j.flopsDone - j.ckptFlops) / p.perWeek);
      j.flopsDone = j.ckptFlops;
      events.push({ type: 'warn', text: `Absturz im Training (GPU-Fehler). Zurück zum Checkpoint, ${lost} Woche(n) verloren.`, important: true });
      curvePoint(j);
      return;
    }
    if (j.spec.ckptEvery && j.weeksDone <= j.spec.ckptEvery) {
      j.flopsDone = 0;
      events.push({ type: 'warn', text: 'Absturz vor dem ersten Checkpoint – Training startet neu.', important: true });
      return;
    }
    failJob(state, events, 'Absturz ohne Checkpoint – alles verloren.');
    return;
  }
  if (rand(state) < spikeRate(state, j.lr) && j.flopsDone < j.flopsNeeded) {
    curvePoint(j, true);
    j.paused = 'spike';
    state.pending.push({ type: 'spike', id: state.nextId++ });
    events.push({ type: 'warn', text: `Loss-Spike bei ${m.name}! Entscheidung nötig.`, important: true });
    return;
  }
  if (j.spec.ckptEvery && j.weeksDone % j.spec.ckptEvery === 0) j.ckptFlops = j.flopsDone;
  curvePoint(j);
  if (j.flopsDone >= j.flopsNeeded && j.weeksDone >= j.minWeeks) finishJob(state, events, p);
}

export function resolveSpike(state, choice) {
  const j = state.job;
  state.pending = state.pending.filter((e) => e.type !== 'spike');
  if (!j) return null;
  j.paused = null;
  if (choice === 'rollback') {
    j.flopsDone = j.spec.ckptEvery ? j.ckptFlops : 0;
    j.lr = LR_ORDER[Math.max(0, LR_ORDER.indexOf(j.lr) - 1)];
    j.curve.push(j.curve[Math.max(0, j.curve.length - 2)] || j.estLoss * TRAINING.curveStart);
    return 'rollback';
  }
  if (rand(state) < TRAINING.spikeRecover) {
    j.penalty *= TRAINING.spikePenalty;
    return 'recovered';
  }
  failJob(state, [], 'Der Loss ist explodiert (Divergenz).');
  return 'diverged';
}

function finishJob(state, events, p) {
  const j = state.job, m = findModel(state, j.modelId);
  const r = p.result;
  const noise = 1 + (rand(state) * 2 - 1) * SCALING.noise;
  // Pretraining/Distillation streuen beim Loss, Post-Training bei der Wirkung
  const loss = j.spec.kind === 'post' ? r.loss : r.loss * noise * j.penalty;
  const capMult = j.spec.kind === 'post' ? Math.min(1, (r.capMult) * (1 + (noise - 1) * 0.5) * j.penalty) : r.capMult || 1;
  Object.assign(m, {
    task: r.task, params: r.params, arch: r.arch, activeShare: r.activeShare, loss, fpLoss: j.spec.kind === 'post' ? r.fpLoss : loss,
    mix: r.mix, capMult, skillBonus: r.skillBonus || {}, domainF: r.domainF || {}, chat: !!r.chat,
    stages: r.stages || ['base'], status: 'ready', evaluated: r.task !== 'llm',
    evalNoise: r.task === 'llm' ? Math.round((rand(state) * 2 - 1) * EVAL.noise) : 0,
  });
  Object.assign(m, evaluate(state, m.task, m.loss, m.mix, m));
  state.job = null;
  events.push({ type: 'trained', text: `Training fertig: ${m.name} – Score ${m.task === 'llm' ? '~' : ''}${Math.round(m.task === 'llm' ? shownScore(m) : m.score)}`, important: true });
}

// ---------- Schnelle Jobs: Quantisierung & Evals (1 Woche, laufen parallel) ----------

export function quantOptions(state, m) {
  const lvl = effects(state).quantLevel;
  if (!lvl) return [];
  return Object.entries(QUANT.bits)
    .filter(([b, f]) => Number(b) < (m.bits || 16) && f[lvl - 1] != null)
    .map(([b, f]) => {
      const loss = (m.fpLoss ?? m.loss) * f[lvl - 1];
      return { bits: Number(b), loss, score: evaluate(state, m.task, loss, m.mix, m).score, method: QUANT.methods[lvl] };
    })
    .sort((a, b) => b.bits - a.bits);
}

export function canQuantize(state, m, bits) {
  if (!effects(state).quantLevel) return 'Quantisierung nicht erforscht';
  if (m.status !== 'ready') return 'Modell nicht fertig';
  if (!quantOptions(state, m).some((o) => o.bits === bits)) return 'Nicht möglich';
  if (state.quick.some((q) => q.modelId === m.id && q.type === 'quant' && q.bits === bits)) return 'Läuft schon';
  return null;
}

export function quantize(state, id, bits) {
  const m = findModel(state, id);
  if (!m || canQuantize(state, m, bits)) return false;
  state.quick.push({ type: 'quant', modelId: id, bits, done: state.week + QUANT.weeks });
  return true;
}

export function runEval(state, id) {
  const m = findModel(state, id);
  if (!m || m.evaluated || m.status !== 'ready' || state.quick.some((q) => q.modelId === id && q.type === 'eval')) return false;
  state.quick.push({ type: 'eval', modelId: id, done: state.week + EVAL.weeks });
  return true;
}

export function tickQuick(state, events) {
  const due = state.quick.filter((q) => q.done <= state.week + 1);
  state.quick = state.quick.filter((q) => !due.includes(q));
  for (const q of due) {
    const m = findModel(state, q.modelId);
    if (!m) continue;
    if (q.type === 'eval') {
      m.evaluated = true;
      events.push({ type: 'trained', text: `Benchmarks fertig: ${m.name} hat Score ${Math.round(m.score)}`, important: true });
      continue;
    }
    const o = quantOptions(state, m).find((x) => x.bits === q.bits);
    if (!o) continue;
    const c = newModel(state, {
      ...m, id: undefined, name: `${m.name.replace(/ Q\d$/, '')} Q${q.bits}`, bits: q.bits, quantMethod: o.method,
      loss: o.loss, parent: m.id, status: 'ready', created: state.week,
    });
    c.id = state.nextId++;
    Object.assign(c, evaluate(state, c.task, c.loss, c.mix, c));
    state.models.unshift(c);
    events.push({ type: 'trained', text: `Quantisiert: ${c.name} (${o.method})`, important: false });
  }
}

// ---------- Open-Weight-Modelle ----------

export function downloadOpen(state, rel) {
  if (state.models.some((m) => m.openName === rel.name)) return null;
  const mix = { language: 0.4, reasoning: 0.25, coding: 0.2, math: 0.15 };
  const model = { capMult: 1, skillBonus: {} };
  let lo = SCALING.E + 0.001, hi = 6;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (evaluate(state, 'llm', mid, mix, model).score > rel.score) lo = mid; else hi = mid;
  }
  const m = newModel(state, {
    name: rel.name, openName: rel.name, task: 'llm', params: rel.params, arch: rel.moe ? 'moe' : 'dense',
    activeShare: rel.moe, loss: lo, fpLoss: lo, mix, origin: 'open', stages: ['base', 'sft'], chat: true,
    status: 'ready', evaluated: true,
  });
  Object.assign(m, evaluate(state, 'llm', m.loss, m.mix, m));
  state.models.unshift(m);
  return m;
}

// ---------- Verwaltung ----------

export function deleteModel(state, id) {
  const sp = state.job?.spec;
  if (state.job?.modelId === id || sp?.baseId === id || sp?.teacherId === id) return;
  state.models = state.models.filter((m) => m.id !== id);
  state.quick = state.quick.filter((q) => q.modelId !== id);
  for (const [t, mid] of Object.entries(state.apps)) if (mid === id) delete state.apps[t];
  releaseModel(state, id);
}

export function renameModel(state, id, name) {
  const m = findModel(state, id);
  if (m && name.trim()) m.name = name.trim().slice(0, 40);
}

export function maxParamIdx(state) {
  const max = effects(state).maxParams;
  return PARAM_STEPS.filter((p) => p <= max).length - 1;
}
