// Einstieg: Zustand, Rendering, Aktionen (Event-Delegation über data-act).
import { newGame, load, save, clearSave, exportSave, importSave, loadMeta } from './state.js';
import * as F from './util/format.js';
import { TYPE } from '../config/productTypes.js';
import { ROLE } from '../config/roles.js';
import { ECOSYSTEM } from '../config/balance.js';
import { NODE } from '../config/research.js';
import { advanceWeek, skipWeeks } from './engine/turn.js';
import { productById, projectById, staffById, resetFxCache, freeSeats } from './engine/core.js';
import { createProject, cancelProject, releaseNow, updateForm, suggestName, defaultModel, defaultPrice, maxPlatforms, retireProduct, stepPrice, validateForm } from './engine/projects.js';
import { hire, hireBulk, fire, raise, assign, searchApplicants } from './engine/staff.js';
import { moveOffice, upgradeHardware } from './engine/office.js';
import { startResearch, completeResearch } from './engine/research.js';
import { startCampaign } from './engine/marketing.js';
import { takeLoan, repayLoan, acceptOffer, declineOffer, goPublic, weeklyIncome, weeklyCosts } from './engine/finance.js';
import { buyRival } from './engine/rivals.js';
import { resolveEvent, triggerEvent } from './engine/events.js';
import { chooseBoost } from './engine/victory.js';
import { RESEARCH } from '../config/research.js';
import { dashboardView, alerts } from './ui/dashboard.js';
import { projectsView, projectSheet, wizardSheet, newForm, campaignSheet } from './ui/projects.js';
import { productsView, productSheet } from './ui/products.js';
import { teamView, staffSheet, bulkSheet } from './ui/team.js';
import { researchView } from './ui/research.js';
import { marketView, rivalSheet } from './ui/market.js';
import { settingsSheet } from './ui/settings.js';
import { modalView } from './ui/modal.js';
import { tutorialTab } from './ui/tutorial.js';

let state = load() || newGame();
const ui = { tab: 'home', sheet: null, form: null, prevTab: null, shownMoney: state.money, taps: 0 };

const TABS = [
  ['home', '🏠', 'Home', dashboardView],
  ['projects', '⌨️', 'Projekte', projectsView],
  ['products', '📦', 'Produkte', productsView],
  ['team', '👥', 'Team', teamView],
  ['research', '🔬', 'Forschung', researchView],
  ['market', '📈', 'Markt', marketView],
];

const SHEETS = {
  wizard: () => wizardSheet(state, ui.form),
  project: () => projectSheet(state, ui),
  product: () => productSheet(state, ui),
  staff: () => staffSheet(state, ui),
  campaign: () => campaignSheet(state, ui),
  rival: () => rivalSheet(state, ui),
  settings: () => settingsSheet(state, ui),
  bulk: () => bulkSheet(state, ui),
};

const $ = (sel) => document.querySelector(sel);

// ---------- Rendering ----------
function render() {
  renderTop();
  const view = TABS.find((t) => t[0] === ui.tab)[3];
  const main = $('#main');
  const scroll = window.scrollY;
  main.innerHTML = view(state, ui);
  if (ui.prevTab !== ui.tab) {
    main.classList.remove('enter');
    void main.offsetWidth;
    main.classList.add('enter');
    window.scrollTo(0, 0);
    ui.prevTab = ui.tab;
  } else {
    main.classList.remove('enter');
    window.scrollTo(0, scroll);
  }
  renderActionbar();
  renderTabs();
  renderSheet();
  renderModal();
}

function renderTop() {
  const net = weeklyIncome(state).total - weeklyCosts(state).total;
  $('#top').innerHTML = `<div class="cash"><div class="money ${state.money < 0 ? 'neg' : ''}" id="money">${F.money(ui.shownMoney)}</div>
    <div class="delta"><span class="${net >= 0 ? 'up' : 'down'}">${F.money(net, { sign: true })}</span> pro Woche</div></div>
    <div class="when"><b>${F.yearOf(state.week)}</b><span>KW ${F.kw(state.week)}</span></div>
    <button class="iconbtn" data-act="openSettings" aria-label="Einstellungen">⚙️</button>`;
  tickMoney();
}

let moneyAnim = null;
function tickMoney() {
  cancelAnimationFrame(moneyAnim);
  const from = ui.shownMoney;
  const to = state.money;
  if (from === to) return;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 450);
    const e = 1 - Math.pow(1 - k, 3);
    ui.shownMoney = from + (to - from) * e;
    const el = $('#money');
    if (el) el.textContent = F.money(ui.shownMoney);
    if (k < 1) moneyAnim = requestAnimationFrame(step);
    else ui.shownMoney = to;
  };
  moneyAnim = requestAnimationFrame(step);
}

function renderActionbar() {
  const blocked = !!state.gameOver || state.queue.length > 0;
  const yearProg = (state.week % 52) / 52;
  $('#actionbar').innerHTML = `<button class="next" data-act="next" ${blocked ? 'disabled' : ''}>Nächste Woche ▶<small>${F.date(state.week + 1)}</small><span class="yr" style="width:${(yearProg * 100).toFixed(1)}%"></span></button>
    <button class="skip" data-act="skip" ${blocked ? 'disabled' : ''} aria-label="Vorspulen">⏩</button>`;
}

function renderTabs() {
  const tut = tutorialTab(state);
  const al = alerts(state);
  $('#tabs').innerHTML = TABS.map(([id, icon, label]) => {
    const dot = id === 'home' && al.some((a) => a[0] === 'bad');
    return `<button class="${ui.tab === id ? 'on' : ''} ${tut === id && ui.tab !== id ? 'pulse' : ''}" data-act="tab" data-id="${id}"><span class="i ${dot ? 'dot' : ''}">${icon}</span>${label}</button>`;
  }).join('');
}

function renderSheet() {
  const el = $('#sheet');
  if (!ui.sheet) { el.innerHTML = ''; return; }
  const prev = el.querySelector('.sheet');
  const scroll = prev?.scrollTop || 0;
  const key = ui.sheet.kind + (ui.sheet.id ?? '');
  const anim = !prev || prev.dataset.key !== key ? ' anim' : '';
  const active = document.activeElement;
  const focusKey = active?.dataset?.input;
  el.innerHTML = `<div class="sheet-bg" data-act="bgClose"><div class="sheet${anim}" data-key="${key}" role="dialog"><div class="grab"></div>${SHEETS[ui.sheet.kind]()}</div></div>`;
  const sh = el.querySelector('.sheet');
  if (!anim) sh.scrollTop = scroll;
  if (focusKey) {
    const inp = el.querySelector(`[data-input="${focusKey}"]`);
    if (inp) { inp.focus(); const v = inp.value; inp.setSelectionRange?.(v.length, v.length); }
  }
}

function renderModal() {
  const el = $('#modal');
  const has = state.queue.length || ui.result;
  if (!has) { el.innerHTML = ''; return; }
  const key = ui.result ? 'result' : `${state.queue[0].type}-${state.queue[0].id || ''}-${state.queue.length}`;
  if (el.dataset.key === key && el.innerHTML) return;
  el.dataset.key = key;
  el.innerHTML = `<div class="modal-bg"><div class="modal" role="dialog">${modalView(state, ui)}</div></div>`;
}

function toast(text, bad = false) {
  const el = document.createElement('div');
  el.className = `toast${bad ? ' bad' : ''}`;
  el.textContent = text;
  const box = $('#toasts');
  while (box.children.length >= 3) box.firstChild.remove();
  box.appendChild(el);
  setTimeout(() => el.remove(), 2700);
}

const err = (e) => { if (e) toast(e, true); return !e; };
const persist = () => { if (!save(state)) toast('Speichern fehlgeschlagen (Speicher voll?)', true); };

function afterWeeks(n) {
  const notes = state.report?.notes || [];
  const stops = notes.filter((x) => x.stop).slice(0, 2);
  for (const x of stops) toast(`${x.icon} ${x.text}`);
  if (n > 1 && !stops.length) toast(`⏩ ${n} Wochen vorgespult`);
  if (navigator.vibrate) navigator.vibrate(8);
}

// ---------- Wizard-Helfer ----------
function wizardDefaults(f, cat) {
  const t = TYPE[cat];
  f.cat = cat;
  f.aud = Object.entries(t.audience).sort((a, b) => b[1] - a[1])[0][0];
  f.model = defaultModel(cat);
  f.price = defaultPrice(cat, f.aud, f.model);
  f.platforms = [];
  f.features = [];
  if (!f.name) f.name = suggestName(state, cat);
}

function preselectTeam(f) {
  if (f.teamTouched) return;
  f.team = state.staff.filter((m) => !m.assign && (ROLE[m.role].work || m.founder) && m.role !== 'research').map((m) => m.id);
}

// ---------- Aktionen ----------
const A = {
  tab: (d) => { ui.tab = d.id; ui.sheet = null; },
  next: () => {
    const ok = advanceWeek(state);
    if (ok) afterWeeks(1);
  },
  skip: () => {
    const n = skipWeeks(state);
    if (n) afterWeeks(n);
  },
  close: () => { ui.sheet = null; ui.exportText = ''; ui.importOpen = false; ui.confirmReset = false; },
  bgClose: (d, el, ev) => { if (ev.target === el) A.close(); },
  logAll: () => { ui.logAll = true; },

  // Projekte
  newProject: () => { ui.form = newForm(state); ui.sheet = { kind: 'wizard' }; },
  openProject: (d) => { ui.sheet = { kind: 'project', id: +d.id }; },
  wzCat: (d) => { wizardDefaults(ui.form, d.id); },
  wzAud: (d) => {
    const f = ui.form;
    f.aud = d.id;
    if (!f.priceTouched) f.price = defaultPrice(f.cat, f.aud, f.model);
  },
  wzPlat: (d) => {
    const f = ui.form;
    if (f.platforms.includes(d.id)) f.platforms = f.platforms.filter((x) => x !== d.id);
    else if (maxPlatforms(state) <= 1) f.platforms = [d.id];
    else if (f.platforms.length < maxPlatforms(state)) f.platforms.push(d.id);
  },
  wzFeat: (d) => {
    const f = ui.form;
    f.features = f.features.includes(d.id) ? f.features.filter((x) => x !== d.id) : [...f.features, d.id];
  },
  wzModel: (d) => { ui.form.model = d.id; ui.form.price = defaultPrice(ui.form.cat, ui.form.aud, d.id); ui.form.priceTouched = false; },
  wzPrice: (d) => { ui.form.price = stepPrice(ui.form.price, +d.d); ui.form.priceTouched = true; },
  wzBudget: (d) => { ui.form.budget = +d.id; },
  wzTest: (d) => { ui.form.testWeeks = Math.max(1, Math.min(12, ui.form.testWeeks + +d.d)); },
  wzMember: (d) => {
    const f = ui.form;
    const id = +d.id;
    f.team = f.team.includes(id) ? f.team.filter((x) => x !== id) : [...f.team, id];
    f.teamTouched = true;
  },
  wzNext: () => {
    const f = ui.form;
    if (f.step === 1 && TYPE[f.cat].group !== 'desktop' && TYPE[f.cat].group !== 'mobile') f.platforms = [];
    f.step = Math.min(5, f.step + 1);
    if (f.step === 5) preselectTeam(f);
    document.querySelector('.sheet')?.scrollTo(0, 0);
  },
  wzBack: () => { ui.form.step = Math.max(ui.form.baseProductId ? 2 : 1, ui.form.step - 1); },
  wzStart: () => {
    const f = ui.form;
    const e = createProject(state, f);
    if (!err(e)) return;
    ui.sheet = null;
    ui.tab = 'projects';
    toast(f.baseProductId ? `⬆️ Update für ${f.name} gestartet` : `🚀 ${f.name || 'Projekt'} gestartet`);
  },
  projTest: (d) => { const p = projectById(state, +d.id); if (p) p.testWeeks = Math.max(1, Math.min(12, p.testWeeks + +d.d)); },
  projMember: (d) => {
    const m = staffById(state, +d.id);
    if (!m) return;
    m.assign = m.assign === `p:${d.pid}` ? null : `p:${d.pid}`;
  },
  releaseNow: (d) => { if (err(releaseNow(state, +d.id))) { ui.sheet = null; afterWeeks(1); } },
  cancelProject: (d) => {
    if (ui.confirmCancel !== +d.id) { ui.confirmCancel = +d.id; toast('Nochmal tippen zum Abbrechen – Fortschritt geht verloren'); return; }
    cancelProject(state, +d.id);
    ui.confirmCancel = null;
    ui.sheet = null;
  },
  openCampaign: (d) => { ui.sheet = { kind: 'campaign', id: +d.id, target: d.kind }; },
  startCampaign: (d) => {
    if (err(startCampaign(state, d.cid, d.kind, +d.id))) toast('📣 Kampagne läuft');
  },

  // Produkte
  openProduct: (d) => { ui.sheet = { kind: 'product', id: +d.id }; },
  prodPrice: (d) => { const p = productById(state, +d.id); if (p) p.price = stepPrice(p.price, +d.d); },
  prodPreinstall: (d) => { const p = productById(state, +d.id); if (p) p.preinstall = !p.preinstall; },
  prodSupport: (d) => {
    const m = staffById(state, +d.id);
    if (!m) return;
    m.assign = m.assign === `s:${d.pid}` ? null : `s:${d.pid}`;
  },
  startUpdate: (d) => { ui.form = updateForm(state, +d.id); ui.form.step = 2; ui.sheet = { kind: 'wizard' }; },
  retireProduct: (d) => {
    if (ui.confirmRetire !== +d.id) { ui.confirmRetire = +d.id; toast('Nochmal tippen zum Einstellen'); return; }
    retireProduct(state, +d.id);
    ui.sheet = null;
  },
  storeCut: (d) => { state.eco.storeCut = Math.max(0.05, Math.min(0.5, Math.round((state.eco.storeCut + d.d * 0.05) * 100) / 100)); },

  // Team
  openStaff: (d) => { ui.sheet = { kind: 'staff', id: +d.id }; },
  hire: (d) => { if (err(hire(state, +d.id))) toast('👋 Willkommen im Team!'); },
  searchApplicants: () => err(searchApplicants(state)),
  openBulk: () => { ui.bulk = ui.bulk || { role: 'dev', n: 5 }; ui.sheet = { kind: 'bulk' }; },
  bulkRole: (d) => { ui.bulk.role = d.id; },
  bulkN: (d) => { ui.bulk.n = Math.max(1, Math.min(freeSeats(state), (ui.bulk.n || 5) + +d.d * (ui.bulk.n >= 10 ? 5 : 1))); },
  hireBulk: (d) => { if (err(hireBulk(state, d.role, +d.n))) { toast(`👥 ${d.n} neue Leute`); ui.sheet = null; } },
  fire: (d) => {
    if (ui.confirmFire !== +d.id) { ui.confirmFire = +d.id; toast('Nochmal tippen zum Entlassen (2 Wochengehälter Abfindung)'); return; }
    if (err(fire(state, +d.id))) ui.sheet = null;
  },
  raise: (d) => { if (err(raise(state, +d.id))) toast('💶 Gehalt erhöht – Moral steigt'); },
  assign: (d) => { assign(state, +d.id, d.to || null); },
  teamFilter: (d) => { ui.teamFilter = d.id; ui.teamAll = false; },
  teamAll: () => { ui.teamAll = true; },
  crunch: () => { state.crunch = !state.crunch; toast(state.crunch ? '🔥 Crunch an – Vorsicht mit der Moral' : 'Crunch aus'); },
  moveOffice: (d) => err(moveOffice(state, +d.id)),
  upgradeHw: (d) => err(upgradeHardware(state, +d.id)),

  // Forschung
  branch: (d) => { ui.branch = d.id; },
  research: (d) => { if (err(startResearch(state, d.id))) toast(`🔬 ${NODE[d.id].name} gestartet`); },

  // Markt & Finanzen
  marketSeg: (d) => { ui.marketSeg = d.id; },
  openRival: (d) => { ui.sheet = { kind: 'rival', id: d.id }; },
  buyRival: (d) => { if (err(buyRival(state, d.id))) ui.sheet = null; },
  loan: (d) => { if (err(takeLoan(state, +d.amount, +d.weeks))) toast('🏦 Kredit aufgenommen'); },
  repay: (d) => err(repayLoan(state, +d.id)),
  acceptOffer: () => { if (err(acceptOffer(state))) toast('💼 Deal! Geld ist auf dem Konto'); },
  declineOffer: () => declineOffer(state),
  ipo: () => err(goPublic(state)),

  // Modals
  eventOpt: (d) => {
    const text = resolveEvent(state, 0, +d.i);
    if (text) ui.result = { icon: '😬', title: 'Hat nicht geklappt', text };
  },
  resultOk: () => { ui.result = null; },
  queueOk: () => { state.queue.shift(); },
  pickBoost: (d) => { chooseBoost(d.id); state.queue[0] = { type: 'boostPicked' }; },
  newRun: () => { clearSave(); state = newGame(loadMeta()); ui.shownMoney = state.money; ui.sheet = null; ui.tab = 'home'; ui.result = null; },

  // Einstellungen
  openSettings: () => { ui.sheet = { kind: 'settings' }; ui.taps = 0; },
  export: () => { ui.exportText = exportSave(state); ui.importOpen = false; },
  copyExport: async () => {
    try { await navigator.clipboard.writeText(ui.exportText); toast('📋 Kopiert'); } catch { document.getElementById('exportBox')?.select(); toast('Markiert – jetzt kopieren'); }
  },
  importOpen: () => { ui.importOpen = true; ui.exportText = ''; },
  import: () => {
    try {
      state = importSave(ui.importText || '');
      ui.shownMoney = state.money;
      ui.sheet = null;
      toast('✓ Spielstand geladen');
    } catch (e) { toast(`Import fehlgeschlagen: ${e.message}`, true); }
  },
  confirmReset: () => { ui.confirmReset = true; },
  cancelReset: () => { ui.confirmReset = false; },
  reset: () => { A.newRun(); toast('Neues Spiel gestartet'); },
  tutAck: (d) => { state.tutorial.ack[d.id] = true; },
  tutHide: () => { state.tutorial.hidden = true; },
  tutShow: () => { state.tutorial.hidden = false; },
  versionTap: () => {
    ui.taps++;
    if (state.debug) return;
    if (ui.taps >= 7) { state.debug = true; toast('🐛 Debug-Modus aktiv'); }
    else if (ui.taps >= 4) toast(`Noch ${7 - ui.taps}×`);
  },

  // Debug
  dbgMoney: (d) => { state.money += +d.v; },
  dbgWeeks: (d) => { for (let i = 0; i < +d.v; i++) { state.queue = state.queue.filter((q) => q.type !== 'event' && q.type !== 'era'); if (!advanceWeek(state)) break; } },
  dbgResearch: () => { if (state.research.current) completeResearch(state, state.research.current); },
  dbgAllResearch: () => { for (const n of RESEARCH) if (!state.research.done.includes(n.id)) state.research.done.push(n.id); state.research.current = null; resetFxCache(); },
  dbgProjects: () => { for (const p of state.projects) { p.progress = p.work; p.phase = 'test'; p.testDone = p.testWeeks - 1; } },
  dbgRep: () => { state.rep = Math.min(100, state.rep + 20); },
  dbgMorale: () => { for (const m of state.staff) m.morale = 100; },
  dbgOff: () => { state.debug = false; ui.taps = 0; },
  dbgEvent: (d) => { triggerEvent(state, d.id); ui.sheet = null; },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const fn = A[act];
  if (!fn) return;
  if (act === 'bgClose' && ev.target !== el) return;
  ev.stopPropagation();
  fn(el.dataset, el, ev);
  persist();
  render();
});

document.addEventListener('input', (ev) => {
  const k = ev.target.dataset?.input;
  if (!k) return;
  const v = ev.target.value;
  if (k === 'wzName') ui.form.name = v;
  if (k === 'importText') ui.importText = v;
  if (k === 'companyName') { state.companyName = v.trim() || 'Meine Firma'; persist(); }
});

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.__game = { get state() { return state; } };
