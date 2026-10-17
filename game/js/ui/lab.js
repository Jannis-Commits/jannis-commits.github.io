import { TASKS, SKILLS } from '../../config/tasks.js';
import { DATASETS } from '../../config/datasets.js';
import { METHODS, DOMAINS } from '../../config/pipeline.js';
import { PRECISION } from '../../config/formulas.js';
import { GPUS } from '../../config/gpus.js';
import { COMPANIES } from '../../config/rivals.js';
import * as F from '../util/format.js';
import { btn, kv, chip, bar, h2, empty, seg, fchips, row, list, note, spark, scoreChip, stat } from './components.js';
import { findModel, shownScore, domainScore, quantOptions, canQuantize, readyModels } from '../engine/training.js';
import { minServeGb, weightsGb } from '../engine/memory.js';
import { has, isDone } from '../engine/research.js';
import { appIncome, datasetAvailable } from '../engine/market.js';
import { hostingCost } from '../engine/company.js';
import { canOpenSource } from '../engine/products.js';
import { openReleases } from '../engine/rivals.js';
import { recommendTraining } from '../engine/advisor.js';

const KIND = { pretrain: 'Pretraining', post: 'Post-Training', distill: 'Distillation' };

export function stageBadges(m) {
  const b = (m.stages || []).filter((s) => s !== 'base').map((s) => (s === 'distill' ? 'Distill' : METHODS[s]?.short || s));
  if (m.origin === 'open') b.unshift('Open');
  if ((m.bits || 16) < 16) b.push(`Q${m.bits}`);
  return b.map((t) => `<span class="badge">${t}</span>`).join('');
}

function products(state, m) {
  return [state.chat.modelId === m.id && m.chat && 'Chat', state.api.modelId === m.id && 'API', state.openSourced.includes(m.id) && 'Open Source', state.apps[m.task] === m.id && 'App'].filter(Boolean);
}

// Auf welcher einzelnen GPU läuft das Modell?
function fitsOn(state, m) {
  const need = minServeGb(state, m);
  const g = Object.values(GPUS).filter((x) => !x.cloudOnly && x.year <= F.gameYear(state.week)).sort((a, b) => a.vram - b.vram).find((x) => x.vram >= need);
  return g ? `passt auf 1× ${g.name.replace('GeForce ', '')}` : 'braucht mehrere GPUs (Tensor-Parallel)';
}

// ---------- Modelle ----------

function modelsView(state, ui) {
  const f = ui.modelFilter || 'all';
  const tasks = [...new Set(state.models.map((m) => m.task))];
  const ms = state.models.filter((m) => m.status !== 'training' && (f === 'all' || m.task === f));
  const open = isDone(state, 'transformer') ? openReleases(state) : [];
  const rows = ms.map((m) => {
    if (m.status === 'failed') return row({ icon: TASKS[m.task].icon, title: F.esc(m.name), sub: `Gescheitert · ${F.short(m.params)}`, cls: 'dim', right: btn('🗑', 'deleteModel', { id: m.id }, { cls: 'ghost small' }) });
    const p = products(state, m);
    return row({
      icon: TASKS[m.task].icon, title: F.esc(m.name),
      sub: `${F.short(m.params)}${m.arch === 'moe' ? ' MoE' : ''} · ${F.gb(weightsGb(m))}`,
      chips: stageBadges(m) + p.map((x) => chip(x, 'green')).join(''),
      right: scoreChip(shownScore(m), m.task === 'llm' && !m.evaluated), act: 'openSheet', data: { kind: 'model', id: m.id },
    });
  });
  return `
    ${open.length ? list([row({ icon: '📥', title: 'Open-Weight-Modelle', sub: `${open.length} frei verfügbar – herunterladen, fine-tunen, betreiben`, act: 'openSheet', data: { kind: 'openWeights' } })]) : ''}
    ${tasks.length > 1 ? fchips([['all', 'Alle'], ...tasks.map((t) => [t, TASKS[t].name])], f, 'modelFilter') : ''}
    ${rows.length ? list(rows) : empty('Noch keine Modelle. Starte ein Training im Reiter „Training“.')}`;
}

export function modelSheet(state, ui, sh) {
  const m = findModel(state, Number(sh.id));
  if (!m) return empty('Modell nicht gefunden.');
  const t = TASKS[m.task], isLlm = m.task === 'llm';
  const parent = m.parent && findModel(state, m.parent);
  const qo = quantOptions(state, m);
  const busy = state.quick.filter((q) => q.modelId === m.id);
  const p = products(state, m);
  const osWhy = isLlm ? canOpenSource(state, m) : 'x';
  const actions = [];
  if (isLlm) {
    actions.push(btn('Post-Training', 'openWizard', { kind: 'post', base: m.id }, { cls: 'small', disabled: (m.bits || 16) < 16 || !has(state, 'sft') }));
    if (!m.evaluated) actions.push(btn(busy.some((q) => q.type === 'eval') ? 'Benchmarks laufen …' : 'Benchmarks (1 Wo)', 'runEval', { id: m.id }, { cls: 'ghost small', disabled: busy.some((q) => q.type === 'eval') }));
    if (m.chat) actions.push(btn(state.chat.modelId === m.id ? 'Im Chat ✓' : 'Für Chat nutzen', 'useModel', { kind: 'chat', id: m.id }, { cls: 'ghost small', disabled: state.chat.modelId === m.id || !has(state, 'sft') }));
    actions.push(btn(state.api.modelId === m.id ? 'In API ✓' : 'Für API nutzen', 'useModel', { kind: 'api', id: m.id }, { cls: 'ghost small', disabled: state.api.modelId === m.id }));
    if (!osWhy) actions.push(btn('Open Source', 'openSource', { id: m.id }, { cls: 'ghost small' }));
  } else {
    actions.push(state.apps[m.task] === m.id ? btn('App stoppen', 'stopApp', { task: m.task }, { cls: 'ghost small' }) : btn('Als App starten', 'deployApp', { id: m.id }, { cls: 'small' }));
  }
  if (has(state, 'distill') && m.params >= 2e5) actions.push(btn('Distillieren', 'openWizard', { kind: 'distill', teacher: m.id }, { cls: 'ghost small' }));

  return `<h3>${t.icon} ${F.esc(m.name)}</h3>
    <div class="chips">${stageBadges(m)}${p.map((x) => chip(x, 'green')).join('')}</div>
    <div class="stats">
      ${stat(isLlm && !m.evaluated ? 'Score (geschätzt)' : 'Score', `${isLlm && !m.evaluated ? '~' : ''}${Math.round(shownScore(m))}`, isLlm && !m.evaluated ? `±5 · Benchmarks für den exakten Wert` : t.name)}
      ${stat('Größe', F.short(m.params) + (m.arch === 'moe' ? ' MoE' : ''), `${(m.bits || 16) < 16 ? `${m.bits} Bit` : 'BF16'} · ${F.gb(weightsGb(m))}`)}
    </div>
    ${isLlm && m.skills ? `<div class="card tight">${Object.entries(SKILLS).map(([k, n]) => `<div class="kv"><span>${n}</span><span>${m.evaluated ? Math.round(m.skills[k]) : '~' + Math.round(m.skills[k] + m.evalNoise)}</span></div>${bar(m.skills[k] / 100, true)}`).join('')}</div>` : ''}
    ${isLlm ? `<div class="label">Fachgebiete</div><div class="chips">${Object.entries(DOMAINS).map(([d, x]) => chip(`${x.icon} ${x.name} ${Math.round(domainScore(m, d))}`, (m.domainF?.[d] || 0) > 0.6 ? 'blue' : '')).join('')}</div>` : ''}
    <div class="card tight">
      ${kv('Inferenz-VRAM', `${F.gb(minServeGb(state, m))} (${fitsOn(state, m)})`)}
      ${isLlm ? kv('Chatfähig', m.chat ? 'ja' : 'nein – braucht SFT') : kv('App', `${F.money(appIncome(state, m))}/Wo · Hosting ${F.money(hostingCost(m))}/Wo`)}
      ${parent ? kv('Basis', F.esc(parent.name)) : ''}
      ${m.origin === 'open' ? kv('Herkunft', 'Open-Weight (fremd)') : m.origin === 'derived' ? kv('Herkunft', 'Fine-Tune eines Open-Weight-Modells') : ''}
      ${m.quantMethod ? kv('Quantisierung', m.quantMethod) : ''}
    </div>
    <div class="btns">${actions.join('')}</div>
    ${qo.length ? `<div class="label">Quantisieren (1 Woche)</div>${list(qo.map((o) => {
      const why = canQuantize(state, m, o.bits);
      return row({ title: `${o.bits} Bit · ${o.method}`, sub: `Score ~${Math.round(o.score)} (${Math.round(o.score - m.score) >= 0 ? '±0' : Math.round(o.score - m.score)}) · ${F.gb(weightsGb(m, o.bits))}`, right: btn(why || 'Start', 'quantize', { id: m.id, bits: o.bits }, { cls: 'small', disabled: !!why }) });
    }))}` : ''}
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Löschen', 'deleteModel', { id: m.id }, { cls: 'danger', disabled: p.length > 0 || state.job?.modelId === m.id })}</div>`;
}

export function openWeightsSheet(state) {
  const rel = openReleases(state);
  return `<h3>Open-Weight-Modelle</h3>
    ${note('Kostenlos herunterladen. Chatfähig ab Werk. Du kannst sie per Post-Training spezialisieren, quantisieren und auf eigener Hardware betreiben – nur Open-Source-Ruf gibt es dafür nicht.')}
    ${list(rel.map((r) => {
      const have = state.models.some((m) => m.openName === r.name);
      const need = (r.params * 2) / 1e9;
      return row({
        icon: '📦', title: r.name, sub: `${COMPANIES[r.company].name} · ${F.short(r.params)}${r.moe ? ' MoE' : ''} · ${F.gb(need)} in BF16 · ${F.date(r.week)}`,
        right: have ? chip('✓', 'green') : `${scoreChip(r.score)}<br>${btn('Laden', 'download', { name: r.name }, { cls: 'small' })}`,
      });
    }))}
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}</div>`;
}

// ---------- Training ----------

function jobCard(state) {
  const j = state.job, m = findModel(state, j.modelId);
  const p = Math.min(1, j.flopsDone / j.flopsNeeded);
  const s = j.spec;
  return `<div class="card hl">
    <div class="row"><div class="ico">${TASKS[m.task].icon}</div><div class="grow"><div class="title">${F.esc(m.name)}</div>
      <div class="sub">${KIND[s.kind]}${s.kind === 'post' ? ` · ${METHODS[s.method].short}` : ''} · Woche ${j.weeksDone} von ~${j.estWeeks}</div></div>
      <div class="right big">${F.pct(p)}</div></div>
    ${bar(p)}
    ${j.curve.length > 1 ? `<div class="curve"><span class="sub">Loss</span>${spark(j.curve)}</div>` : ''}
    <div class="chips">${chip(PRECISION[s.precision].name, 'blue')}${chip(`LR ${{ low: 'niedrig', mid: 'mittel', high: 'hoch' }[j.lr]}`)}
      ${chip(s.ckptEvery ? `Checkpoint alle ${s.ckptEvery} Wo` : 'ohne Checkpoints', s.ckptEvery ? '' : 'amber')}
      ${s.ckpt ? chip('Grad.-Ckpt') : ''}${s.sharding !== 'none' ? chip(s.sharding.toUpperCase()) : ''}${s.offload ? chip('Offload') : ''}</div>
    ${j.paused ? `<div class="err">⏸️ Pausiert: ${j.paused === 'spike' ? 'Loss-Spike – Entscheidung offen' : j.paused}</div>` : ''}
    <div class="btns">${j.paused === 'spike' ? btn('Entscheiden', 'openEvent', {}, { cls: 'small' }) : ''}${btn('Abbrechen', 'confirm', { what: 'abortJob' }, { cls: 'danger small' })}</div></div>`;
}

function jobsView(state) {
  const llms = readyModels(state).filter((m) => m.task === 'llm');
  const rec = state.job ? null : recommendTraining(state);
  const recCard = rec ? `<div class="advisor"><div class="row"><span class="ico">✨</span><span class="grow"><span class="k">Empfohlenes Training</span><b>${F.esc(rec.spec.name)}</b>
      <span class="sub">${rec.why} · ${rec.p.weeks} Wo · VRAM ${F.gb(rec.p.mem.perGpu)}/${F.gb(rec.p.mem.cap)}</span></span></div>
      <div class="btns">${btn('Starten', 'startRecommended')}${btn('Anpassen', 'applyRec', {}, { cls: 'ghost' })}</div></div>`
    : state.job ? '' : note('Gerade passt kein sinnvolles Training auf deine Hardware (VRAM, Daten oder Zeit). Mehr GPUs oder Daten kaufen – oder selbst im Wizard probieren.', 'amber');
  const start = state.job ? '' : `${recCard}<div class="card">
    <div class="title">Selbst konfigurieren</div>
    <div class="sub">Pretraining baut ein Basis-Modell. Post-Training macht LLMs chatfähig und schlauer. Distillation schrumpft große Modelle.</div>
    <div class="btns">${btn('Pretraining', 'openWizard', { kind: 'pretrain' })}</div>
    <div class="btns">${btn('Post-Training', 'openWizard', { kind: 'post' }, { cls: 'ghost', disabled: !llms.length || !has(state, 'sft'), title: 'Braucht ein LLM und Instruction Tuning' })}
      ${btn('Distillation', 'openWizard', { kind: 'distill' }, { cls: 'ghost', disabled: !has(state, 'distill') || !readyModels(state).length })}</div></div>`;
  const quick = state.quick.map((q) => {
    const m = findModel(state, q.modelId);
    return row({ icon: q.type === 'eval' ? '📊' : '🗜️', title: `${q.type === 'eval' ? 'Benchmarks' : `Quantisierung ${q.bits} Bit`}: ${F.esc(m?.name || '?')}`, sub: 'fertig nächste Woche' });
  });
  return `${h2('Training')}${state.job ? jobCard(state) : start}
    ${quick.length ? h2('Nebenher') + list(quick) : ''}`;
}

// ---------- Daten ----------

function dataView(state) {
  const shop = Object.keys(DATASETS).filter((id) => datasetAvailable(state, id));
  const card = (id, buy) => {
    const d = DATASETS[id];
    const use = d.use || ['pretrain'];
    const tags = d.tags.map((t) => chip(Object.values(TASKS).find((x) => x.tag === t)?.name || t, 'blue')).join('');
    const post = use.filter((u) => u !== 'pretrain').map((u) => chip({ sft: 'SFT', pref: 'RLHF/DPO', reasoning: 'Reasoning-RL', agent: 'Agentic-RL' }[u], 'green')).join('');
    return row({
      title: d.name, sub: `${F.count(d.tokens)} Tokens · Q ${F.pct(d.quality)} · ${F.tb((d.tokens * (d.bpt ?? 2)) / 1e12)}${d.domain ? ` · ${DOMAINS[d.domain].icon} ${DOMAINS[d.domain].name}` : ''}<br>${d.desc}`,
      chips: tags + post,
      right: buy ? btn(state.money < d.cost ? F.money(d.cost) : d.cost ? F.money(d.cost) : 'Gratis', 'buyDs', { id }, { cls: 'small', disabled: state.money < d.cost }) : '',
    });
  };
  return `${h2('Shop')}${shop.length ? list(shop.map((id) => card(id, true))) : empty('Neue Datasets gibt es durch Forschung und mit der Zeit.')}
    ${h2(`Gekauft (${state.datasets.length})`)}${state.datasets.length ? list(state.datasets.map((id) => card(id, false))) : empty('Noch nichts gekauft.')}`;
}

export function labView(state, ui) {
  const s = ui.seg.lab;
  const views = { models: modelsView, jobs: jobsView, data: dataView };
  return `${seg([['jobs', 'Training'], ['models', `Modelle (${state.models.filter((m) => m.status === 'ready').length})`], ['data', 'Daten']], s, 'seg', { tab: 'lab' })}${views[s](state, ui)}`;
}
