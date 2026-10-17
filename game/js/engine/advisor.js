import { TASKS } from '../../config/tasks.js';
import { PARAM_STEPS } from '../../config/formulas.js';
import { RESEARCH_TREE } from '../../config/research.js';
import { DATASETS } from '../../config/datasets.js';
import { CLOUD } from '../../config/parts.js';
import { METHODS } from '../../config/pipeline.js';
import { money } from '../util/format.js';
import { has, isAvailable, isDone } from './research.js';
import {
  pool, presetBuilds, canBuyPreset, allMachines, machineStats, autoBalancePreview, cloudAvailable, cloudPrice, cloudWeekly, rentCloud, setCloud,
} from './hardware.js';
import { plan, taskUnlocked, datasetsFor, postDatasets, readyModels, methodAllowed, maxParamIdx, findModel } from './training.js';
import { candidate, meets, datasetAvailable, bestModelFor } from './market.js';
import { productModel, load, chatModel } from './products.js';
import { serveRate } from './memory.js';
import { canRaise, nextRound } from './funding.js';
import { weeklyCosts, salary, canHire, canMove, location } from './company.js';
import { weeklyIncome } from './market.js';
import { LOCATIONS, LOCATION_ORDER } from '../../config/locations.js';
import { STAFF } from '../../config/staff.js';

// ---------- Forschung ----------

// Grobe Wunsch-Reihenfolge; danach das Billigste
const RESEARCH_ORDER = [
  'neural-nets', 'gpu-training', 'recsys', 'dialog', 'rnn', 'embeddings', 'attention', 'transformer', 'quantization', 'grad-ckpt',
  'datacenter-hw', 'mixed-precision', 'distill', 'cnn', 'instruction-tuning', 'megatron', 'distributed', 'zero', 'scaling-laws',
  'lora', 'rlhf', 'fsdp', 'flash-attention', 'dpo', 'moe', 'cot', 'gptq', 'gqa', 'fp8-training', 'qlora', 'paged-attention',
];

export function recommendResearch(state) {
  const r = state.research;
  const free = (id) => isAvailable(state, id) && r.current !== id && !r.queue.includes(id);
  return RESEARCH_ORDER.find(free)
    || Object.keys(RESEARCH_TREE).filter(free).sort((a, b) => RESEARCH_TREE[a].cost - RESEARCH_TREE[b].cost)[0];
}

// ---------- Training ----------

function techFor(state) {
  const gpus = pool(state, 'train').stats.flatMap((x) => x.s.gpuList);
  const native = (p) => gpus.length && gpus.every((g) => g.tf[p]);
  const precision = has(state, 'fp4') && native('fp4') ? 'fp4' : has(state, 'fp8') && native('fp8') ? 'fp8' : has(state, 'fp16') ? 'fp16' : 'fp32';
  return {
    precision, sharding: has(state, 'fsdp') ? 'fsdp' : has(state, 'zero') ? 'zero' : 'none',
    ckpt: has(state, 'grad-ckpt'), offload: false, lr: 'mid', ckptEvery: 4,
  };
}

// Plant mit Fallbacks (Offload, ohne Checkpoints), gibt den ersten fehlerfreien Plan zurück
function tryPlan(state, spec) {
  let p = plan(state, spec);
  if (p.err && !p.mem.fits && has(state, 'offload')) { spec = { ...spec, offload: true }; p = plan(state, spec); }
  if (p.err && p.storageNeed > p.storageCap) { spec = { ...spec, ckptEvery: 0 }; p = plan(state, spec); }
  return p.err ? null : { spec, p };
}

let cache = { key: '', rec: null };

// Bestes Training für die aktuelle Hardware (≤ maxWeeks). Post-Training des besten LLMs hat Vorrang.
export function recommendTraining(state, maxWeeks = 10) {
  if (state.job) return null;
  const key = [state.week, state.nextId, state.research.done.length, state.datasets.length, JSON.stringify(state.machines.map((m) => [m.id, m.count, m.role, m.gpus.length, m.cpu, m.ram.length, m.storage.length])), state.cloud.map((c) => c.n + c.role).join(), maxWeeks].join('|');
  if (cache.key === key) return cache.rec;
  const tech = techFor(state);
  let rec = null;

  const llm = readyModels(state).filter((m) => m.task === 'llm' && (m.bits || 16) === 16).sort((a, b) => b.score - a.score)[0];
  if (llm) {
    for (const method of Object.keys(METHODS)) {
      if (methodAllowed(state, llm, method) || (method === 'sft' && llm.stages.includes('sft'))) continue;
      const ds = postDatasets(state, method);
      if (!ds.length) continue;
      for (const adapter of ['full', 'lora', 'qlora']) {
        const r = tryPlan(state, { kind: 'post', baseId: llm.id, method, adapter, datasets: ds, name: `${llm.name.replace(/ \(.*\)$/, '')} ${METHODS[method].short}`, ...tech });
        if (r && r.p.weeks <= maxWeeks) { rec = { ...r, why: `${METHODS[method].short} macht ${llm.name} ${method === 'sft' ? 'chatfähig' : 'deutlich besser'}.` }; break; }
      }
      if (rec) break;
    }
  }

  if (!rec) {
    let best = null;
    for (const t of Object.keys(TASKS).filter((x) => taskUnlocked(state, x))) {
      const ds = datasetsFor(state, t);
      if (!ds.length) continue;
      const cur = bestModelFor(state, t)?.score || 0;
      const value = t === 'llm' ? 20000 : TASKS[t].appBase;
      for (const params of PARAM_STEPS.slice(0, maxParamIdx(state) + 1)) {
        for (const arch of t === 'llm' && has(state, 'moe') ? ['dense', 'moe'] : ['dense']) {
          for (const epochs of [1, 2]) {
            const r = tryPlan(state, { kind: 'pretrain', task: t, datasets: ds, params, epochs, arch, name: `${TASKS[t].name} ${shortP(params)}`, ...tech });
            if (!r || r.p.weeks > maxWeeks) continue;
            const gain = ((r.p.result.score - cur) * value) / Math.pow(r.p.weeks, 0.3);
            if (gain > 0 && (!best || gain > best.gain)) best = { ...r, gain, why: `${TASKS[t].name}: ~${Math.round(cur)} → ~${Math.round(r.p.result.score)} in ${r.p.weeks} Wo.` };
          }
        }
      }
    }
    rec = best;
  }
  cache = { key, rec };
  return rec;
}

const shortP = (n) => (n >= 1e9 ? `${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${Math.round(n / 1e6)}M` : `${Math.round(n / 1e3)}K`);

// ---------- Produkte automatisch skalieren (Cloud) ----------

function bestOfferFor(state, m) {
  const offers = Object.keys(CLOUD).filter((id) => cloudAvailable(state, id));
  let best = null;
  for (const id of offers) {
    const vm = { cloud: true, offer: id, count: 1, gpus: Array(CLOUD[id].n).fill({ id: CLOUD[id].gpu }) };
    const r = serveRate(state, m, machineStats(state, vm, (m.bits || 16) <= 8 ? 'fp8' : 'fp16'));
    if (!r.fits) continue;
    const perDollar = r.tokS / cloudPrice(state, id);
    if (!best || perDollar > best.perDollar) best = { id, perDollar };
  }
  return best?.id;
}

// Was ein Produkt bei voller Bedienung pro Woche einbringen würde
function potentialRevenue(state, kind) {
  if (kind === 'chat') return (state.chat.paid * state.chat.price) / 4.33;
  return (state.api.tokens / 1e6) * state.api.price;
}

export function autoScale(state) {
  for (const kind of ['chat', 'api']) {
    const m = productModel(state, kind);
    let g = state.cloud.find((c) => c.auto && c.role === kind);
    if (!m) { if (g) setCloud(state, g.id, 0); continue; }
    const offer = bestOfferFor(state, m);
    // Modell passt nicht mehr ins gemietete Angebot (oder es gibt ein besseres) → wechseln
    if (g && g.offer !== offer) { setCloud(state, g.id, 0); g = null; }
    if (!offer) continue;
    const l = load(state, kind);
    // Nie mehr ausgeben als das Produkt (bei voller Bedienung) einbringt – mindestens ein paar Instanzen zum Wachsen
    const maxN = Math.max(2, Math.floor((potentialRevenue(state, kind) * 0.8) / cloudWeekly(state, offer)));
    if (l > 0.9) {
      if (!g) { g = rentCloud(state, offer, 1, kind); g.auto = true; }
      const want = l === Infinity ? g.n + 1 : Math.ceil((g.n * Math.min(l, 4)) / 0.75);
      setCloud(state, g.id, Math.min(want, Math.max(g.n, maxN)));
    } else if (g && l < 0.35) {
      setCloud(state, g.id, Math.floor(g.n * 0.8));
    }
  }
}

// ---------- Der eine empfohlene nächste Schritt ----------

const step = (icon, title, why, act, data = {}, label = 'Los') => ({ icon, title, why, act, data, label });

export function nextStep(state) {
  if (state.pending.length) return step('❗', 'Entscheidung offen', 'Ohne Entscheidung geht es nicht weiter.', 'openEvent', {}, 'Ansehen');

  const own = state.machines.filter((m) => m.gpus.length);
  if (!own.length) {
    const p = presetBuilds(state).filter((x) => x.chassis === 'desktop' || x.chassis === 'hedt').sort((a, b) => a.price - b.price)[0];
    if (p && !canBuyPreset(state, p.chassis, p.gpu)) {
      return step('🖥️', `Kauf einen PC mit ${p.config.gpus.length}× GPU`, `Der Laptop ist viel zu langsam. ${money(p.price)}, komplett ausbalanciert.`, 'buyPreset', { c: p.chassis, g: p.gpu }, `Kaufen (${money(p.price)})`);
    }
  }

  const tasks = Object.keys(TASKS).filter((t) => taskUnlocked(state, t));
  const noData = tasks.filter((t) => !datasetsFor(state, t).length);
  const cheapDs = Object.keys(DATASETS).filter((id) => datasetAvailable(state, id) && DATASETS[id].cost <= state.money * 0.3
    && DATASETS[id].tags.some((tag) => noData.some((t) => TASKS[t].tag === tag))).sort((a, b) => DATASETS[a].cost - DATASETS[b].cost)[0];
  if (cheapDs) return step('📚', `Kauf „${DATASETS[cheapDs].name}“`, 'Ohne Daten kannst du diesen Modell-Typ nicht trainieren.', 'buyDs', { id: cheapDs }, DATASETS[cheapDs].cost ? `Kaufen (${money(DATASETS[cheapDs].cost)})` : 'Gratis holen');

  // Daten-Upgrade für den wertvollsten Modell-Typ (LLM zuerst): bestes Tokens×Qualität pro $
  const focus = tasks.includes('llm') ? 'llm' : tasks[tasks.length - 1];
  const upgrade = Object.keys(DATASETS).filter((id) => datasetAvailable(state, id) && (DATASETS[id].use || ['pretrain']).includes('pretrain')
    && DATASETS[id].tags.includes(TASKS[focus].tag) && DATASETS[id].cost <= Math.max(0, state.money - 6 * weeklyCosts(state).total) * 0.35)
    .sort((a, b) => (DATASETS[b].tokens * DATASETS[b].quality ** 2) / (DATASETS[b].cost + 1000) - (DATASETS[a].tokens * DATASETS[a].quality ** 2) / (DATASETS[a].cost + 1000))[0];
  if (upgrade) return step('📚', `Mehr Daten: „${DATASETS[upgrade].name}“`, `${TASKS[focus].name}: mehr und bessere Daten = besseres Modell.`, 'buyDs', { id: upgrade }, DATASETS[upgrade].cost ? `Kaufen (${money(DATASETS[upgrade].cost)})` : 'Gratis holen');
  const ftData = Object.keys(DATASETS).filter((id) => datasetAvailable(state, id) && (DATASETS[id].use || []).some((u) => u !== 'pretrain')
    && readyModels(state).some((m) => m.task === 'llm') && DATASETS[id].cost <= Math.max(0, state.money - 6 * weeklyCosts(state).total) * 0.25)
    .filter((id) => (DATASETS[id].use || []).some((u) => Object.values(METHODS).some((M) => M.data === u && has(state, M.research === 'instruction-tuning' ? 'sft' : M.research) || (M.data === u && isDone(state, M.research)))))
    .sort((a, b) => DATASETS[a].cost - DATASETS[b].cost)[0];
  if (ftData) return step('📚', `Post-Training-Daten: „${DATASETS[ftData].name}“`, DATASETS[ftData].desc, 'buyDs', { id: ftData }, `Kaufen (${money(DATASETS[ftData].cost)})`);

  const c = state.contracts.filter((x) => { const m = candidate(state, x); return m && meets(state, x, m); }).sort((a, b) => b.reward - a.reward)[0];
  if (c) return step('📦', `Auftrag liefern: ${money(c.reward)}`, `${c.client} zahlt sofort – und wird vielleicht Stammkunde.`, 'deliver', { id: c.id }, 'Liefern');

  const app = readyModels(state).filter((m) => m.task !== 'llm' && state.apps[m.task] !== m.id && m.score > (findModel(state, state.apps[m.task])?.score || 0)).sort((a, b) => b.score - a.score)[0];
  if (app) return step('📱', `${app.name} als App starten`, 'Bringt jede Woche Geld, ohne dass du etwas tun musst.', 'deployApp', { id: app.id }, 'Starten');

  const chatable = readyModels(state).filter((m) => m.task === 'llm' && m.chat).sort((a, b) => b.score - a.score)[0];
  if (chatable && (!chatModel(state) || chatModel(state).score < chatable.score - 3)) {
    return step('💬', `${chatable.name} in Chat & API`, 'Ein chatfähiges LLM verdient über Abos, API und Fach-Märkte.', 'useBoth', { id: chatable.id }, 'Live schalten');
  }
  const bestLlm = readyModels(state).filter((m) => m.task === 'llm').sort((a, b) => b.score - a.score)[0];
  if (bestLlm && !state.api.modelId) return step('🔌', `${bestLlm.name} als API anbieten`, 'Auch ohne Chat zahlen Entwickler pro Token.', 'useModel', { kind: 'api', id: bestLlm.id }, 'Live schalten');

  if (canRaise(state)) return step('💰', `${nextRound(state).name} annehmen`, 'Frisches Geld für mehr GPUs.', 'raise', {}, 'Annehmen');

  if (!state.job) {
    const r = recommendTraining(state);
    if (r) return step('🧪', `Trainiere: ${r.spec.name}`, r.why, 'startRecommended', {}, 'Starten');
  }
  if (!state.research.current) {
    const id = recommendResearch(state);
    if (id) return step('🔬', `Erforsche ${RESEARCH_TREE[id].name}`, RESEARCH_TREE[id].desc, 'research', { id }, 'Starten');
  }

  for (const m of allMachines(state).filter((x) => !x.cloud && x.gpus.length)) {
    const p = autoBalancePreview(state, m.id);
    if (p?.changed.length && p.after.eff > p.before.eff + 0.08 && p.cost <= state.money * 0.5) {
      return step('🔧', `${m.name} optimieren`, `Effizienz ${Math.round(p.before.eff * 100)} % → ${Math.round(p.after.eff * 100)} %.`, 'autoBalance', { id: m.id }, `Optimieren (${money(p.cost)})`);
    }
  }

  // Schwache Maschinen bremsen den Trainings-Pool (kleinste GPU bestimmt den VRAM)
  const tp = pool(state, 'train');
  if (tp.machines > 1) {
    const big = Math.max(...tp.stats.map((x) => x.s.minVram));
    const weak = tp.stats.find((x) => x.s.minVram < big * 0.5 && !x.m.cloud);
    if (weak) return step('💤', `${weak.m.name} aus dem Training nehmen`, `Ihre ${Math.round(weak.s.minVram)} GB VRAM begrenzen den ganzen Pool auf kleine Modelle.`, 'setRole', { m: weak.m.id, id: 'idle' }, 'Auf „Aus“');
  }

  // Geld übrig? Mehr Rechenleistung – gleich in Menge.
  const spare = state.money - 10 * weeklyCosts(state).total;
  const p = presetBuilds(state).filter((x) => x.price < spare * 0.5 && !canBuyPreset(state, x.chassis, x.gpu)).sort((a, b) => b.tf / b.price - a.tf / a.price)[0];
  if (p && pool(state, 'train').machines) {
    let n = Math.max(1, Math.floor((spare * 0.5) / p.price));
    while (n > 1 && canBuyPreset(state, p.chassis, p.gpu, n)) n = Math.floor(n * 0.7);
    const g = p.config.gpus.length * n;
    return step('⚡', `Mehr Compute: ${n > 1 ? `${n}× ` : ''}${p.label === 'Maximum' ? 'Top-' : ''}${p.chassis === 'desktop' ? 'PC' : p.chassis === 'hedt' ? 'Workstation' : p.chassis === 'server4u' ? 'Server' : p.chassis === 'hgx' ? 'HGX-Node' : 'NVL72-Rack'} (${g} GPUs)`,
      'Mehr GPUs = größere Modelle in kürzerer Zeit.', 'buyPreset', { c: p.chassis, g: p.gpu, n }, `Kaufen (${money(p.price * n)})`);
  }
  const net = weeklyIncome(state) - weeklyCosts(state).total;
  // Team: Researcher zuerst, dann der Rest
  const order = ['researcher', 'ml', 'researcher', 'sales', 'infra', 'researcher', 'data'];
  const want = order.find((r, i) => state.staff[r] < Math.floor((i + 1) / order.length * (1 + state.staff.researcher)) + (r === 'researcher' ? 1 : 0)) || 'researcher';
  if (state.stats.hiredWeek !== state.week && !canHire(state, want) && net > 3 * salary(state, want)) {
    return step(STAFF[want].icon, `${STAFF[want].name} einstellen`, STAFF[want].desc, 'staff', { role: want, d: 1 }, `Einstellen (${money(salary(state, want))}/Wo)`);
  }

  // Umzug, wenn der Standort voll ist oder Server nicht erlaubt sind
  const nxt = LOCATION_ORDER[LOCATION_ORDER.indexOf(state.location) + 1];
  if (nxt && !canMove(state, nxt)) {
    const full = presetBuilds(state).every((x) => canBuyPreset(state, x.chassis, x.gpu) !== null) || canHire(state, want) === 'Kein Platz im Büro';
    const rent = LOCATIONS[nxt].rent;
    if (full && state.money > 12 * rent + 10 * weeklyCosts(state).total && net > rent * 0.3) {
      return step('🏢', `Umziehen: ${LOCATIONS[nxt].name}`, `${location(state).name} ist voll. Mehr Platz, Strom und Team-Plätze.`, 'move', { id: nxt }, `Umziehen (${money(rent)}/Wo)`);
    }
  }

  return step('▶️', 'Nächste Woche', state.job ? 'Training läuft – einfach weiterspielen.' : 'Gerade gibt es nichts Dringendes.', 'next', {}, 'Weiter');
}
