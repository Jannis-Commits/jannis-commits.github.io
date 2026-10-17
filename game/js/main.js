import { newGame, load, save, exportSave, importSave, clearSave } from './state.js';
import { PARAM_STEPS } from '../config/formulas.js';
import { TASKS } from '../config/tasks.js';
import * as F from './util/format.js';
import { advanceWeek, skip } from './engine/turn.js';
import { startTraining, abortTraining, quantize, deleteModel, datasetsFor } from './engine/training.js';
import { buyHardware, sellHardware, move, setCloud, hire, fire, weeklyCosts } from './engine/company.js';
import { startResearch } from './engine/research.js';
import { deliver, deployApp, stopApp, buyDataset, weeklyIncome, tickContracts } from './engine/market.js';
import { setChatModel, setApiModel, setChatPrice, setApiPrice, setInferenceShare, openSource } from './engine/products.js';
import { pickModelSheet } from './ui/products.js';
import { firmaView } from './ui/firma.js';
import { modelsView, trainSheet, defaultForm, maxParamIdx } from './ui/models.js';
import { researchView } from './ui/research.js';
import { marketView } from './ui/market.js';
import { moreView, importSheet, exportSheet, confirmSheet } from './ui/more.js';
import { btn } from './ui/components.js';

let state = load() || freshGame();
const ui = { tab: 'firma', sheet: null, form: null, marketSeg: 'contracts', rankKey: 'score', exportText: '' };

function freshGame() {
  const s = newGame();
  tickContracts(s); tickContracts(s);
  return s;
}

const TABS = [
  ['firma', '🏢', 'Firma', firmaView],
  ['models', '🧠', 'Modelle', modelsView],
  ['research', '🔬', 'Forschung', researchView],
  ['market', '📈', 'Markt', marketView],
  ['more', '⋯', 'Mehr', moreView],
];

// ---------- Rendering ----------

const $ = (sel) => document.querySelector(sel);

function render() {
  const net = weeklyIncome(state) - weeklyCosts(state).total;
  $('#top').innerHTML = `<div><div class="money ${state.money < 0 ? 'neg' : ''}">${F.money(state.money)}</div>
    <div class="delta">${net >= 0 ? '+' : ''}${F.money(net)} / Woche</div></div>
    <div class="date"><b>Woche ${state.week + 1}</b>${F.date(state.week)}</div>`;

  const view = TABS.find((t) => t[0] === ui.tab)[3];
  $('#main').innerHTML = state.gameOver ? gameOverView() : view(state, ui);

  const canSkip = !!(state.training || state.research.current);
  $('#actionbar').innerHTML = state.gameOver ? '' :
    btn('Nächste Woche ▶', 'next') + btn('⏩', 'skip', {}, { cls: 'ghost skip', disabled: !canSkip, title: 'Vorspulen bis Training/Forschung fertig' });

  const ready = state.contracts.some((c) => state.models.some((m) => m.task === c.task && m.status === 'ready' && m.score >= c.minScore));
  $('#tabs').innerHTML = TABS.map(([id, icon, label]) =>
    `<button class="${ui.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}"><span class="i ${id === 'market' && ready ? 'dot' : ''}">${icon}</span>${label}</button>`).join('');

  renderSheet();
}

function renderSheet() {
  const el = $('#sheet');
  if (!ui.sheet) { el.innerHTML = ''; return; }
  const prev = el.querySelector('.sheet');
  const scroll = prev?.scrollTop || 0;
  const anim = !prev || prev.dataset.kind !== ui.sheet ? ' anim' : '';
  const content = ui.sheet === 'train' ? trainSheet(state, ui.form)
    : ui.sheet === 'import' ? importSheet()
    : ui.sheet === 'export' ? exportSheet(ui.exportText)
    : ui.sheet === 'reset' ? confirmSheet('Dein aktueller Spielstand wird gelöscht.', 'reset')
    : ui.sheet === 'pickModel' ? pickModelSheet(state, ui.pickKind)
    : '';
  el.innerHTML = `<div class="sheet-bg" data-act="bgClose"><div class="sheet${anim}" data-kind="${ui.sheet}"><div class="grab"></div>${content}</div></div>`;
  el.querySelector('.sheet').scrollTop = scroll;
}

function gameOverView() {
  return `<div class="over"><div style="font-size:56px">💸</div><div class="big">Pleite</div>
    <p class="sub">Deine Firma hat in Woche ${state.week} aufgegeben.<br>Prestige-Boni kommen in einer späteren Version.</p>
    ${btn('Neuer Run', 'reset', {}, { cls: 'block' })}</div>`;
}

function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.textContent = text;
  const box = $('#toasts');
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 2800);
}

function showEvents(events) {
  const imp = events.filter((e) => e.important);
  const rest = events.filter((e) => !e.important);
  for (const e of imp.slice(0, 3)) toast(e.text, e.type === 'fail' || e.type === 'warn' || e.type === 'gameover' ? 'red' : 'blue');
  for (const e of rest.slice(-2)) toast(e.text);
}

// ---------- Aktionen ----------

const num = (v) => Number(v);

const actions = {
  tab: ({ id }) => { ui.tab = id; window.scrollTo(0, 0); },
  next: () => showEvents(advanceWeek(state)),
  skip: () => {
    const w = state.week;
    const ev = skip(state);
    toast(`${state.week - w} Wochen vorgespult`);
    showEvents(ev);
  },

  buyHw: ({ id, n }) => {
    const k = buyHardware(state, id, num(n || 1));
    if (k > 1) toast(`${k}× gekauft`, 'blue');
  },
  sellHw: ({ id, n }) => sellHardware(state, id, num(n || 1)),
  move: ({ id }) => move(state, id),
  cloud: ({ d }) => setCloud(state, state.cloudGpus + num(d)),
  staff: ({ role, d }) => (num(d) > 0 ? hire(state, role, num(d)) : fire(state, role, -num(d))),

  research: ({ id }) => startResearch(state, id),

  openTrain: () => { ui.form = defaultForm(state); ui.sheet = 'train'; },
  form: ({ k, v }) => {
    ui.form[k] = v;
    if (k === 'task') { ui.form.datasets = datasetsFor(state, v).slice(0, 1); ui.form.name = ''; }
  },
  formEpochs: ({ id }) => { ui.form.epochs = num(id); },
  formArch: ({ id }) => { ui.form.arch = id; },
  toggleDs: ({ id }) => {
    const ds = ui.form.datasets;
    ui.form.datasets = ds.includes(id) ? ds.filter((x) => x !== id) : [...ds, id];
  },
  startTraining: () => {
    const f = ui.form;
    const n = state.models.filter((m) => m.task === f.task).length + 1;
    const m = startTraining(state, {
      ...f,
      params: PARAM_STEPS[Math.min(f.pIdx, maxParamIdx(state))],
      name: f.name.trim() || `${TASKS[f.task].name} v${n}`,
    });
    if (m) { ui.sheet = null; toast(`Training gestartet: ${m.name}`, 'blue'); }
  },
  abortTraining: () => abortTraining(state),
  quantize: ({ id, bits }) => quantize(state, num(id), num(bits)),
  deleteModel: ({ id }) => deleteModel(state, num(id)),
  deployApp: ({ id }) => deployApp(state, num(id)),
  stopApp: ({ task }) => stopApp(state, task),
  goProducts: () => { ui.tab = 'market'; ui.marketSeg = 'products'; window.scrollTo(0, 0); },

  pickModel: ({ kind }) => { ui.pickKind = kind; ui.sheet = 'pickModel'; },
  setModel: ({ kind, id }) => {
    (kind === 'chat' ? setChatModel : setApiModel)(state, num(id));
    ui.sheet = null;
  },
  stopChat: () => setChatModel(state, null),
  stopApi: () => setApiModel(state, null),
  chatPrice: ({ v }) => setChatPrice(state, num(v)),
  apiPrice: ({ v }) => setApiPrice(state, num(v)),
  infShare: ({ v }) => setInferenceShare(state, num(v)),
  openSource: ({ id }) => {
    const gain = openSource(state, num(id));
    if (gain) toast(`Open Source veröffentlicht: +${F.num(gain, 1)} Ruf`, 'blue');
  },

  marketSeg: ({ id }) => { ui.marketSeg = id; },
  rankKey: ({ id }) => { ui.rankKey = id; },
  deliver: ({ id }) => {
    const c = deliver(state, num(id));
    if (c) toast(`Auftrag geliefert: +${F.money(c.reward)}`, 'blue');
  },
  buyDs: ({ id }) => buyDataset(state, id),

  export: () => { ui.exportText = exportSave(state); ui.sheet = 'export'; },
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
  openImport: () => { ui.sheet = 'import'; },
  doImport: () => {
    try {
      state = importSave($('#importText').value);
      ui.sheet = null;
      toast('Spielstand geladen', 'blue');
    } catch (e) { toast('Import fehlgeschlagen: ' + e.message, 'red'); }
  },
  confirmReset: () => { ui.sheet = 'reset'; },
  reset: () => { clearSave(); state = freshGame(); ui.sheet = null; ui.tab = 'firma'; },

  closeSheet: () => { ui.sheet = null; },
  bgClose: (_, ev) => { if (ev.target.classList.contains('sheet-bg')) ui.sheet = null; },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.dataset.act === 'bgClose' && el !== ev.target) return;
  fn(el.dataset, ev);
  save(state);
  render();
});

document.addEventListener('input', (ev) => {
  const k = ev.target.dataset.input;
  if (!k || !ui.form) return;
  ui.form[k] = k === 'pIdx' ? num(ev.target.value) : ev.target.value;
  // Slider: nur das Label live updaten, komplett neu rendern erst beim Loslassen
  if (k === 'pIdx') $('#pLabel').textContent = F.params(PARAM_STEPS[ui.form.pIdx]);
});

document.addEventListener('change', (ev) => {
  if (ev.target.dataset.input === 'pIdx') renderSheet();
});

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
