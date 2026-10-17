// Simuliert einen Run mit einer simplen Bot-Strategie (Balancing-Check): node tools/sim.mjs [wochen] [seed]
import { newGame } from '../js/state.js';
import { advanceWeek } from '../js/engine/turn.js';
import { plan, startJob, taskUnlocked, datasetsFor, postDatasets, readyModels, methodAllowed, quantize, runEval, quantOptions, maxParamIdx } from '../js/engine/training.js';
import {
  buyMachine, canBuyMachine, chassisAvailable, gpuAvailable, gpuPrice, fillGpus, machineStats, partOptions, canSwap, swapPart,
  canAddPart, addPart, removePart, duplicate, sellMachines, defaultBuild, canDuplicate, machinePrice, cloudAvailable, setCloud, rentCloud, pool, gpuTf, usage,
} from '../js/engine/hardware.js';
import { hire, canHire, move, canMove, weeklyCosts, salary } from '../js/engine/company.js';
import { startResearch, isAvailable, has } from '../js/engine/research.js';
import { deliver, deployApp, buyDataset, datasetAvailable, weeklyIncome, bestModelFor, tickContracts } from '../js/engine/market.js';
import { setProductModel, setApiPrice, load, apiRefPrice, totalUsers, productRevenue } from '../js/engine/products.js';
import { leaderboard, bestRivalScore } from '../js/engine/rivals.js';
import { autoResolve } from '../js/engine/events.js';
import { canRaise, raise } from '../js/engine/funding.js';
import { RESEARCH_TREE } from '../config/research.js';
import { DATASETS } from '../config/datasets.js';
import { GPUS } from '../config/gpus.js';
import { CHASSIS, CLOUD, CPUS, STORAGE, COOLING, PSU, NIC, RAM } from '../config/parts.js';
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
const reserve = () => 8 * weeklyCosts(s).total + 300;
const spendable = () => s.money - reserve();

// Bestes Preis-Leistungs-Verhältnis unter den GPUs, die in diese Maschine passen
function bestGpu(m) {
  const ff = CHASSIS[m.chassis].ff;
  return Object.keys(GPUS).filter((id) => GPUS[id].ff === ff && gpuAvailable(s, id))
    .sort((a, b) => (gpuTf(GPUS[b], 'fp16') * GPUS[b].vram ** 0.3) / gpuPrice(s, b) - (gpuTf(GPUS[a], 'fp16') * GPUS[a].vram ** 0.3) / gpuPrice(s, a))[0];
}

function bestPart(m, kind, score) {
  return partOptions(s, m, kind).filter((id) => !canSwap(s, m.id, kind, id)).sort((a, b) => score(b) - score(a))[0];
}

function improve(m) {
  const st = machineStats(s, m);
  if (st.gpus < CHASSIS[m.chassis].gpuSlots) {
    const g = bestGpu(m);
    if (g && spendable() > gpuPrice(s, g) * m.count) {
      if (!fillGpus(s, m.id, g)) {
        // Netzteil zu klein?
        const p = bestPart(m, 'psu', (id) => PSU[id].kw);
        if (p && PSU[p].kw > PSU[m.psu].kw && spendable() > 0) { swapPart(s, m.id, 'psu', p); s.stats.upgrades++; fillGpus(s, m.id, g); }
      }
    }
  }
  const x = machineStats(s, m);
  if (x.cpuF < 0.97) { const p = bestPart(m, 'cpu', (id) => CPUS[id].feed); if (p && CPUS[p].feed > CPUS[m.cpu].feed && spendable() > 0) swapPart(s, m.id, 'cpu', p); }
  if (x.coolF < 1) { const p = bestPart(m, 'cooling', (id) => COOLING[id].kw); if (p && COOLING[p].kw > COOLING[m.cooling].kw && spendable() > 0) swapPart(s, m.id, 'cooling', p); }
  if (machineStats(s, m).storF < 0.97) {
    const best = partOptions(s, m, 'storage').filter((id) => !canAddPart(s, m.id, 'storage', id)).sort((a, b) => STORAGE[b].feed - STORAGE[a].feed)[0];
    if (best && spendable() > 0) addPart(s, m.id, 'storage', best);
    else if (m.storage.length && STORAGE[m.storage[0]].feed < 1000) removePart(s, m.id, 'storage', 0);
  }
  if (machineStats(s, m).ramF < 0.97) {
    const best = partOptions(s, m, 'ram').filter((id) => !canAddPart(s, m.id, 'ram', id)).sort((a, b) => RAM[b].gb - RAM[a].gb)[0];
    if (best && spendable() > 0) addPart(s, m.id, 'ram', best);
  }
  const tp = pool(s, 'train');
  if (tp.machines > 1) { const p = bestPart(m, 'nic', (id) => NIC[id].eff); if (p && NIC[p].eff > NIC[m.nic].eff && spendable() > 0) swapPart(s, m.id, 'nic', p); }
}

const perGpuTf = (m) => { const st = machineStats(s, m, bestPrec()); return st.gpus ? st.raw / st.gpus : 0; };

function fullPrice(chassis) {
  const b = defaultBuild(s, chassis);
  if (!b) return Infinity;
  const g = bestGpu(b);
  return machinePrice(s, b) + (g ? gpuPrice(s, g) * CHASSIS[chassis].gpuSlots : 0);
}

function hardware() {
  const loc = LOCATIONS[s.location];
  const best = ['nvl72', 'hgx', 'server4u', 'hedt', 'desktop'].find((c) => chassisAvailable(s, c) && loc.classes.includes(CHASSIS[c].cls)
    && (fullPrice(c) < Math.max(spendable(), 0) * 0.6 || s.machines.some((m) => m.chassis === c)));
  if (!best) return;
  const own = s.machines.filter((m) => m.chassis !== 'laptop');
  let top = own.filter((m) => m.chassis === best && (!bestGpu(m) || m.gpus.every((g) => g.id === bestGpu(m)))).sort((a, b) => b.count - a.count)[0];
  if (!top && spendable() > fullPrice(best)) {
    // Platz schaffen: schwächste Maschinen verkaufen
    const weak = own.filter((m) => m.chassis !== best).sort((a, b) => perGpuTf(a) - perGpuTf(b));
    for (const m of weak) {
      if (canBuyMachine(s, best) !== 'Kein Platz am Standort') break;
      sellMachines(s, m.id, Math.min(m.count, Math.ceil(CHASSIS[best].space / CHASSIS[m.chassis].space)));
    }
    if (!canBuyMachine(s, best)) top = buyMachine(s, best);
  }
  if (!top) { for (const m of own) improve(m); return; }
  improve(top);
  const topTf = perGpuTf(top), topVram = machineStats(s, top).minVram;
  // Alte Maschinen verkaufen, sobald die neue Generation läuft (kleiner VRAM bzw. langsame GPUs bremsen)
  if (machineStats(s, top).gpus === CHASSIS[top.chassis].gpuSlots) {
    for (const m of own) if (m !== top && m.role === 'train' && (machineStats(s, m).minVram < topVram || perGpuTf(m) < topTf * 0.5)) sellMachines(s, m.id, m.count);
    const price = machinePrice(s, top);
    const n = Math.min(Math.floor((spendable() * 0.6) / price), Math.max(1, Math.round(top.count * 0.6)));
    for (let k = n; k > 0; k = Math.floor(k / 2)) if (!canDuplicate(s, top.id, k)) { duplicate(s, top.id, k); break; }
  }
}

// Produkt-Server über Cloud skalieren (eine Gruppe je Produkt, immer das neueste Angebot)
function serving() {
  const offer = Object.keys(CLOUD).filter((id) => cloudAvailable(s, id)).pop();
  for (const kind of ['chat', 'api']) {
    const model = kind === 'chat' ? s.chat.modelId : s.api.modelId;
    for (const c of s.cloud.filter((x) => x.role === kind && x.offer !== offer)) setCloud(s, c.id, 0);
    if (!model || !offer) continue;
    let g = s.cloud.find((x) => x.role === kind);
    if (!g) g = rentCloud(s, offer, 1, kind);
    const l = load(s, kind);
    if (l > 0.85) setCloud(s, g.id, Math.ceil(g.n * Math.min(l, 4) / 0.7));
    else if (l < 0.4) setCloud(s, g.id, Math.max(1, Math.floor(g.n * 0.8)));
  }
}

function bestPrec() {
  return ['fp4', 'fp8', 'fp16'].find((p) => has(s, p)) || 'fp32';
}

function trainSpec() {
  const prec = bestPrec();
  const tech = { precision: prec, sharding: has(s, 'fsdp') ? 'fsdp' : has(s, 'zero') ? 'zero' : 'none', ckpt: has(s, 'grad-ckpt'), offload: false, lr: 'mid', ckptEvery: 4 };
  // Post-Training auf dem besten LLM
  const llm = readyModels(s).filter((m) => m.task === 'llm' && (m.bits || 16) === 16 && m.origin === 'own').sort((a, b) => b.score - a.score)[0];
  if (llm) {
    for (const method of ['sft', 'dpo', 'rlhf', 'reasoning', 'agentic']) {
      if (methodAllowed(s, llm, method) || (method === 'sft' && llm.stages.includes('sft'))) continue;
      const ds = postDatasets(s, method);
      if (!ds.length) continue;
      for (const adapter of ['full', 'lora', 'qlora']) {
        const spec = { kind: 'post', baseId: llm.id, method, adapter, datasets: ds, name: `${llm.name} ${method}`, ...tech };
        const p = plan(s, spec);
        if (!p.err && p.weeks <= 12) return spec;
      }
    }
  }
  let best = null;
  for (const t of Object.keys(TASKS).filter((t) => taskUnlocked(s, t))) {
    const ds = datasetsFor(s, t); if (!ds.length) continue;
    const cur = bestModelFor(s, t)?.score || 0;
    const value = t === 'llm' ? 1e6 : TASKS[t].appBase;
    for (const params of PARAM_STEPS.slice(0, maxParamIdx(s) + 1)) for (const arch of has(s, 'moe') && t === 'llm' ? ['dense', 'moe'] : ['dense']) for (const epochs of [1, 2]) {
      const spec = { kind: 'pretrain', task: t, datasets: ds, params, epochs, arch, name: `${TASKS[t].name} ${F.short(params)}`, ...tech };
      let p = plan(s, spec);
      if (p.err && !p.mem.fits && has(s, 'offload')) { spec.offload = true; p = plan(s, spec); }
      if (p.err || p.weeks > (t === 'llm' ? 20 : 8)) continue;
      const gain = (p.result.score - cur) * value;
      if (gain > 0 && (!best || gain > best.gain)) best = { spec, gain };
    }
  }
  return best?.spec;
}

for (let w = 0; w < WEEKS && !s.gameOver; w++) {
  autoResolve(s);
  for (const c of [...s.contracts]) if (deliver(s, c.id)) firsts.contract ??= s.week;
  for (const t of Object.keys(TASKS)) { const m = bestModelFor(s, t); if (m && t !== 'llm' && m.score > 40) deployApp(s, m.id); }
  if (canRaise(s)) { const r = raise(s); firsts[r.id] ??= `${s.week} (${F.date(s.week)})`; }

  // Produkte
  const llms = readyModels(s).filter((m) => m.task === 'llm');
  for (const m of llms) if (!m.evaluated) runEval(s, m.id);
  const top = llms.sort((a, b) => b.score - a.score)[0];
  if (top) {
    const q = quantOptions(s, top).find((o) => o.bits === 8);
    if (q && (top.bits || 16) === 16 && !s.models.some((m) => m.parent === top.id && m.bits === 8)) quantize(s, top.id, 8);
    const served = s.models.find((m) => m.parent === top.id && m.bits === 8) || top;
    if (served.chat) setProductModel(s, 'chat', served.id);
    setProductModel(s, 'api', served.id);
    setApiPrice(s, API.prices.reduce((b, p) => (Math.abs(p - apiRefPrice(s)) < Math.abs(b - apiRefPrice(s)) ? p : b)));
  }
  serving();

  if (!s.research.current) {
    const av = Object.keys(RESEARCH_TREE).filter((id) => isAvailable(s, id)).sort((a, b) => RESEARCH_TREE[a].cost - RESEARCH_TREE[b].cost);
    if (av[0]) startResearch(s, av[0]);
  }
  for (const id of Object.keys(DATASETS).filter((d) => datasetAvailable(s, d)).sort((a, b) => DATASETS[a].cost - DATASETS[b].cost)) {
    if (spendable() > DATASETS[id].cost * 2) buyDataset(s, id);
  }
  hardware();
  const nxt = LOCATION_ORDER[LOCATION_ORDER.indexOf(s.location) + 1];
  const u = usage(s), loc = LOCATIONS[s.location];
  const wantsServer = !loc.classes.includes('server') && chassisAvailable(s, 'server4u');
  if (nxt && !canMove(s, nxt) && (u.space > loc.space * 0.7 || u.power > loc.power * 0.7 || u.staff >= loc.staff || wantsServer)
    && s.money > 12 * LOCATIONS[nxt].rent + reserve() && net() > LOCATIONS[nxt].rent * 0.3) move(s, nxt);
  for (const role of ['researcher', 'ml', 'sales', 'infra', 'data']) {
    const ratio = { researcher: 1, ml: 0.4, infra: 0.3, data: 0.2, sales: 0.3 }[role];
    const afford = net() > 2 * salary(s, role) || (role === 'researcher' && s.staff.researcher < 3 && spendable() > 60 * salary(s, role));
    if (s.staff[role] <= s.staff.researcher * ratio && afford && !canHire(s, role)) hire(s, role);
  }

  if (!s.job) { const spec = trainSpec(); if (spec) startJob(s, spec); }
  advanceWeek(s);
  const best = Math.max(0, ...readyModels(s).filter((m) => m.task === 'llm' && m.origin === 'own').map((m) => m.score));
  if (best) firsts.llm ??= `${s.week} (${F.date(s.week)})`;
  if (best >= 19) firsts.gpt3 ??= `${s.week} (${F.date(s.week)})`;
  if (best >= 68) firsts.gpt4 ??= `${s.week} (${F.date(s.week)})`;
  if (best >= 90) firsts.score90 ??= `${s.week} (${F.date(s.week)})`;
  if (best && best >= bestRivalScore(s)) firsts.rank1 ??= `${s.week} (${F.date(s.week)})`;
  if (s.machines.some((m) => m.gpus.length)) firsts.gpu ??= s.week;
  if (s.week % Number(process.env.EVERY || 26) === 0 || s.gameOver) {
    const lb = leaderboard(s); const myRank = lb.findIndex((r) => r.mine) + 1;
    const gpus = s.machines.reduce((a, m) => a + m.gpus.length * m.count, 0);
    const tp = pool(s, 'train');
    console.log(`${F.date(s.week)} geld ${F.money(s.money).padStart(13)} netto ${F.money(net()).padStart(12)} ` +
      `prod ${F.money(productRevenue(s).total).padStart(11)} user ${F.count(Math.round(totalUsers(s))).padStart(9)} ` +
      `GPUs ${String(gpus).padStart(6)} ${F.tflops(tp.tf).padStart(14)} ${s.location.padEnd(10)} R${s.staff.researcher} res ${s.research.done.length} ` +
      `LLM ${best.toFixed(0)} vs ${bestRivalScore(s).toFixed(0)} rang ${myRank || '-'} fund ${s.funding.round} ziel ${s.goal} del ${s.stats.delivered} inc ${F.money(weeklyIncome(s))}`);
  }
}
console.log('Meilensteine:', firsts, s.gameOver ? 'GAME OVER' : '');
// DUMP=datei.json speichert den Endstand (z.B. zum Import im Spiel)
if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP, JSON.stringify(s));
