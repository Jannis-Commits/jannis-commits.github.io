// Simuliert einen Run mit einer simplen Bot-Strategie (Balancing-Check): node tools/sim.mjs [wochen] [seed]
import { newGame } from '../js/state.js';
import { advanceWeek } from '../js/engine/turn.js';
import { analyze, startTraining, taskUnlocked, datasetsFor } from '../js/engine/training.js';
import { buyHardware, canBuyHardware, hire, canHire, move, canMove, weeklyCosts, setCloud } from '../js/engine/company.js';
import { startResearch, isAvailable } from '../js/engine/research.js';
import { deliver, deployApp, buyDataset, datasetAvailable, weeklyIncome, bestModelFor, tickContracts } from '../js/engine/market.js';
import { leaderboard } from '../js/engine/rivals.js';
import { RESEARCH_TREE } from '../config/research.js';
import { DATASETS } from '../config/datasets.js';
import { TASKS } from '../config/tasks.js';
import { PARAM_STEPS } from '../config/formulas.js';
import { LOCATION_ORDER, LOCATIONS } from '../config/locations.js';
import * as F from '../js/util/format.js';

const WEEKS = Number(process.argv[2] || 260);
const s = newGame(Number(process.argv[3] || 42));
tickContracts(s);
const firsts = {};

for (let w = 0; w < WEEKS && !s.gameOver; w++) {
  for (const c of [...s.contracts]) if (deliver(s, c.id)) firsts.contract ??= s.week;
  for (const t of Object.keys(TASKS)) { const m = bestModelFor(s, t); if (m && m.score > 40) deployApp(s, m.id); }
  if (!s.research.current) {
    const av = Object.keys(RESEARCH_TREE).filter((id) => isAvailable(s, id)).sort((a, b) => RESEARCH_TREE[a].cost - RESEARCH_TREE[b].cost);
    if (av[0]) startResearch(s, av[0]);
  }
  const net = () => weeklyIncome(s) - weeklyCosts(s).total;
  for (const id of Object.keys(DATASETS).filter((d) => datasetAvailable(s, d)).sort((a, b) => DATASETS[a].cost - DATASETS[b].cost)) {
    if (s.money > DATASETS[id].cost * 1.5 + 1000) buyDataset(s, id);
  }
  for (const id of ['dc-h', 'dc-a', 'dc-v', 'workstation', 'gaming-pc']) {
    while (!canBuyHardware(s, id) && s.money > 3 * (id === 'gaming-pc' ? 2500 : 20000)) buyHardware(s, id);
  }
  const nxt = LOCATION_ORDER[LOCATION_ORDER.indexOf(s.location) + 1];
  if (nxt && !canMove(s, nxt) && s.money > 40 * (LOCATIONS[nxt].rent + 1500)) move(s, nxt);
  if (s.money + 20 * net() > 40000 && !canHire(s, 'researcher')) hire(s, 'researcher');
  if (s.money + 20 * net() > 40000 && !canHire(s, 'engineer') && s.staff.engineer < s.staff.researcher / 2) hire(s, 'engineer');
  if (!s.training) {
    let best = null;
    for (const t of Object.keys(TASKS).filter((t) => taskUnlocked(s, t))) {
      const ds = datasetsFor(s, t); if (!ds.length) continue;
      const cur = bestModelFor(s, t)?.score || 0;
      for (const p of PARAM_STEPS) for (const ep of [1, 2, 3]) {
        const spec = { task: t, datasets: ds, params: p, epochs: ep, arch: 'dense' };
        const a = analyze(s, spec);
        if (a.weeks > 10 || a.fail > 0.2) continue;
        const gain = (a.score - cur) * TASKS[t].appBase;
        if (gain > 0 && (!best || gain > best.gain)) best = { spec, gain };
      }
    }
    if (best) startTraining(s, best.spec);
  }
  advanceWeek(s);
  if (s.models.some((m) => m.task === 'llm' && m.status === 'ready')) firsts.llm ??= s.week;
  if (s.week % 20 === 0 || s.gameOver) {
    const lb = leaderboard(s); const myRank = lb.findIndex((r) => r.mine) + 1;
    console.log(`W${String(s.week).padStart(3)} ${F.date(s.week)} geld ${F.money(s.money).padStart(12)} netto ${F.money(net()).padStart(10)} ` +
      `ruf ${Math.round(s.rep)} R${s.staff.researcher}/E${s.staff.engineer} ${s.location} res ${s.research.done.length} ` +
      `best ${Object.keys(TASKS).map((t) => Math.round(bestModelFor(s, t)?.score || 0)).join('/')} rang ${myRank || '-'}`);
  }
}
console.log('Meilensteine:', firsts, s.gameOver ? 'GAME OVER' : '');
