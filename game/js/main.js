import { newGame, load, save, exportSave, importSave, clearSave, dropOldSave } from './state.js';
import { PARAM_STEPS } from '../config/formulas.js';
import * as F from './util/format.js';
import { advanceWeek, skip } from './engine/turn.js';
import {
  buyMachine, setRole, duplicate, sellMachines, addGpu, fillGpus, removeGpu, swapPart, addPart, removePart, setCloud, rentCloud, buyPreset, autoBalance,
} from './engine/hardware.js';
import { move, hire, fire } from './engine/company.js';
import { startResearch, unqueue } from './engine/research.js';
import { startJob, abortJob, quantize, runEval, deleteModel, downloadOpen, datasetsFor, postDatasets, findModel } from './engine/training.js';
import { deliver, deployApp, stopApp, buyDataset, weeklyIncome, tickContracts, candidate, meets } from './engine/market.js';
import { setProductModel, setChatPrice, setApiPrice, openSource } from './engine/products.js';
import { weeklyCosts } from './engine/company.js';
import { resolveEvent } from './engine/events.js';
import { raise } from './engine/funding.js';
import { checkGoals } from './engine/goals.js';
import { alerts } from './engine/alerts.js';
import { openReleases } from './engine/rivals.js';
import { btn } from './ui/components.js';
import { homeView } from './ui/home.js';
import { infraView, machineSheet, partSheet, gpuSlotSheet, gpuInstallSheet } from './ui/infra.js';
import { labView, modelSheet, openWeightsSheet } from './ui/lab.js';
import { wizardSheet, defaultForm, specFromForm, fitIdx, formFromSpec } from './ui/wizard.js';
import { researchView } from './ui/research.js';
import { businessView } from './ui/business.js';
import { pickModelSheet } from './ui/products.js';
import { eventSheet, settingsSheet, importSheet, exportSheet, confirmSheet, newGameSheet } from './ui/sheets.js';
import { recommendTraining, autoScale } from './engine/advisor.js';

const loaded = load();
let state = loaded || freshGame();
const firstStart = !loaded;
const ui = {
  tab: 'home', seg: { infra: 'machines', lab: 'jobs', biz: 'contracts' }, sheet: null, form: null,
  open: {}, shopTab: 'presets', used: false, oldGpus: false, modelFilter: 'all', branch: 'all', rankKey: 'score', exportText: '',
};
if (firstStart) ui.sheet = { kind: 'newGame', first: 1 };

function freshGame(difficulty) {
  const s = newGame(Date.now(), difficulty);
  tickContracts(s); tickContracts(s);
  return s;
}

const TABS = [
  ['home', '🏠', 'Zentrale', homeView],
  ['infra', '🖥️', 'Infra', infraView],
  ['lab', '🧪', 'Labor', labView],
  ['research', '🔬', 'Forschung', researchView],
  ['biz', '💼', 'Business', businessView],
];

const SHEETS = {
  machine: machineSheet, part: partSheet, gpuSlot: gpuSlotSheet, gpuInstall: gpuInstallSheet,
  model: modelSheet, openWeights: openWeightsSheet, wizard: wizardSheet, pickModel: pickModelSheet,
  event: eventSheet, settings: settingsSheet, import: importSheet, export: exportSheet, confirm: confirmSheet, newGame: newGameSheet,
};

// ---------- Rendering ----------

const $ = (sel) => document.querySelector(sel);

function render() {
  const net = weeklyIncome(state) - weeklyCosts(state).total;
  $('#top').innerHTML = `<div><div class="money ${state.money < 0 ? 'neg' : ''}">${F.money(state.money)}</div>
    <div class="delta ${net < -0.5 ? 'bad' : ''}">${net >= -0.5 ? '+' : ''}${F.money(net)} / Woche</div></div>
    <div class="date"><b>Woche ${state.week + 1}</b>${F.date(state.week)}</div>
    <button class="gear" data-act="openSheet" data-kind="settings" aria-label="Menü">⚙️</button>`;

  const view = TABS.find((t) => t[0] === ui.tab)[3];
  $('#main').innerHTML = state.gameOver ? gameOverView() : view(state, ui);

  const canSkip = !!(state.job || state.research.current || state.quick.length);
  $('#actionbar').innerHTML = state.gameOver ? '' : state.pending.length
    ? btn(`❗ Entscheidung offen (${state.pending.length})`, 'openEvent', {}, { cls: 'danger' })
    : btn('Nächste Woche ▶', 'next') + btn('⏩', 'skip', {}, { cls: 'ghost skip', disabled: !canSkip, title: 'Vorspulen bis etwas passiert' });

  const al = alerts(state);
  const dots = {
    home: al.some((a) => a.level === 'red'),
    biz: state.contracts.some((c) => { const m = candidate(state, c); return m && meets(state, c, m); }) || al.some((a) => a.icon === '💰'),
  };
  $('#tabs').innerHTML = TABS.map(([id, icon, label]) =>
    `<button class="${ui.tab === id ? 'on' : ''} ${dots[id] ? 'dot' : ''}" data-act="tab" data-id="${id}"><span class="i">${icon}</span>${label}</button>`).join('');

  renderSheet();
}

function renderSheet() {
  const el = $('#sheet');
  if (!ui.sheet) { el.innerHTML = ''; return; }
  const prev = el.querySelector('.sheet');
  const scroll = prev?.scrollTop || 0;
  const key = `${ui.sheet.kind}:${ui.sheet.id || ''}:${ui.sheet.m || ''}:${ui.sheet.part || ''}:${ui.form?.step ?? ''}`;
  const same = prev && prev.dataset.key === key;
  const content = SHEETS[ui.sheet.kind]?.(state, ui, ui.sheet) || '';
  el.innerHTML = `<div class="sheet-bg" data-act="bgClose"><div class="sheet${prev ? '' : ' anim'}" data-key="${key}"><div class="grab"></div>${content}</div></div>`;
  el.querySelector('.sheet').scrollTop = same ? scroll : 0;
}

function gameOverView() {
  return `<div class="over"><div style="font-size:56px">💸</div><div class="big">Pleite</div>
    <p class="sub">Deine Firma hat in Woche ${state.week} aufgegeben.</p>
    ${btn('Neuer Run', 'reset', {}, { cls: 'block' })}</div>`;
}

function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.textContent = text;
  const box = $('#toasts');
  box.appendChild(el);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => el.remove(), 2600);
}

function showEvents(events) {
  const imp = events.filter((e) => e.important);
  const rest = events.filter((e) => !e.important);
  for (const e of imp.slice(0, 2)) toast(e.text, ['fail', 'warn', 'gameover'].includes(e.type) ? 'red' : e.type === 'goal' ? 'green' : 'blue');
  if (imp.length < 2) for (const e of rest.slice(-(2 - imp.length))) toast(e.text);
  if (state.pending.length) ui.sheet = { kind: 'event' };
}

// ---------- Aktionen ----------

const num = (v) => Number(v);
const sheet = (s) => { ui.sheet = s; };
const machineBack = (id) => sheet({ kind: 'machine', id });
const upgraded = (ok) => { if (ok) state.stats.upgrades++; };

function resetDatasets() {
  const f = ui.form;
  f.datasets = f.kind === 'pretrain' ? datasetsFor(state, f.task).slice(0, 1) : f.kind === 'post' ? postDatasets(state, f.method) : [];
}

const actions = {
  tab: ({ id, seg }) => { ui.tab = id; if (seg) ui.seg[id] = seg; ui.sheet = null; window.scrollTo(0, 0); },
  seg: ({ tab, id, shop }) => { ui.tab = tab; ui.seg[tab] = id; if (shop) ui.shopTab = shop; ui.sheet = null; window.scrollTo(0, 0); },
  shopTab: ({ id }) => { ui.shopTab = id; },
  toggleUsed: ({ id }) => { ui.used = id === '1'; },
  toggleOld: () => { ui.oldGpus = !ui.oldGpus; },
  modelFilter: ({ id }) => { ui.modelFilter = id; },
  branch: ({ id }) => { ui.branch = id; },
  rankKey: ({ id }) => { ui.rankKey = id; },
  toggle: ({ id }) => { ui.open[id] = !(ui.open[id] ?? false); },

  next: () => {
    if (state.pending.length) { sheet({ kind: 'event' }); return; }
    showEvents(advanceWeek(state));
  },
  skip: () => {
    const w = state.week;
    const ev = skip(state);
    if (state.week - w > 1) toast(`${state.week - w} Wochen vorgespult`);
    showEvents(ev);
  },
  openEvent: () => sheet({ kind: 'event' }),
  resolve: ({ id, c }) => {
    const t = resolveEvent(state, num(id), c);
    if (t) toast(t, 'blue');
    if (!state.pending.length) ui.sheet = null;
  },

  openSheet: (d) => sheet({ ...d }),
  closeSheet: () => { ui.sheet = null; },
  bgClose: (_, ev) => { if (ev.target.classList.contains('sheet-bg') && !ui.sheet?.first) ui.sheet = null; },
  openMachine: ({ id }) => machineBack(num(id)),
  openMachineBack: ({ id }) => machineBack(num(id)),
  openModel: ({ id }) => sheet({ kind: 'model', id: num(id) }),

  buyPreset: ({ c, g, n }) => {
    const m = buyPreset(state, c, g, num(n || 1));
    if (m) toast(`${num(n || 1) > 1 ? `${n}× ` : ''}${m.name} gekauft`, 'blue');
  },
  autoBalance: ({ id }) => { const why = autoBalance(state, num(id)); toast(why || 'Optimiert!', why ? 'red' : 'blue'); },
  startRecommended: () => {
    const r = recommendTraining(state);
    const m = r && startJob(state, r.spec);
    if (m) { ui.sheet = null; toast(`Training gestartet: ${m.name}`, 'blue'); }
  },
  applyRec: () => { const r = recommendTraining(state); if (r) { ui.form = formFromSpec(state, r.spec); sheet({ kind: 'wizard' }); } },
  useBoth: ({ id }) => { setProductModel(state, 'chat', num(id)); setProductModel(state, 'api', num(id)); if (state.settings.autoScale) autoScale(state); toast('Chat & API live', 'blue'); },
  buyMachine: ({ id, n }) => {
    const m = buyMachine(state, id, num(n || 1));
    if (m) { toast(`${m.name} gekauft`, 'blue'); machineBack(m.id); }
  },
  setRole: ({ m, id }) => { setRole(state, String(m).startsWith('cloud:') ? m : num(m), id); },
  duplicate: ({ m, n }) => duplicate(state, num(m), num(n)),
  sellMachine: ({ m, n }) => {
    sellMachines(state, num(m), num(n));
    if (!state.machines.some((x) => x.id === num(m))) ui.sheet = null;
  },
  addGpu: ({ m, id, used }) => { if (addGpu(state, num(m), id, used === '1')) toast('GPU eingebaut', 'blue'); },
  fillGpu: ({ m, id, used }) => { const k = fillGpus(state, num(m), id, used === '1'); if (k) toast(`${k} GPU(s) eingebaut`, 'blue'); },
  removeGpu: ({ m, idx }) => { removeGpu(state, num(m), num(idx)); machineBack(num(m)); },
  swapPart: ({ m, part, id }) => upgraded(swapPart(state, num(m), part, id)),
  addPart: ({ m, part, id }) => upgraded(addPart(state, num(m), part, id)),
  removePart: ({ m, part, idx }) => removePart(state, num(m), part, num(idx)),
  cloud: ({ id, d }) => { const c = state.cloud.find((x) => x.id === num(id)); if (c) setCloud(state, c.id, c.n + num(d)); },
  rentCloud: ({ id }) => rentCloud(state, id, 1, 'train'),
  move: ({ id }) => move(state, id),
  staff: ({ role, d }) => { if (num(d) > 0) { hire(state, role, num(d)); state.stats.hiredWeek = state.week; } else fire(state, role, -num(d)); },

  research: ({ id }) => startResearch(state, id),
  unqueue: ({ id }) => unqueue(state, id),

  openWizard: ({ kind, base, teacher }) => { ui.form = defaultForm(state, kind, { base, teacher }); sheet({ kind: 'wizard' }); },
  form: ({ k, v }) => { ui.form[k] = v; if (k === 'task') { resetDatasets(); ui.form.arch = 'dense'; ui.form.pIdx = fitIdx(state, ui.form.datasets); } },
  formSet: ({ k, id, num: isNum, bool }) => { ui.form[k] = bool ? id === '1' : isNum ? num(id) : id; },
  toggleDs: ({ id }) => {
    const ds = ui.form.datasets;
    ui.form.datasets = ds.includes(id) ? ds.filter((x) => x !== id) : [...ds, id];
  },
  formBase: ({ id }) => {
    ui.form = defaultForm(state, 'post', { base: id });
  },
  formMethod: ({ id }) => { ui.form.method = id; resetDatasets(); },
  formTeacher: ({ id }) => { const step = ui.form.step; ui.form = { ...defaultForm(state, 'distill', { teacher: id }), step }; },
  formStep: ({ id }) => { ui.form.step = num(id); },
  startJob: () => {
    const m = startJob(state, specFromForm(state, ui.form));
    if (m) { ui.sheet = null; ui.tab = 'lab'; ui.seg.lab = 'jobs'; toast(`Training gestartet: ${m.name}`, 'blue'); }
  },
  abortJob: () => { abortJob(state); ui.sheet = null; },
  goInfra: () => { ui.tab = 'infra'; ui.seg.infra = 'machines'; ui.sheet = null; },

  quantize: ({ id, bits }) => { if (quantize(state, num(id), num(bits))) toast('Quantisierung läuft (1 Woche)', 'blue'); },
  runEval: ({ id }) => { if (runEval(state, num(id))) toast('Benchmarks laufen (1 Woche)', 'blue'); },
  deleteModel: ({ id }) => { deleteModel(state, num(id)); if (ui.sheet?.kind === 'model') ui.sheet = null; },
  download: ({ name }) => {
    const r = openReleases(state).find((x) => x.name === name);
    const m = r && downloadOpen(state, r);
    if (m) toast(`${m.name} heruntergeladen`, 'blue');
  },
  useModel: ({ kind, id }) => { setProductModel(state, kind, num(id)); if (state.settings.autoScale) autoScale(state); if (ui.sheet?.kind === 'pickModel') ui.sheet = null; toast(`${findModel(state, num(id)).name} läuft jetzt im ${kind === 'chat' ? 'Chat' : 'API'}`, 'blue'); },
  stopProduct: ({ kind }) => setProductModel(state, kind, null),
  chatPrice: ({ v }) => setChatPrice(state, num(v)),
  apiPrice: ({ v }) => setApiPrice(state, num(v)),
  openSource: ({ id }) => {
    const gain = openSource(state, num(id));
    if (gain) toast(`Open Source veröffentlicht: +${F.num(gain, 1)} Ruf`, 'blue');
  },
  deployApp: ({ id }) => deployApp(state, num(id)),
  stopApp: ({ task }) => stopApp(state, task),

  deliver: ({ id }) => {
    const c = deliver(state, num(id));
    if (c) toast(`Auftrag geliefert: +${F.money(c.reward)}${c.sub ? ` · wird Stammkunde (${F.money(c.sub.weekly)}/Wo)` : ''}`, 'green');
  },
  buyDs: ({ id }) => buyDataset(state, id),
  raise: () => { const r = raise(state); if (r) toast(`${r.name}: +${F.money(r.money)}`, 'green'); },

  export: () => { ui.exportText = exportSave(state); sheet({ kind: 'export' }); },
  copyExport: async () => {
    try { await navigator.clipboard.writeText(ui.exportText); toast('Kopiert!', 'blue'); }
    catch { $('#exportText').select(); toast('Bitte manuell kopieren'); }
  },
  downloadExport: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ui.exportText], { type: 'text/plain' }));
    a.download = `ai-company-woche-${state.week + 1}.txt`;
    a.click();
  },
  doImport: () => {
    try {
      state = importSave($('#importText').value);
      ui.sheet = null;
      toast('Spielstand geladen', 'blue');
    } catch (e) { toast('Import fehlgeschlagen: ' + e.message, 'red'); }
  },
  confirm: ({ what }) => sheet({ kind: 'confirm', what }),
  reset: () => { clearSave(); state = freshGame(); ui.sheet = null; ui.tab = 'home'; },
  newGame: ({ d }) => { clearSave(); dropOldSave(); state = freshGame(d); ui.sheet = null; ui.tab = 'home'; window.scrollTo(0, 0); },
  toggleSetting: ({ k, id }) => { state.settings[k] = id === '1'; },
};

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.dataset.act === 'bgClose' && el !== ev.target) return;
  await fn({ ...el.dataset }, ev);
  for (const g of checkGoals(state)) toast(`🎯 Ziel erreicht: ${g.text}${g.reward ? ` (+${F.money(g.reward)})` : ''}`, 'green');
  save(state);
  render();
});

document.addEventListener('input', (ev) => {
  const k = ev.target.dataset.input;
  if (!k || !ui.form) return;
  ui.form[k] = k === 'pIdx' || k === 'sIdx' ? num(ev.target.value) : ev.target.value;
  // Slider: nur das Label live updaten, komplett neu rendern erst beim Loslassen
  if (k === 'pIdx') $('#pLabel').textContent = F.params(PARAM_STEPS[ui.form.pIdx]);
  if (k === 'sIdx') $('#sLabel').textContent = F.params(PARAM_STEPS[ui.form.sIdx]);
});

document.addEventListener('change', (ev) => {
  if (['pIdx', 'sIdx'].includes(ev.target.dataset.input)) renderSheet();
});

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
