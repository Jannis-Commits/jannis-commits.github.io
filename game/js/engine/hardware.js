import { GPUS, PRECISIONS, TIER_RESEARCH } from '../../config/gpus.js';
import { CHASSIS, CPUS, RAM, STORAGE, COOLING, PSU, NIC, DEFAULTS, CLOUD, CLOUD_ECON } from '../../config/parts.js';
import { LOCATIONS } from '../../config/locations.js';
import { COMPUTE, ECONOMY } from '../../config/formulas.js';
import { STAFF_FX } from '../../config/staff.js';
import { gameYear } from '../util/format.js';
import { effects, has, isDone } from './research.js';

// Maschinen sind Gruppen identischer Rechner: { id, name, chassis, cpu, cooling, psu, nic, ram: [], storage: [], gpus: [{id, used}], count, role }
// role: train | chat | api | idle

export const PARTS = { cpu: CPUS, ram: RAM, storage: STORAGE, cooling: COOLING, psu: PSU, nic: NIC };
export const ROLES = { train: 'Training', chat: 'Chat', api: 'API', idle: 'Aus' };

// ---------- Preise & Verfügbarkeit ----------

const year = (state) => gameYear(state.week);

export function priceOf(state, item, used = false, tier = null) {
  if (!item.cost) return 0;
  const age = Math.max(0, year(state) - (item.year || 0) - 0.5);
  let p = item.cost * Math.max(ECONOMY.priceFloor, Math.pow(ECONOMY.priceDrop, age));
  if (tier) p *= state.market?.[tier] || 1;
  if (used) p *= ECONOMY.usedPrice;
  return Math.round(p);
}

export const gpuPrice = (state, id, used = false) => priceOf(state, GPUS[id], used, GPUS[id].tier);
export const partPrice = (state, kind, id) => priceOf(state, PARTS[kind][id]);

export function gpuAvailable(state, id, used = false) {
  const g = GPUS[id];
  if (g.cloudOnly || year(state) < g.year) return false;
  if (used && year(state) < g.year + ECONOMY.usedMinAge) return false;
  const r = TIER_RESEARCH[g.tier];
  return !r || isDone(state, r);
}

export function partAvailable(state, kind, id, cls = null) {
  const p = PARTS[kind][id];
  if (p.year && year(state) < p.year) return false;
  if (p.research && !isDone(state, p.research)) return false;
  if (cls && p.cls && !p.cls.includes(cls)) return false;
  if (!cls && p.cls?.includes('laptop')) return false;
  return true;
}

export function chassisAvailable(state, id) {
  const c = CHASSIS[id];
  if (c.cost === 0 || (c.year && year(state) < c.year)) return false;
  return !c.research || isDone(state, c.research);
}

// Passende Teile einer Art für eine Maschine (billigste zuerst)
export function partOptions(state, m, kind) {
  const cls = CHASSIS[m.chassis].cls;
  const mem = CPUS[m.cpu]?.mem;
  return Object.keys(PARTS[kind])
    .filter((id) => partAvailable(state, kind, id, cls))
    .filter((id) => kind !== 'ram' || RAM[id].mem === mem)
    .sort((a, b) => partPrice(state, kind, a) - partPrice(state, kind, b));
}

// Neue Maschine mit Standard-Ausstattung (billigste verfügbaren Teile)
export function defaultBuild(state, chassisId) {
  const ch = CHASSIS[chassisId];
  const d = DEFAULTS[ch.cls];
  const m = { chassis: chassisId, cpu: d.cpu, cooling: d.cooling, psu: d.psu, nic: 'gbe', ram: [], storage: [], gpus: [] };
  if (ch.fixed) return { ...m, ram: [...d.ram], storage: [...d.storage] };
  const cpus = Object.keys(CPUS).filter((id) => partAvailable(state, 'cpu', id, ch.cls))
    .sort((a, b) => partPrice(state, 'cpu', a) - partPrice(state, 'cpu', b));
  m.cpu = cpus[0];
  if (!m.cpu) return null;
  const ram = partOptions(state, m, 'ram');
  const stor = partOptions(state, m, 'storage');
  m.ram = ram.length ? [ram[0]] : [];
  m.storage = stor.length ? [stor[0]] : [];
  return m;
}

// Wert einer einzelnen Maschine (aktuelle Neupreise)
export function machinePrice(state, m) {
  let p = priceOf(state, CHASSIS[m.chassis]) + partPrice(state, 'cpu', m.cpu) * (CHASSIS[m.chassis].cpuCount || 1)
    + partPrice(state, 'cooling', m.cooling) + partPrice(state, 'psu', m.psu)
    + partPrice(state, 'nic', m.nic) * (CHASSIS[m.chassis].nicCount || 1);
  for (const r of m.ram) p += partPrice(state, 'ram', r);
  for (const s of m.storage) p += partPrice(state, 'storage', s);
  for (const g of m.gpus) p += gpuPrice(state, g.id, g.used);
  return p;
}

// ---------- Leistung einer Maschine ----------

export function gpuTf(gpu, prec) {
  for (let i = PRECISIONS.indexOf(prec); i >= 0; i--) {
    const v = gpu.tf[PRECISIONS[i]];
    if (v) return v;
  }
  return gpu.tf.fp32;
}

function vendorFactor(state, gpu) {
  let f = has(state, 'cuda') || gpu.vendor === 'google' ? 1 : COMPUTE.noCuda;
  if (gpu.vendor === 'amd') f *= has(state, 'rocm') ? COMPUTE.amdRocm : COMPUTE.amd;
  return f;
}

const soft = (r) => (r >= 1 ? 1 : Math.pow(Math.max(r, 0.001), COMPUTE.softExp));

// Kennzahlen für EINE Maschine einer Gruppe. prec = Rechen-Präzision.
export function machineStats(state, m, prec = 'fp16') {
  if (m.cloud) return cloudStats(state, m, prec);
  const ch = CHASSIS[m.chassis], cpu = CPUS[m.cpu], cool = COOLING[m.cooling], psu = PSU[m.psu], nic = NIC[m.nic];
  const gpus = m.gpus.map((g) => GPUS[g.id]);
  const n = gpus.length, cpuN = ch.cpuCount || 1;

  let gpuRaw = 0, vramTotal = 0, minVram = Infinity, bw = 0, tdp = 0;
  for (const g of gpus) {
    gpuRaw += gpuTf(g, prec) * vendorFactor(state, g);
    vramTotal += g.vram;
    minVram = Math.min(minVram, g.vram);
    bw += g.bw;
    tdp += g.tdp;
  }
  const bridged = n === 2 && gpus[0] === gpus[1] && gpus[0].nvlink === 'bridge';
  const intra = n <= 1 ? 1 : ch.ff === 'sxm' ? COMPUTE.intraSxm : bridged ? COMPUTE.intraBridge : COMPUTE.intraPcie;
  const lanes = n && ch.ff === 'pcie' ? Math.min(1, (cpu.lanes * cpuN) / (16 * n)) : 1;
  const laneF = 0.85 + 0.15 * lanes;
  const raw = n ? gpuRaw * intra * laneF : cpu.tf * cpuN;

  const ramGb = m.ram.reduce((a, r) => a + RAM[r].gb, 0);
  const storTb = m.storage.reduce((a, s) => a + STORAGE[s].tb, 0);
  const storFeed = m.storage.reduce((a, s) => a + STORAGE[s].feed, 0);
  const cpuF = n ? soft((cpu.feed * cpuN) / raw) : 1;
  const storF = soft(storFeed / Math.max(raw, 0.01));
  const ramF = n ? Math.min(1, 0.7 + (0.3 * ramGb) / Math.max(vramTotal, 1)) : Math.min(1, ramGb / 8);
  const heat = (tdp + cpu.tdp * cpuN) / 1000 + (ch.cls === 'laptop' ? 0 : 0.08);
  const coolF = heat > cool.kw ? Math.max(0.35, cool.kw / heat) : 1;
  const eff = cpuF * storF * ramF * coolF;

  const factors = [['CPU-Feed', cpuF], ['Storage', storF], ['RAM', ramF], ['Kühlung', coolF], ['PCIe-Lanes', laneF]];
  const worst = factors.reduce((a, b) => (b[1] < a[1] ? b : a));
  return {
    gpus: n, slots: ch.gpuSlots, raw, tf: raw * eff, eff, cpuF, storF, ramF, coolF, laneF, intra,
    vramTotal: n ? vramTotal : ramGb, minVram: n ? minVram : ramGb * 0.7, bw: n ? bw * intra : COMPUTE_CPU_BW,
    ramGb, storTb, heat, psuKw: psu.kw, coolKw: cool.kw, nicEff: nic.eff, hot: coolF < 1,
    bottleneck: worst[1] < 0.97 ? worst[0] : null, gpuList: gpus,
  };
}

const COMPUTE_CPU_BW = 40;

function cloudStats(state, m, prec) {
  const g = GPUS[CLOUD[m.offer].gpu], n = CLOUD[m.offer].n;
  const intra = n > 1 ? COMPUTE.intraSxm : 1;
  const raw = gpuTf(g, prec) * vendorFactor(state, g) * n * intra;
  return {
    gpus: n, slots: n, raw, tf: raw, eff: 1, cpuF: 1, storF: 1, ramF: 1, coolF: 1, laneF: 1, intra,
    vramTotal: g.vram * n, minVram: g.vram, bw: g.bw * n * intra, ramGb: g.vram * n * 2, storTb: CLOUD_ECON.storageTb,
    heat: 0, psuKw: Infinity, coolKw: Infinity, nicEff: CLOUD_ECON.nicEff, hot: false, bottleneck: null, gpuList: Array(n).fill(g),
  };
}

// ---------- Cloud ----------

export function cloudAvailable(state, id) {
  const c = CLOUD[id];
  if (year(state) < c.year) return false;
  const tier = GPUS[c.gpu].tier;
  return !TIER_RESEARCH[tier] || isDone(state, TIER_RESEARCH[tier]);
}

export function cloudPrice(state, id) {
  const c = CLOUD[id];
  const age = Math.max(0, year(state) - c.year);
  return c.price * Math.max(CLOUD_ECON.priceFloor, Math.pow(CLOUD_ECON.priceDrop, age));
}

export const cloudWeekly = (state, id) => cloudPrice(state, id) * 168;

// Cloud-Mieten sind Gruppen: { id, offer, n, role } – mehrere pro Angebot möglich
export function cloudMachines(state) {
  return state.cloud.filter((c) => c.n > 0).map((c) => ({
    id: `cloud:${c.id}`, cloud: true, offer: c.offer, name: CLOUD[c.offer].name.replace('Cloud: ', '☁ '), count: c.n, role: c.role,
    gpus: Array(CLOUD[c.offer].n).fill({ id: CLOUD[c.offer].gpu }),
  }));
}

export const allMachines = (state) => [...state.machines, ...cloudMachines(state)];

export function rentCloud(state, offer, n = 1, role = 'train') {
  if (!cloudAvailable(state, offer)) return null;
  const c = { id: state.nextId++, offer, n: Math.min(n, CLOUD_ECON.maxPerOffer), role };
  state.cloud.push(c);
  return c;
}

export function setCloud(state, id, n) {
  const c = state.cloud.find((x) => x.id === id);
  if (!c) return;
  c.n = Math.max(0, Math.min(CLOUD_ECON.maxPerOffer, Math.round(n)));
  if (!c.n) state.cloud = state.cloud.filter((x) => x !== c);
}

// ---------- Pools (alle Maschinen einer Rolle) ----------

export function utilization(state) {
  const e = effects(state);
  const ml = Math.min(state.staff.ml * STAFF_FX.mlUtil, STAFF_FX.mlUtilCap);
  return Math.min(COMPUTE.maxUtilization, COMPUTE.baseUtilization + e.util + ml);
}

export function clusterBonus(state) {
  return effects(state).cluster + Math.min(state.staff.infra * STAFF_FX.infraCluster, STAFF_FX.infraClusterCap);
}

export function pool(state, role, prec = 'fp16') {
  let groups = allMachines(state).filter((m) => m.role === role && m.count > 0);
  const stats = groups.map((m) => ({ m, s: machineStats(state, m, prec) }));
  // Reine CPU-Rechner werden ignoriert, sobald GPUs im Pool sind
  const withGpu = stats.filter((x) => x.s.gpus > 0);
  const use = withGpu.length ? withGpu : stats;
  groups = use.map((x) => x.m);

  let tf = 0, best = 0, machines = 0, gpus = 0, minVram = Infinity, minRam = Infinity, storTb = 0, minNic = 1, minGpm = Infinity, hot = 0;
  for (const { m, s } of use) {
    tf += s.tf * m.count;
    best = Math.max(best, s.tf);
    machines += m.count;
    gpus += Math.max(1, s.gpus) * m.count;
    minVram = Math.min(minVram, s.minVram);
    minRam = Math.min(minRam, s.ramGb);
    storTb += s.storTb * m.count;
    minNic = Math.min(minNic, s.nicEff);
    minGpm = Math.min(minGpm, Math.max(1, s.gpus));
    if (s.hot) hot += m.count;
  }
  const clusterEff = machines > 1 ? Math.min(0.98, minNic + clusterBonus(state)) : 1;
  // Lohnt sich das Cluster nicht, trainiert nur die stärkste Maschine
  const clustered = tf * clusterEff;
  const effTf = Math.max(clustered, best);
  return {
    groups, stats: use, machines, gpus, tf: effTf, rawTf: tf, clusterEff, singleOnly: best > clustered && machines > 1,
    minVram: minVram === Infinity ? 0 : minVram, minRam: minRam === Infinity ? 0 : minRam,
    storTb, gpusPerMachine: minGpm === Infinity ? 1 : minGpm, hot, cpuOnly: !withGpu.length,
  };
}

export const flopsPerWeek = (state, tf) => tf * 1e12 * utilization(state) * COMPUTE.secondsPerWeek;

// ---------- Standort-Auslastung ----------

export function usage(state) {
  let space = 0, power = 0;
  for (const m of state.machines) {
    const s = machineStats(state, m);
    space += CHASSIS[m.chassis].space * m.count;
    power += s.heat * m.count;
  }
  const staff = Object.values(state.staff).reduce((a, b) => a + b, 0);
  return { space, power, staff };
}

// Stromverbrauch in kW (Leerlauf zieht weniger)
export function powerDraw(state) {
  let kw = 0;
  for (const m of state.machines) kw += machineStats(state, m).heat * m.count * (m.role === 'idle' ? COMPUTE.idlePower : 1);
  return kw;
}

// ---------- Aktionen ----------

const loc = (state) => LOCATIONS[state.location];
const fitsLocation = (state, addSpace, addPower) => {
  const u = usage(state), l = loc(state);
  if (u.space + addSpace > l.space) return 'Kein Platz am Standort';
  if (u.power + addPower > l.power) return 'Zu wenig Strom am Standort';
  return null;
};

export function canBuyMachine(state, chassisId, n = 1) {
  const ch = CHASSIS[chassisId];
  if (!chassisAvailable(state, chassisId)) return 'Nicht verfügbar';
  if (!loc(state).classes.includes(ch.cls)) return 'Standort zu klein';
  const b = defaultBuild(state, chassisId);
  if (!b) return 'Keine passende CPU';
  if (state.money < machinePrice(state, b) * n) return 'Zu wenig Geld';
  return fitsLocation(state, ch.space * n, machineStats(state, b).heat * n);
}

export function buyMachine(state, chassisId, n = 1) {
  if (canBuyMachine(state, chassisId, n)) return null;
  const b = defaultBuild(state, chassisId);
  state.money -= machinePrice(state, b) * n;
  const same = state.machines.filter((m) => m.chassis === chassisId).length + 1;
  const m = { id: state.nextId++, name: `${CHASSIS[chassisId].short} ${same}`, ...b, count: n, role: 'train' };
  state.machines.push(m);
  return m;
}

const group = (state, id) => state.machines.find((m) => m.id === id);

export function canDuplicate(state, id, n) {
  const m = group(state, id);
  if (!m || CHASSIS[m.chassis].fixed) return 'Nicht möglich';
  if (!chassisAvailable(state, m.chassis)) return 'Gehäuse nicht mehr verfügbar';
  if (state.money < machinePrice(state, m) * n) return 'Zu wenig Geld';
  return fitsLocation(state, CHASSIS[m.chassis].space * n, machineStats(state, m).heat * n);
}

export function duplicate(state, id, n) {
  if (canDuplicate(state, id, n)) return;
  const m = group(state, id);
  state.money -= machinePrice(state, m) * n;
  m.count += n;
}

export function sellMachines(state, id, n) {
  const m = group(state, id);
  if (!m || CHASSIS[m.chassis].sellable === false) return;
  const k = Math.min(n, m.count);
  state.money += machinePrice(state, m) * ECONOMY.sellRefund * k;
  m.count -= k;
  if (!m.count) state.machines = state.machines.filter((x) => x !== m);
}

export function setRole(state, id, role) {
  if (String(id).startsWith('cloud:')) {
    const c = state.cloud.find((x) => x.id === Number(id.slice(6)));
    if (c) c.role = role;
    return;
  }
  const m = group(state, id);
  if (m) m.role = role;
}

export function rename(state, id, name) {
  const m = group(state, id);
  if (m && name.trim()) m.name = name.trim().slice(0, 30);
}

// Prüft Netzteil & Standort-Strom, wenn sich die Abwärme einer Maschine ändert
function powerCheck(state, m, next) {
  const s = machineStats(state, next);
  if (s.heat > PSU[next.psu].kw) return `Netzteil zu schwach (${s.heat.toFixed(2)} / ${PSU[next.psu].kw} kW)`;
  const dHeat = (s.heat - machineStats(state, m).heat) * m.count;
  if (dHeat > 0 && usage(state).power + dHeat > loc(state).power) return 'Zu wenig Strom am Standort';
  return null;
}

export function canAddGpu(state, id, gpuId, used, k = 1) {
  const m = group(state, id);
  const ch = CHASSIS[m.chassis], g = GPUS[gpuId];
  if (!gpuAvailable(state, gpuId, used)) return 'Nicht verfügbar';
  if (ch.ff !== g.ff) return g.ff === 'sxm' ? 'Braucht HGX/NVL-System' : 'Passt nicht (SXM-System)';
  if (m.gpus.length + k > ch.gpuSlots) return 'Keine freien Slots';
  if (state.money < gpuPrice(state, gpuId, used) * m.count * k) return 'Zu wenig Geld';
  return powerCheck(state, m, { ...m, gpus: [...m.gpus, ...Array(k).fill({ id: gpuId, used })] });
}

export function addGpu(state, id, gpuId, used = false, k = 1) {
  if (canAddGpu(state, id, gpuId, used, k)) return false;
  const m = group(state, id);
  state.money -= gpuPrice(state, gpuId, used) * m.count * k;
  for (let i = 0; i < k; i++) m.gpus.push({ id: gpuId, used });
  return true;
}

// So viele GPUs wie möglich einbauen (Geld, Slots, Netzteil)
export function fillGpus(state, id, gpuId, used = false) {
  const m = group(state, id);
  let k = CHASSIS[m.chassis].gpuSlots - m.gpus.length;
  while (k > 0 && canAddGpu(state, id, gpuId, used, k)) k--;
  if (k > 0) addGpu(state, id, gpuId, used, k);
  return k;
}

export function removeGpu(state, id, idx) {
  const m = group(state, id);
  const g = m?.gpus[idx];
  if (!g) return;
  state.money += gpuPrice(state, g.id, g.used) * ECONOMY.sellRefund * m.count;
  m.gpus.splice(idx, 1);
}

// Einzel-Komponenten (cpu, cooling, psu, nic) tauschen
export function canSwap(state, id, kind, partId) {
  const m = group(state, id);
  const ch = CHASSIS[m.chassis];
  if (ch.fixed) return 'Nicht aufrüstbar';
  if (m[kind] === partId) return 'Schon eingebaut';
  if (!partAvailable(state, kind, partId, ch.cls)) return 'Passt nicht';
  const mult = kind === 'cpu' ? ch.cpuCount || 1 : kind === 'nic' ? ch.nicCount || 1 : 1;
  const refund = partPrice(state, kind, m[kind]) * mult * ECONOMY.sellRefund;
  if (state.money < (partPrice(state, kind, partId) * mult - refund) * m.count) return 'Zu wenig Geld';
  const next = { ...m, [kind]: partId };
  if (kind === 'cpu' && CPUS[partId].mem !== CPUS[m.cpu].mem) next.ram = [];
  return powerCheck(state, m, next);
}

export function swapPart(state, id, kind, partId) {
  if (canSwap(state, id, kind, partId)) return false;
  const m = group(state, id);
  const ch = CHASSIS[m.chassis];
  const mult = kind === 'cpu' ? ch.cpuCount || 1 : kind === 'nic' ? ch.nicCount || 1 : 1;
  state.money -= (partPrice(state, kind, partId) - partPrice(state, kind, m[kind]) * ECONOMY.sellRefund) * mult * m.count;
  if (kind === 'cpu' && CPUS[partId].mem !== CPUS[m.cpu].mem) {
    // Anderer RAM-Typ: alter RAM wird verkauft
    for (const r of m.ram) state.money += partPrice(state, 'ram', r) * ECONOMY.sellRefund * m.count;
    m.ram = [];
  }
  m[kind] = partId;
  return true;
}

// RAM-Riegel und Laufwerke (mehrere Slots)
const SLOT_KEY = { ram: 'ramSlots', storage: 'storSlots' };

export function canAddPart(state, id, kind, partId) {
  const m = group(state, id);
  const ch = CHASSIS[m.chassis];
  if (ch.fixed) return 'Nicht aufrüstbar';
  if (m[kind].length >= ch[SLOT_KEY[kind]]) return 'Alle Slots belegt';
  if (!partOptions(state, m, kind).includes(partId)) return 'Passt nicht';
  if (state.money < partPrice(state, kind, partId) * m.count) return 'Zu wenig Geld';
  return null;
}

export function addPart(state, id, kind, partId) {
  if (canAddPart(state, id, kind, partId)) return false;
  const m = group(state, id);
  state.money -= partPrice(state, kind, partId) * m.count;
  m[kind].push(partId);
  return true;
}

export function removePart(state, id, kind, idx) {
  const m = group(state, id);
  if (!m || CHASSIS[m.chassis].fixed || m[kind][idx] == null) return;
  state.money += partPrice(state, kind, m[kind][idx]) * ECONOMY.sellRefund * m.count;
  m[kind].splice(idx, 1);
}

// ---------- Defekte ----------

export function defectChance(state, m, g) {
  const s = machineStats(state, m);
  const infra = 1 - Math.min(state.staff.infra * STAFF_FX.infraDefect, STAFF_FX.infraDefectCap);
  return ECONOMY.defectPerGpu * (g.used ? ECONOMY.defectUsed : 1) * (s.hot ? ECONOMY.defectHot : 1) * infra;
}
