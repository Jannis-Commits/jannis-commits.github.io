// Balancing-Check: ein "Faulpelz-Bot" folgt nur den Berater-Vorschlägen (wie ein Spieler, der nur auf die Berater-Karte tippt).
// node tools/sim.mjs [wochen] [seed] [easy|normal|hard]
import { newGame } from '../js/state.js';
import { advanceWeek } from '../js/engine/turn.js';
import { startJob, readyModels } from '../js/engine/training.js';
import { buyPreset, setRole, autoBalance, pool } from '../js/engine/hardware.js';
import { hire, move, weeklyCosts } from '../js/engine/company.js';
import { startResearch } from '../js/engine/research.js';
import { deliver, deployApp, buyDataset, weeklyIncome, tickContracts, incomeBreakdown } from '../js/engine/market.js';
import { setProductModel, totalUsers } from '../js/engine/products.js';
import { leaderboard, bestRivalScore } from '../js/engine/rivals.js';
import { autoResolve } from '../js/engine/events.js';
import { raise } from '../js/engine/funding.js';
import { nextStep, recommendTraining } from '../js/engine/advisor.js';
import * as F from '../js/util/format.js';

const WEEKS = Number(process.argv[2] || 520);
const s = newGame(Number(process.argv[3] || 42), process.argv[4] || 'normal');
tickContracts(s);
const firsts = {};
const net = () => weeklyIncome(s) - weeklyCosts(s).total;

// Dieselben Aktionen wie die Berater-Karte im Spiel (js/main.js)
const ACT = {
  buyPreset: (d) => buyPreset(s, d.c, d.g, d.n || 1),
  buyDs: (d) => buyDataset(s, d.id),
  deliver: (d) => deliver(s, d.id),
  deployApp: (d) => deployApp(s, d.id),
  useBoth: (d) => { setProductModel(s, 'chat', d.id); setProductModel(s, 'api', d.id); },
  useModel: (d) => setProductModel(s, d.kind, d.id),
  raise: () => raise(s),
  startRecommended: () => { const r = recommendTraining(s); if (r) startJob(s, r.spec); },
  research: (d) => startResearch(s, d.id),
  autoBalance: (d) => autoBalance(s, d.id),
  setRole: (d) => setRole(s, d.m, d.id),
  staff: (d) => { hire(s, d.role, 1); s.stats.hiredWeek = s.week; },
  move: (d) => move(s, d.id),
};

for (let w = 0; w < WEEKS && !s.gameOver; w++) {
  autoResolve(s);
  // Bis zu 8 Berater-Tipps pro Woche befolgen
  for (let i = 0; i < 8; i++) {
    const st = nextStep(s);
    if (!ACT[st.act]) break;
    const before = JSON.stringify([s.money, s.nextId, s.job?.modelId, s.machines.length, s.staff, s.location, s.research.current]);
    ACT[st.act](st.data);
    if (JSON.stringify([s.money, s.nextId, s.job?.modelId, s.machines.length, s.staff, s.location, s.research.current]) === before) break;
  }
  advanceWeek(s);
  autoResolve(s);

  const best = Math.max(0, ...readyModels(s).filter((m) => m.task === 'llm' && m.origin !== 'open').map((m) => m.score));
  const lb = leaderboard(s); const rank = lb.findIndex((r) => r.mine) + 1;
  if (s.machines.some((m) => m.gpus.length)) firsts.gpu ??= s.week;
  if (net() > 0) firsts.profit ??= `${s.week} (${F.date(s.week)})`;
  if (best) firsts.llm ??= `${s.week} (${F.date(s.week)})`;
  if (best >= 19) firsts.gpt3 ??= `${s.week} (${F.date(s.week)})`;
  if (best >= 68) firsts.gpt4 ??= `${s.week} (${F.date(s.week)})`;
  if (rank && rank <= 5) firsts.top5 ??= `${s.week} (${F.date(s.week)})`;
  if (rank === 1) firsts.rank1 ??= `${s.week} (${F.date(s.week)})`;
  if (s.week % Number(process.env.EVERY || 26) === 0 || s.gameOver) {
    const inc = incomeBreakdown(s);
    const gpus = s.machines.reduce((a, m) => a + m.gpus.length * m.count, 0);
    console.log(`${F.date(s.week)} geld ${F.money(s.money).padStart(13)} netto ${F.money(net()).padStart(12)} ` +
      `[apps ${F.money(inc.apps)} abo ${F.money(inc.subs)} chat ${F.money(inc.chat)} api ${F.money(inc.api)} fach ${F.money(inc.domains)}] ` +
      `user ${F.count(Math.round(totalUsers(s)))} GPUs ${gpus} ${F.tflops(pool(s, 'train').tf)} ${s.location} team ${Object.values(s.staff).reduce((a, b) => a + b, 0)} ` +
      `LLM ${best.toFixed(0)} vs ${bestRivalScore(s).toFixed(0)} rang ${rank || '-'} fund ${s.funding.round}`);
  }
}
console.log('Meilensteine:', firsts, s.gameOver ? 'GAME OVER' : '');
// DUMP=datei.json speichert den Endstand (z.B. zum Import im Spiel)
if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP, JSON.stringify(s));
