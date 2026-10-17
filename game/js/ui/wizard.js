import { TASKS, SKILLS } from '../../config/tasks.js';
import { DATASETS } from '../../config/datasets.js';
import { PARAM_STEPS, PRECISION, SCALING, TRAINING } from '../../config/formulas.js';
import { METHODS, ADAPTERS, DISTILL, DOMAINS } from '../../config/pipeline.js';
import * as F from '../util/format.js';
import { btn, kv, chip, seg, row, list, note, stackBar, steps, empty, bar } from './components.js';
import {
  plan, taskUnlocked, datasetsFor, postDatasets, readyModels, findModel, methodAllowed, adapterAllowed, maxParamIdx, domainScore, shownScore,
} from '../engine/training.js';
import { has } from '../engine/research.js';

import { stageBadges } from './lab.js';

const STEPS = {
  pretrain: ['Modell', 'Daten', 'Technik', 'Start'],
  post: ['Basis', 'Daten', 'Technik', 'Start'],
  distill: ['Lehrer', 'Schüler', 'Technik', 'Start'],
};
const TITLE = { pretrain: 'Pretraining', post: 'Post-Training', distill: 'Distillation' };

const bestBase = (state) => readyModels(state).filter((m) => m.task === 'llm' && (m.bits || 16) === 16).sort((a, b) => b.score - a.score)[0];

// Größte Modellgröße, die zu den Daten passt (≥ 4 Tokens pro Parameter)
export function fitIdx(state, datasets) {
  const tokens = datasets.reduce((a, id) => a + DATASETS[id].tokens, 0);
  return Math.max(0, Math.min(maxParamIdx(state), PARAM_STEPS.filter((p) => p * SCALING.overfitRatio <= tokens).length - 1));
}

export function defaultForm(state, kind, opts = {}) {
  const f = {
    kind, step: 0, name: '', lr: 'mid', ckptEvery: 4, sharding: 'none', ckpt: false, offload: false,
    precision: has(state, 'fp16') ? 'fp16' : 'fp32',
  };
  if (kind === 'pretrain') {
    const task = Object.keys(TASKS).reverse().find((t) => taskUnlocked(state, t) && datasetsFor(state, t).length) || 'spam';
    const datasets = datasetsFor(state, task).slice(0, 1);
    Object.assign(f, { task, pIdx: fitIdx(state, datasets), arch: 'dense', epochs: 1, datasets });
  } else if (kind === 'post') {
    const base = findModel(state, Number(opts.base)) || bestBase(state);
    const method = base ? Object.keys(METHODS).find((k) => !methodAllowed(state, base, k)) || 'sft' : 'sft';
    Object.assign(f, { baseId: base?.id, method, adapter: 'full', datasets: postDatasets(state, method) });
  } else {
    const t = findModel(state, Number(opts.teacher)) || readyModels(state).sort((a, b) => b.params - a.params)[0];
    const sIdx = Math.max(0, PARAM_STEPS.filter((p) => p <= (t?.params || 1e6) / 10).length - 1);
    Object.assign(f, { teacherId: t?.id, sIdx, tokenMult: 1 });
  }
  return f;
}

export function specFromForm(state, f) {
  const base = { kind: f.kind, precision: f.precision, sharding: f.sharding, ckpt: f.ckpt, offload: f.offload, lr: f.lr, ckptEvery: f.ckptEvery };
  if (f.kind === 'pretrain') {
    const n = state.models.filter((m) => m.task === f.task).length + 1;
    return { ...base, task: f.task, params: PARAM_STEPS[Math.min(f.pIdx, maxParamIdx(state))], arch: f.arch, datasets: f.datasets, epochs: f.epochs, name: f.name.trim() || `${TASKS[f.task].name} v${n}` };
  }
  if (f.kind === 'post') {
    const b = findModel(state, f.baseId);
    return { ...base, baseId: f.baseId, method: f.method, adapter: f.adapter, datasets: f.datasets, name: f.name.trim() || `${b?.name.replace(/ \(.*\)$/, '') || 'Modell'} ${METHODS[f.method].short}` };
  }
  const t = findModel(state, f.teacherId);
  return { ...base, teacherId: f.teacherId, params: PARAM_STEPS[f.sIdx], tokenMult: f.tokenMult, name: f.name.trim() || `${t?.name || 'Modell'} Mini ${F.short(PARAM_STEPS[f.sIdx])}` };
}

const opt = (on, act, data, inner) =>
  `<button class="opt ${on ? 'on' : ''}" data-act="${act}"${Object.entries(data).map(([k, v]) => ` data-${k}="${F.esc(v)}"`).join('')}>${inner}</button>`;

// ---------- Schritte ----------

function stepModel(state, f) {
  const tasks = Object.keys(TASKS).filter((t) => taskUnlocked(state, t));
  const maxIdx = maxParamIdx(state), pIdx = Math.min(f.pIdx, maxIdx);
  return `<div class="label">Modell-Typ</div>
    ${tasks.map((t) => opt(t === f.task, 'form', { k: 'task', v: t }, `<span class="ico">${TASKS[t].icon}</span><span class="grow"><b>${TASKS[t].name}</b></span>`)).join('')}
    <div class="label">Größe: <b id="pLabel" class="hl-text">${F.params(PARAM_STEPS[pIdx])}</b></div>
    <input type="range" min="0" max="${maxIdx}" step="1" value="${pIdx}" data-input="pIdx">
    <div class="sub">Max. ${F.short(PARAM_STEPS[maxIdx])} (mehr durch Forschung). Größer = besser, aber mehr VRAM, Compute und Daten.</div>
    ${has(state, 'moe') && f.task === 'llm' ? `<div class="label">Architektur</div>${seg([['dense', 'Dense'], ['moe', 'MoE (¼ aktiv)']], f.arch, 'formSet', { k: 'arch' })}` : ''}`;
}

function stepData(state, f) {
  const owned = datasetsFor(state, f.task);
  const spec = specFromForm(state, f);
  const tokens = f.datasets.reduce((a, id) => a + DATASETS[id].tokens, 0);
  return `<div class="label">Datasets (mehrere kombinierbar)</div>
    ${owned.map((id) => {
      const d = DATASETS[id], on = f.datasets.includes(id);
      return opt(on, 'toggleDs', { id }, `<span class="check">${on ? '✓' : ''}</span><span class="grow"><b>${d.name}</b><br><span class="sub">${F.count(d.tokens)} Tokens · Q ${F.pct(d.quality)}</span></span>`);
    }).join('') || `<div class="warn">Kein passendes Dataset. Labor → Daten.</div>`}
    <div class="label">Epochen (Durchläufe)</div>
    ${seg([1, 2, 3, 4].map((e) => [e, `${e}×`]), f.epochs, 'formSet', { k: 'epochs', num: 1 })}
    ${tokens ? `<div class="card tight">${kv('Tokens', F.count(tokens))}${kv('Tokens pro Parameter', F.num(tokens / spec.params, 1), tokens / spec.params < 5 ? 'bad' : '')}
      ${tokens / spec.params < SCALING.tokensPerParam ? note(`Optimal sind ~${SCALING.tokensPerParam} Tokens pro Parameter (Chinchilla). Weniger → Overfitting-Gefahr.`, 'amber') : ''}</div>` : ''}`;
}

function stepBase(state, f) {
  const llms = readyModels(state).filter((m) => m.task === 'llm').sort((a, b) => b.score - a.score);
  const b = findModel(state, f.baseId);
  return `<div class="label">Basis-Modell</div>
    ${llms.map((m) => {
      const q = (m.bits || 16) < 16;
      return opt(m.id === f.baseId, q ? '' : 'formBase', { id: m.id }, `<span class="check">${m.id === f.baseId ? '✓' : ''}</span><span class="grow"><b>${F.esc(m.name)}</b> ${stageBadges(m)}<br><span class="sub">${F.short(m.params)} · Score ${m.evaluated ? '' : '~'}${Math.round(shownScore(m))}${q ? ' · quantisiert, nicht trainierbar' : ''}</span></span>`);
    }).join('') || empty('Kein LLM vorhanden.')}
    <div class="label">Methode</div>
    ${b ? Object.entries(METHODS).map(([k, M]) => {
      const why = methodAllowed(state, b, k);
      return opt(k === f.method, why ? '' : 'formMethod', { id: k }, `<span class="grow"><b>${M.name}</b>${why ? ` <span class="sub">– ${why}</span>` : ''}<br><span class="sub">${M.desc}</span></span>`);
    }).join('') : ''}
    <div class="label">Anpassung</div>
    ${seg(Object.entries(ADAPTERS).map(([k, A]) => [k, A.name, !adapterAllowed(state, k)]), f.adapter, 'formSet', { k: 'adapter' })}
    <div class="sub">${ADAPTERS[f.adapter].desc}</div>`;
}

function stepPostData(state, f) {
  const M = METHODS[f.method];
  const owned = postDatasets(state, f.method);
  return `<div class="label">Daten für ${M.name}</div>
    ${owned.map((id) => {
      const d = DATASETS[id], on = f.datasets.includes(id);
      return opt(on, 'toggleDs', { id }, `<span class="check">${on ? '✓' : ''}</span><span class="grow"><b>${d.name}</b><br><span class="sub">${F.count(d.tokens)} Tokens · Q ${F.pct(d.quality)}${d.domain ? ` · ${DOMAINS[d.domain].icon} ${DOMAINS[d.domain].name}` : ''}</span></span>`);
    }).join('') || `<div class="warn">Keine passenden Daten. Im Labor → Daten gibt es ${{ sft: 'Instruct- und Fach-Daten', pref: 'Präferenz-Daten', reasoning: 'Reasoning-Daten', agent: 'Agent-Trajektorien' }[M.data]} (wenn erforscht).</div>`}
    ${f.method === 'sft' ? note('Fach-Daten (Medizin, Recht, Software, Support) machen das Modell zum Spezialisten – wichtig für viele Aufträge.') : ''}`;
}

function stepTeacher(state, f) {
  const ms = readyModels(state).filter((m) => m.params >= 2e5).sort((a, b) => b.score - a.score);
  return `<div class="label">Lehrer-Modell</div>
    ${ms.map((m) => opt(m.id === f.teacherId, 'formTeacher', { id: m.id }, `<span class="check">${m.id === f.teacherId ? '✓' : ''}</span><span class="grow"><b>${F.esc(m.name)}</b><br><span class="sub">${TASKS[m.task].name} · ${F.short(m.params)} · Score ${Math.round(shownScore(m))}</span></span>`)).join('')}
    ${note('Der Schüler lernt aus den Antworten des Lehrers – fast so gut, aber viel kleiner. Perfekt für Edge-Aufträge und billige Inferenz.')}`;
}

function stepStudent(state, f) {
  const t = findModel(state, f.teacherId);
  const max = Math.max(0, PARAM_STEPS.filter((p) => p <= (t?.params || 0) * DISTILL.maxRatio).length - 1);
  const sIdx = Math.min(f.sIdx, max);
  return `<div class="label">Schüler-Größe: <b id="sLabel" class="hl-text">${F.params(PARAM_STEPS[sIdx])}</b></div>
    <input type="range" min="0" max="${max}" step="1" value="${sIdx}" data-input="sIdx">
    <div class="label">Daten-Menge (× Chinchilla)</div>
    ${seg(DISTILL.tokenMults.map((x) => [x, `${x}×`]), f.tokenMult, 'formSet', { k: 'tokenMult', num: 1 })}`;
}

function stepTech(state, f, p) {
  const pl = p.pl;
  const gpus = pl.stats.flatMap((x) => x.s.gpuList);
  const supports = (prec) => gpus.length && gpus.every((g) => g.tf[prec]);
  const precOpts = Object.entries(PRECISION).map(([k, P]) => { const off = k !== 'fp32' && !has(state, P.feature); return [k, P.name + (k !== 'fp32' && !off && gpus.length && !supports(k) ? '*' : ''), off]; });
  const m = p.mem;
  const memBar = stackBar([
    { v: m.parts.weights, label: 'Gewichte', cls: 'c1' },
    { v: m.parts.grads, label: 'Gradienten', cls: 'c2' },
    { v: m.parts.optim, label: 'Optimizer', cls: 'c3' },
    { v: m.parts.act, label: 'Aktivierungen', cls: 'c4' },
  ], m.cap, F.gb);
  const toggle = (k, label, feature) => (has(state, feature)
    ? `<div class="kv"><span>${label}</span>${seg([[0, 'Aus'], [1, 'An']], f[k] ? 1 : 0, 'formSet', { k, bool: 1 })}</div>` : '');
  return `<div class="card tight">
      ${row({ icon: '🧪', title: `Trainings-Pool: ${F.tflops(pl.tf)}`, sub: pl.machines ? `${pl.machines} Maschine(n) · ${pl.cpuOnly ? 'nur CPU' : `${pl.gpus} GPUs · kleinste ${F.gb(pl.minVram)}`}${pl.machines > 1 ? ` · Cluster ${F.pct(pl.clusterEff)}` : ''}` : 'Keine Maschine mit Rolle Training!', act: 'goInfra' })}
    </div>
    <div class="label">VRAM pro GPU: <b class="${m.fits ? 'good' : 'bad'}">${F.gb(m.perGpu)} / ${F.gb(m.cap)}</b></div>
    ${memBar}
    ${p.tips.length ? `<div class="tips">${p.tips.map((t) => `<div>💡 ${t}</div>`).join('')}</div>` : ''}
    <div class="label">Präzision</div>
    ${seg(precOpts, f.precision, 'formSet', { k: 'precision' })}
    ${precOpts.some(([, l]) => l.endsWith('*')) ? '<div class="sub">* deine GPUs können das nicht nativ – läuft dann im nächstgrößeren Format.</div>' : ''}
    ${has(state, 'zero') ? `<div class="label">Sharding</div>${seg([['none', 'Keins'], ['zero', 'ZeRO'], ['fsdp', 'FSDP', !has(state, 'fsdp')]], f.sharding, 'formSet', { k: 'sharding' })}` : ''}
    <div class="card tight">
      ${toggle('ckpt', 'Gradient Checkpointing', 'grad-ckpt')}
      ${toggle('offload', 'CPU-Offload', 'offload')}
      ${f.offload ? kv('RAM pro Maschine', `${F.gb(m.ramNeed)} / ${F.gb(m.ramCap)}`, m.ramOk ? '' : 'bad') : ''}
      <div class="kv"><span>Lernrate</span>${seg(Object.entries(TRAINING.lr).map(([k, l]) => [k, l.name]), f.lr, 'formSet', { k: 'lr' })}</div>
      <div class="kv"><span>Checkpoints</span>${seg(TRAINING.ckptOptions.map((w) => [w, w ? `${w} Wo` : 'Nie']), f.ckptEvery, 'formSet', { k: 'ckptEvery', num: 1 })}</div>
    </div>
    <div class="label">Speicher: <b class="${p.storageNeed <= p.storageCap ? '' : 'bad'}">${F.tb(p.storageNeed)} / ${F.tb(p.storageCap)}</b></div>
    ${bar(p.storageCap ? p.storageNeed / p.storageCap : 1, true, p.storageNeed > p.storageCap ? 'red' : '')}
    <div class="sub">Datasets${f.ckptEvery ? ' + Checkpoints' : ''} müssen auf die Laufwerke des Trainings-Pools passen.</div>`;
}

function stepStart(state, f, p) {
  const r = p.result;
  const totalCrash = 1 - Math.pow(1 - p.crash, Math.min(p.weeks, 500));
  const totalSpike = 1 - Math.pow(1 - p.spike, Math.min(p.weeks, 500));
  let head = '';
  if (r && f.kind === 'post' && p.base) {
    const b = p.base;
    head = `${kv('Score', `${Math.round(b.score)} → <b>~${Math.round(r.score)}</b>`)}
      ${Object.entries(SKILLS).map(([k, n]) => kv(n, `${Math.round(b.skills[k])} → ~${Math.round(r.skills[k])}`)).join('')}
      ${Object.entries(DOMAINS).filter(([d]) => (r.domainF?.[d] || 0) > (b.domainF?.[d] || 0)).map(([d, x]) => kv(`${x.icon} ${x.name}`, `${Math.round(domainScore(b, d))} → ~${Math.round(domainScore(r, d))}`)).join('')}
      ${r.chat && !b.chat ? kv('Chatfähig', '✓ ja') : ''}
      ${kv('Wirkung', F.pct(p.strength), p.strength < 0.5 ? 'bad' : '')}
      ${p.amount < 1 ? note(`Zu wenig Daten für die volle Wirkung (${F.pct(p.amount * p.amount)} von ${F.count(b.params * METHODS[f.method].tokPerParam)} Tokens).`, 'amber') : ''}`;
  } else if (r) {
    head = `${kv('Erwarteter Score', `~${Math.round(r.score)}`)}
      ${r.skills ? Object.entries(SKILLS).map(([k, n]) => kv(n, `~${Math.round(r.skills[k])}`)).join('') : ''}`;
  }
  return `<div class="card">${head}
      ${kv('Compute', F.flops(p.flopsNeeded))}
      ${kv('Dauer', p.weeks === Infinity ? '–' : `${p.weeks} Woche${p.weeks > 1 ? 'n' : ''}`, p.weeks > 52 ? 'bad' : '')}
      ${kv('Absturz-Risiko', `${F.pct(p.crash, 1)}/Wo · gesamt ~${F.pct(totalCrash)}`, totalCrash > 0.3 && !f.ckptEvery ? 'bad' : '')}
      ${kv('Loss-Spike-Risiko', `gesamt ~${F.pct(totalSpike)}`)}
      ${p.overfit > 0 ? `<div class="warn">⚠️ Overfitting: zu wenige einzigartige Tokens für die Modellgröße.</div>` : ''}
      ${!f.ckptEvery && totalCrash > 0.1 ? `<div class="warn">⚠️ Ohne Checkpoints ist bei einem Absturz alles weg.</div>` : ''}
      ${p.weeks > 52 && p.weeks !== Infinity ? `<div class="warn">⚠️ Sehr lang. Mehr GPUs oder ein kleineres Modell.</div>` : ''}
    </div>
    <div class="label">Name</div>
    <input type="text" value="${F.esc(f.name)}" placeholder="${F.esc(specFromForm(state, f).name)}" data-input="name" maxlength="40">`;
}

export function wizardSheet(state, ui) {
  const f = ui.form;
  const spec = specFromForm(state, f);
  const p = plan(state, spec);
  const labels = STEPS[f.kind];
  const body = {
    pretrain: [stepModel, stepData, stepTech, stepStart],
    post: [stepBase, stepPostData, stepTech, stepStart],
    distill: [stepTeacher, stepStudent, stepTech, stepStart],
  }[f.kind][f.step](state, f, p);
  const last = f.step === labels.length - 1;
  const summary = `<div class="wsum">${p.result ? `<span>Score ~${Math.round(p.result.score)}</span>` : ''}<span class="${p.mem.fits ? '' : 'bad'}">VRAM ${F.gb(p.mem.perGpu)}/${F.gb(p.mem.cap)}</span><span>${p.weeks === Infinity ? '–' : p.weeks + ' Wo'}</span></div>`;
  return `<h3>${TITLE[f.kind]}</h3>
    ${steps(labels, f.step, 'formStep')}
    ${summary}
    ${body}
    ${last && p.err ? `<div class="err">${p.err}</div>` : ''}
    <div class="btns sticky">${f.step ? btn('Zurück', 'formStep', { id: f.step - 1 }, { cls: 'ghost' }) : btn('Abbrechen', 'closeSheet', {}, { cls: 'ghost' })}
      ${last ? btn('Training starten', 'startJob', {}, { disabled: !!p.err }) : btn('Weiter', 'formStep', { id: f.step + 1 })}</div>`;
}

