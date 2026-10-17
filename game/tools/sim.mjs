// Simuliert einen Run mit einer simplen Bot-Strategie (Balancing-Check): node tools/sim.mjs [wochen] [seed]
import { newGame } from '../js/state.js';
import { advanceWeek } from '../js/engine/turn.js';
import { analyze, startTraining, taskUnlocked, datasetsFor, validate } from '../js/engine/training.js';
import { buyHardware, canBuyHardware, hire, canHire, move, canMove, weeklyCosts, hardwareAvailable } from '../js/engine/company.js';
import { startResearch, isAvailable, effects } from '../js/engine/research.js';
import { deliver, deployApp, buyDataset, datasetAvailable, weeklyIncome, bestModelFor, tickContracts } from '../js/engine/market.js';
import { setChatModel, setApiModel, setApiPrice, setInferenceShare, load, apiRefPrice, totalUsers, productRevenue } from '../js/engine/products.js';
import { leaderboard, bestRivalScore } from '../js/engine/rivals.js';
import { RESEARCH_TREE } from '../config/research.js';
import { DATASETS } from '../config/datasets.js';
import { HARDWARE } from '../config/hardware.js';
import { TASKS } from '../config/tasks.js';
import { API } from '../config/products.js';
import { PARAM_STEPS } from '../config/formulas.js';
import { LOCATION_ORDER, LOCATIONS } from '../config/locations.js';
import * as F from '../js/util/format.js';

const WEEKS = Number(process.argv[2] || 520);
const s = newGame(Number(process.argv[3] || 42));
tickContracts(s);
const firsts = {};
const net = () => weeklyIncome(s) - weeklyCosts(s).total;
const GPUS = Object.keys(HARDWARE).filter((id) => HARDWARE[id].cost).reverse();

for (let w = 0; w < WEEKS && !s.gameOver; w++) {
  for (const c of [...s.contracts]) if (deliver(s, c.id)) firsts.contract ??= s.week;
  for (const t of Object.keys(TASKS)) { const m = bestModelFor(s, t); if (m && m.score > 40) deployApp(s, m.id); }

  // Produkte: bestes LLM in Chat + API, Inferenz-Anteil nach Last regeln
  const llm = bestModelFor(s, 'llm');
  if (llm) {
    if (effects(s).features.has('chat')) setChatModel(s, llm.id);
    setApiModel(s, llm.id);
    setApiPrice(s, API.prices.reduce((b, p) => (Math.abs(p - apiRefPrice(s)) < Math.abs(b - apiRefPrice(s)) ? p : b)));
    const l = load(s);
    if (l > 0.9) setInferenceShare(s, s.inferenceShare + 0.1);
    else if (l < 0.4 && s.inferenceShare > 0.15) setInferenceShare(s, s.inferenceShare - 0.1);
  }

  if (!s.research.current) {
    const av = Object.keys(RESEARCH_TREE).filter((id) => isAvailable(s, id)).sort((a, b) => RESEARCH_TREE[a].cost - RESEARCH_TREE[b].cost);
    if (av[0]) startResearch(s, av[0]);
  }
  for (const id of Object.keys(DATASETS).filter((d) => datasetAvailable(s, d)).sort((a, b) => DATASETS[a].cost - DATASETS[b].cost)) {
    if (s.money > DATASETS[id].cost * 2 + 1000) buyDataset(s, id);
  }
  // Beste verfügbare GPU mit bis zu 40 % des Geldes kaufen
  const reserve = 20 * weeklyCosts(s).total;
  const gpu = GPUS.find((id) => hardwareAvailable(s, id));
  if (gpu && s.money - reserve > 3 * HARDWARE[gpu].cost) buyHardware(s, gpu, Math.floor(((s.money - reserve) * 0.5) / HARDWARE[gpu].cost));
  const nxt = LOCATION_ORDER[LOCATION_ORDER.indexOf(s.location) + 1];
  if (nxt && !canMove(s, nxt) && s.money + 20 * net() > 40 * LOCATIONS[nxt].rent + reserve) move(s, nxt);
  if (s.money + 30 * net() > reserve + 50000 && !canHire(s, 'researcher')) hire(s, 'researcher');
  if (s.money + 30 * net() > reserve + 50000 && !canHire(s, 'engineer') && s.staff.engineer < s.staff.researcher / 2) hire(s, 'engineer');

  if (!s.training) {
    let best = null;
    for (const t of Object.keys(TASKS).filter((t) => taskUnlocked(s, t))) {
      const ds = datasetsFor(s, t); if (!ds.length) continue;
      const cur = bestModelFor(s, t)?.score || 0;
      const value = t === 'llm' ? 1e6 : TASKS[t].appBase;
      for (const p of PARAM_STEPS) for (const arch of ['dense', 'moe']) for (const ep of [1, 2]) {
        const spec = { task: t, datasets: ds, params: p, epochs: ep, arch };
        if (validate(s, spec)) continue;
        const a = analyze(s, spec);
        if (a.weeks > (t === 'llm' ? 20 : 8) || a.fail > 0.25) continue;
        const gain = (a.score - cur) * value;
        if (gain > 0 && (!best || gain > best.gain)) best = { spec, gain };
      }
    }
    if (best) startTraining(s, best.spec);
  }
  advanceWeek(s);
  const top = bestModelFor(s, 'llm')?.score || 0;
  if (top) firsts.llm ??= s.week;
  if (top >= 19) firsts.gpt3 ??= `${s.week} (${F.date(s.week)})`;
  if (top >= 68) firsts.gpt4 ??= `${s.week} (${F.date(s.week)})`;
  if (top >= 90) firsts.score90 ??= `${s.week} (${F.date(s.week)})`;
  if (top && top >= bestRivalScore(s)) firsts.rank1 ??= `${s.week} (${F.date(s.week)})`;
  if (s.week % 26 === 0 || s.gameOver) {
    const lb = leaderboard(s); const myRank = lb.findIndex((r) => r.mine) + 1;
    console.log(`W${String(s.week).padStart(3)} ${F.date(s.week)} geld ${F.money(s.money).padStart(13)} netto ${F.money(net()).padStart(12)} ` +
      `prod ${F.money(productRevenue(s).total).padStart(11)} user ${F.count(Math.round(totalUsers(s))).padStart(11)} last ${load(s).toFixed(2)} ` +
      `R${s.staff.researcher}/E${s.staff.engineer} ${s.location.padEnd(10)} res ${s.research.done.length} LLM ${top.toFixed(0)} vs ${bestRivalScore(s).toFixed(0)} rang ${myRank || '-'}`);
  }
}
console.log('Meilensteine:', firsts, s.gameOver ? 'GAME OVER' : '');
// DUMP=datei.json speichert den Endstand (z.B. zum Import im Spiel)
if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP, JSON.stringify(s));
