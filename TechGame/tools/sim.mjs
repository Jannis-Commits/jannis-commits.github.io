// Headless-Simulation: ein einfacher Bot spielt das Spiel, um Balancing zu prüfen.
// node tools/sim.mjs [Jahre=45] [Seeds=3] [--verbose]
import { newGame } from '../js/state.js';
import { advanceWeek } from '../js/engine/turn.js';
import { PRODUCT_TYPES, TYPE, expectedFeatures } from '../config/productTypes.js';
import { featuresOf } from '../config/features.js';
import { RESEARCH } from '../config/research.js';
import { OFFICES } from '../config/offices.js';
import { catUnlocked, hasTech, freeSeats, yf, playerProducts } from '../js/engine/core.js';
import { createProject, defaultPrice, maxPlatforms, teamOf, retireProduct } from '../js/engine/projects.js';
import { platformsFor, freshness, marketSize } from '../js/engine/market.js';
import { startResearch, nodeState } from '../js/engine/research.js';
import { hire, hireBulk, bulkCost } from '../js/engine/staff.js';
import { moveOffice, moveCost, upgradeHardware, hwAvailable, hwCost } from '../js/engine/office.js';
import { resolveEvent } from '../js/engine/events.js';
import { weeklyCosts, acceptOffer, ipoReady, goPublic } from '../js/engine/finance.js';
import { ranking } from '../js/engine/rivals.js';
import { victoryStatus } from '../js/engine/victory.js';
import { money, count } from '../js/util/format.js';

const years = +process.argv[2] || 45;
const seeds = +process.argv[3] || 3;
const verbose = process.argv.includes('--verbose');
const smart = process.argv.includes('--smart');
const PRIO = ['lang_c', 'ui_gui', 'lang_graphics', 'lang_kernel', 'ui_mouse', 'lang_oop', 'net_modem', 'net_lan', 'net_tcp', 'net_www', 'net_webapps', 'mob_pda', 'mob_os', 'mob_touch', 'mob_apps', 'mob_store', 'cloud_virt', 'cloud_dc', 'cloud_iaas', 'ai_expert', 'ai_ml', 'ai_deep', 'ai_llm'];

function catValue(s, cat) {
  const t = TYPE[cat];
  const share = playerProducts(s).filter((p) => p.cat === cat).length;
  return (marketSize(s, cat) * Math.max(...Object.values(t.refPrice), 5)) / (t.work * (1 + share * 3));
}

function plan(s, base) {
  const cats = base ? [base.cat] : PRODUCT_TYPES.map((t) => t.id).filter((c) => catUnlocked(s, c));
  if (!cats.length) return null;
  cats.sort((a, b) => catValue(s, b) - catValue(s, a));
  const cat = s.week < 30 ? 'tool' : cats[0];
  const t = TYPE[cat];
  const aud = base?.aud || Object.entries(t.audience).sort((a, b) => b[1] - a[1])[0][0];
  const ai = { p: 0, b: 1, d: 2 }[aud];
  const plats = platformsFor(s, cat).sort((a, b) => (s.reach[b.id] || 0) - (s.reach[a.id] || 0)).slice(0, maxPlatforms(s)).map((p) => p.id);
  const feats = featuresOf(cat).filter((f) => hasTech(s, f.tech)).sort((a, b) => b.fit[ai] - a.fit[ai])
    .slice(0, Math.max(1, Math.round(expectedFeatures(yf(s))))).map((f) => f.id);
  const model = base?.model || t.models[0];
  return { cat, aud, platforms: plats, features: feats, model, price: defaultPrice(cat, aud, model), budget: s.money > 50000 ? (smart ? 2 : 1) : 0, testWeeks: smart ? 3 : 2, team: [], baseProductId: base?.id };
}

function osProject(s, cat) {
  if (!catUnlocked(s, cat) || s.projects.some((p) => p.cat === cat) || s.staff.length < 8) return;
  const own = playerProducts(s).find((p) => p.cat === cat);
  if (own && freshness(s, own) > 0.6) return;
  const f = plan(s, own);
  if (!f) return;
  if (!own) { const t = TYPE[cat]; f.cat = cat; f.aud = 'p'; f.model = t.models[0]; f.price = defaultPrice(cat, 'p', f.model); }
  const ai = 0;
  f.features = featuresOf(cat).filter((x) => hasTech(s, x.tech)).map((x) => x.id);
  f.budget = s.money > 1e6 ? 3 : 2; f.testWeeks = 4;
  f.team = s.staff.filter((m) => !m.founder && ['dev', 'design', 'qa'].includes(m.role)).slice(0, Math.ceil(s.staff.length * 0.6)).map((m) => m.id);
  createProject(s, f);
}

function smartMoves(s) {
  osProject(s, 'os_desktop');
  osProject(s, 'os_mobile');
  if (catUnlocked(s, 'app_store') && !s.projects.some((p) => p.cat === 'app_store')) { const f = plan(s); if (f) { f.cat = 'app_store'; f.model = 'store'; f.features = featuresOf('app_store').filter((x) => hasTech(s, x.tech)).map((x) => x.id); f.platforms = []; createProject(s, f); } }
  for (const p of playerProducts(s)) {
    if (p.bugs > 3 && !s.staff.some((m) => m.assign === `s:${p.id}`)) {
      const q = s.staff.find((m) => m.role === 'qa' && (!m.assign || m.assign.startsWith('s:'))) || s.staff.find((m) => m.role === 'qa');
      if (q) q.assign = `s:${p.id}`;
    }
    if (freshness(s, p) < 0.35 && p.revenue < 1000 * (1 + s.week / 52) && TYPE[p.cat].group !== 'os') retireProduct(s, p.id);
    const osShare = Math.max(...['os_desktop', 'os_mobile'].map((c) => (s.shares[c]?.byOwner?.player || 0) / (s.shares[c]?.size || 1)));
    p.preinstall = osShare > 0.15 && s.antitrust < 45 && TYPE[p.cat].group !== 'os' && TYPE[p.cat].group !== 'store';
  }
  if (s.staff.length > 12 && s.staff.filter((m) => m.role === 'qa').length < s.staff.length / 6 && freeSeats(s) > 0) hireBulk(s, 'qa', 1);
}

function bot(s) {
  while (s.queue.length) {
    const q = s.queue[0];
    if (q.type === 'event') resolveEvent(s, 0, 0);
    else s.queue.shift();
  }
  const costs = weeklyCosts(s).total;
  // Forschung
  if (!s.research.current) {
    const av = RESEARCH.filter((n) => nodeState(s, n) === 'available' && n.cost < s.money * 0.3)
      .sort((a, b) => (smart ? (PRIO.includes(a.id) ? -1000 : 0) - (PRIO.includes(b.id) ? -1000 : 0) : 0) + a.pts - b.pts)[0];
    if (av) startResearch(s, av.id);
  }
  const researchers = s.staff.filter((m) => m.assign === 'research').length;
  const wantResearch = Math.floor(s.staff.length / (smart ? 4 : 5));
  if (researchers < wantResearch) {
    const m = s.staff.find((x) => !x.founder && (x.role === 'research' || x.role === 'dev') && !x.assign);
    if (m) m.assign = 'research';
  }
  // Updates veralteter Produkte
  for (const p of playerProducts(s)) {
    if (TYPE[p.cat].group === 'store') continue;
    if (freshness(s, p) < 0.55 && !s.projects.some((x) => x.baseProductId === p.id) && s.projects.length < 1 + s.staff.length / 6) {
      const f = plan(s, p);
      if (f) createProject(s, f);
    }
  }
  if (smart) smartMoves(s);
  // neues Projekt
  if (s.projects.length < Math.max(1, Math.floor(s.staff.length / 6))) {
    const f = plan(s);
    if (f) createProject(s, f);
  }
  // freie Leute verteilen
  for (const m of s.staff) {
    if (m.assign || m.role === 'marketing' || m.role === 'sales') continue;
    const buggy = playerProducts(s).filter((p) => p.bugs > 8).sort((a, b) => b.bugs - a.bugs)[0];
    if (buggy && (m.role === 'qa') && s.staff.length > 2) { m.assign = `s:${buggy.id}`; continue; }
    const pr = [...s.projects].sort((a, b) => teamOf(s, a).length - teamOf(s, b).length)[0];
    if (pr) m.assign = `p:${pr.id}`;
  }
  // Einstellen
  if (s.money > costs * 20 + 3000 && freeSeats(s) > 0) {
    if (s.staff.length > 25) {
      const role = ['dev', 'dev', 'qa', 'design', 'marketing', 'sales', 'research'][s.week % 7];
      const n = Math.min(freeSeats(s), 5);
      if (bulkCost(s, role, n).total < s.money * 0.2) hireBulk(s, role, n);
    } else {
      const a = [...s.applicants].sort((x, y) => y.skill - x.skill)[0];
      if (a) hire(s, a.id);
    }
  }
  // Umziehen
  if (freeSeats(s) <= 0 && OFFICES[s.office + 1] && s.money > moveCost(s, s.office + 1) * 2 + costs * 10) moveOffice(s, s.office + 1);
  if (hwAvailable(s, s.hardware + 1) && s.money > hwCost(s, s.hardware + 1) * 4) upgradeHardware(s, s.hardware + 1);
  if (s.finance.offer && s.finance.ownedShare > 0.6) acceptOffer(s);
  if (ipoReady(s)) goPublic(s);
}

for (let seed = 1; seed <= seeds; seed++) {
  const s = newGame({ prestige: 0, boosts: [] }, seed * 7919);
  const firstRelease = { w: null };
  let line = '';
  for (let w = 0; w < years * 52; w++) {
    bot(s);
    advanceWeek(s);
    if (firstRelease.w === null && playerProducts(s).length) firstRelease.w = s.week;
    for (const p of [s.money, s.finance.value]) if (!isFinite(p)) { console.log('NaN!', s.week); process.exit(1); }
    if (s.gameOver) break;
    if (process.argv.includes('--weekly') && s.week < 160 && s.week % 4 === 0) {
      const by = {};
      for (const p of playerProducts(s)) { const b = (by[p.cat] ||= [0, 0, 0]); b[0]++; b[1] += p.users; b[2] += p.revenue; }
      console.log(s.week, 'Geld', Math.round(s.money), 'Ein', Math.round(s.report.income), 'Aus', Math.round(s.report.expense), 'Team', s.staff.length, 'Ruf', Math.round(s.rep), 'Wert', Math.round(s.finance.value), JSON.stringify(Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.map(Math.round)]))));
    }
    if (s.week % 260 === 0 || (verbose && s.week % 52 === 0)) {
      const rk = ranking(s);
      const v = victoryStatus(s);
      line = `${Math.floor(yf(s))}: Geld ${money(s.money)}, Wert ${money(s.finance.value)}, Rang ${v.rank}/${rk.length}, Team ${s.staff.length}, Produkte ${playerProducts(s).length}, Nutzer ${count(playerProducts(s).reduce((a, p) => a + p.users, 0))}, Ruf ${Math.round(s.rep)}, Forschung ${s.research.done.length}, OS ${Math.round(v.osShare * 100)}% | Top: ${rk.slice(0, 3).map((r) => `${r.name} ${money(r.value)}`).join(', ')}`;
      console.log(`  [${seed}] ${line}`);
    }
  }
  if (process.argv.includes('--save')) (await import('node:fs')).writeFileSync(process.argv[process.argv.indexOf('--save') + 1], JSON.stringify(s));
  const earn = s.finance.history.slice(0, 40).map((h) => Math.round(h.inc));
  console.log(`Seed ${seed}: ${s.gameOver ? 'GAME OVER (' + s.gameOver + ') in ' + Math.floor(yf(s)) : s.won ? 'SIEG' : 'läuft'}; erstes Release Woche ${firstRelease.w}; Einnahmen W1-40: ${earn.join(',')}`);
}
