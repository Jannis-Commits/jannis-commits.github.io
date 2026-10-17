import { TASKS, SKILLS } from '../../config/tasks.js';
import { DATASETS } from '../../config/datasets.js';
import { PARAM_STEPS, SCALING } from '../../config/formulas.js';
import * as F from '../util/format.js';
import { btn, kv, h2, chip, bar, empty, seg } from './components.js';
import { analyze, validate, taskUnlocked, datasetsFor, canQuantize } from '../engine/training.js';
import { effects } from '../engine/research.js';
import { appIncome } from '../engine/market.js';
import { hostingCost } from '../engine/company.js';

function skillsBlock(skills) {
  return Object.entries(SKILLS).map(([k, name]) =>
    `<div class="kv"><span>${name}</span><span>${Math.round(skills[k] || 0)}</span></div>${bar((skills[k] || 0) / 100, true)}`).join('');
}

function trainingCard(state) {
  const m = state.models.find((x) => x.id === state.training);
  if (!m) return '';
  const p = Math.min(1, m.flopsDone / m.flopsNeeded);
  return `<div class="card hl"><div class="row"><div class="ico">${TASKS[m.task].icon}</div>
    <div class="grow"><div class="title">${F.esc(m.name)}</div><div class="sub">Training läuft · Woche ${m.weeksDone + 1} von ~${m.estWeeks}</div></div></div>
    ${bar(p)}
    <div class="chips">${chip(F.params(m.params), 'blue')}${chip(F.pct(p) + ' fertig')}${chip(`Risiko ${F.pct(m.fail)}`, m.fail > 0.2 ? 'red' : 'amber')}</div>
    <div class="btns">${btn('Abbrechen', 'abortTraining', {}, { cls: 'danger small' })}</div></div>`;
}

function modelCard(state, m) {
  const t = TASKS[m.task];
  if (m.status === 'training') return '';
  if (m.status === 'failed') {
    return `<div class="card dim"><div class="row"><div class="ico">${t.icon}</div><div class="grow"><div class="title">${F.esc(m.name)}</div>
      <div class="sub">Gescheitert · ${F.params(m.params)}</div></div>${btn('🗑', 'deleteModel', { id: m.id }, { cls: 'ghost small' })}</div></div>`;
  }
  const live = state.apps[m.task] === m.id;
  const q8 = canQuantize(state, m, 8), q4 = canQuantize(state, m, 4);
  const showQ = effects(state).features.has('quantize');
  return `<div class="card ${live ? 'hl' : ''}">
    <div class="row"><div class="ico">${t.icon}</div><div class="grow"><div class="title">${F.esc(m.name)}</div>
      <div class="sub">${t.name} · ${F.params(m.params)}${m.arch === 'moe' ? ' · MoE' : ''}${m.bits ? ` · ${m.bits} Bit` : ''}</div></div>
      <div class="right big">${Math.round(m.score)}</div></div>
    ${m.skills ? `<div style="margin-top:8px">${skillsBlock(m.skills)}</div>` : ''}
    <div class="chips">${live ? chip('App live', 'green') : ''}
      ${chip(`App: ${F.money(appIncome(state, m))}/Wo`)}${chip(`Hosting: ${F.money(hostingCost(m))}/Wo`)}</div>
    <div class="btns">
      ${live ? btn('App stoppen', 'stopApp', { task: m.task }, { cls: 'ghost small' }) : btn('Als App starten', 'deployApp', { id: m.id }, { cls: 'small' })}
      ${showQ ? btn('8 Bit', 'quantize', { id: m.id, bits: 8 }, { cls: 'ghost small', disabled: !!q8 }) + btn('4 Bit', 'quantize', { id: m.id, bits: 4 }, { cls: 'ghost small', disabled: !!q4 }) : ''}
      ${btn('🗑', 'deleteModel', { id: m.id }, { cls: 'ghost small', disabled: live })}
    </div></div>`;
}

export function modelsView(state) {
  const ready = state.models.filter((m) => m.status !== 'training');
  return `
    ${h2('Training')}
    ${state.training ? trainingCard(state) : `<div class="card"><div class="sub">Gerade läuft kein Training.</div>
      <div class="btns">${btn('＋ Neues Modell trainieren', 'openTrain', {}, { cls: 'block' })}</div></div>`}
    ${h2(`Deine Modelle (${ready.length})`)}
    ${ready.map((m) => modelCard(state, m)).join('') || empty('Noch keine Modelle. Kauf ein Dataset im Markt und starte dein erstes Training.')}
  `;
}

// ---------- Trainings-Sheet ----------

export function defaultForm(state) {
  const task = Object.keys(TASKS).find((t) => taskUnlocked(state, t) && datasetsFor(state, t).length) || 'spam';
  return { task, datasets: datasetsFor(state, task).slice(0, 1), pIdx: 2, epochs: 1, arch: 'dense', name: '' };
}

export function maxParamIdx(state) {
  const max = effects(state).maxParams;
  return PARAM_STEPS.filter((p) => p <= max).length - 1;
}

export function trainSheet(state, form) {
  const tasks = Object.keys(TASKS).filter((t) => taskUnlocked(state, t));
  const owned = datasetsFor(state, form.task);
  const maxIdx = maxParamIdx(state);
  const pIdx = Math.min(form.pIdx, maxIdx);
  const spec = { ...form, params: PARAM_STEPS[pIdx] };
  const err = validate(state, spec);
  const a = form.datasets.length ? analyze(state, spec) : null;
  const n = state.models.filter((m) => m.task === form.task).length + 1;
  const name = `${TASKS[form.task].name} v${n}`;

  return `<h3>Neues Modell</h3>
    <div class="label">Modell-Typ</div>
    ${tasks.map((t) => `<button class="opt ${t === form.task ? 'on' : ''}" data-act="form" data-k="task" data-v="${t}">
      <span class="ico">${TASKS[t].icon}</span><span class="grow"><b>${TASKS[t].name}</b></span></button>`).join('')}

    <div class="label">Datasets (mehrere kombinierbar)</div>
    ${owned.map((id) => {
      const d = DATASETS[id], on = form.datasets.includes(id);
      return `<button class="opt ${on ? 'on' : ''}" data-act="toggleDs" data-id="${id}"><span class="check">${on ? '✓' : ''}</span>
        <span class="grow"><b>${d.name}</b><br><span class="sub">${F.tokens(d.tokens)} · Qualität ${F.pct(d.quality)}</span></span></button>`;
    }).join('') || `<div class="warn">Du besitzt kein passendes Dataset. Kauf eins im Markt.</div>`}

    <div class="label">Parameter: <b id="pLabel" style="color:var(--text)">${F.params(PARAM_STEPS[pIdx])}</b></div>
    <input type="range" min="0" max="${maxIdx}" step="1" value="${pIdx}" data-input="pIdx">
    <div class="sub">Max. ${F.params(PARAM_STEPS[maxIdx])} (mehr durch Forschung)</div>

    <div class="label">Epochen (Durchläufe durchs Dataset)</div>
    ${seg([1, 2, 3, 4].map((e) => [e, `${e}×`]), form.epochs, 'formEpochs')}

    ${effects(state).features.has('moe') ? `<div class="label">Architektur</div>${seg([['dense', 'Dense'], ['moe', 'MoE']], form.arch, 'formArch')}` : ''}

    ${a ? `<div class="label">Prognose</div><div class="card">
      ${kv('Erwarteter Score', `~${Math.round(a.score)}`)}
      ${a.skills ? Object.entries(SKILLS).map(([k, nm]) => kv(nm, `~${Math.round(a.skills[k])}`)).join('') : ''}
      ${kv('Compute', F.flops(a.flopsNeeded))}
      ${kv('Dauer', `${a.weeks} Woche${a.weeks > 1 ? 'n' : ''}`, a.weeks > 52 ? 'bad' : '')}
      ${kv('Risiko zu scheitern', F.pct(a.fail), a.fail > 0.2 ? 'bad' : '')}
      ${kv('Tokens pro Parameter', F.num(a.combo.tokens / spec.params, 1))}
      ${a.overfit > 0 ? `<div class="warn">⚠️ Overfitting-Gefahr: Für ${F.params(spec.params)} brauchst du ~${F.count(spec.params * SCALING.tokensPerParam)} einzigartige Tokens.</div>` : ''}
      ${a.weeks > 52 ? `<div class="warn">⚠️ Sehr lang. Mehr Compute (Hardware/Cloud) kaufen oder kleineres Modell wählen.</div>` : ''}
    </div>` : ''}

    <div class="label">Name</div>
    <input type="text" value="${F.esc(form.name)}" placeholder="${F.esc(name)}" data-input="name" maxlength="40">
    ${err ? `<div class="err">${err}</div>` : ''}
    <div class="btns">${btn('Abbrechen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Training starten', 'startTraining', {}, { disabled: !!err })}</div>`;
}
