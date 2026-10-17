import { GPUS } from '../../config/gpus.js';
import { CHASSIS, CPUS, RAM, STORAGE, COOLING, PSU, NIC, CLOUD, CLASS_NAMES } from '../../config/parts.js';
import { LOCATIONS, LOCATION_ORDER } from '../../config/locations.js';
import { ECONOMY } from '../../config/formulas.js';
import * as F from '../util/format.js';
import { btn, kv, chip, bar, h2, empty, seg, fchips, row, list, stepper, factor, note, stat } from './components.js';
import {
  ROLES, allMachines, machineStats, pool, gpuTf, gpuPrice, partPrice, gpuAvailable, chassisAvailable, defaultBuild,
  machinePrice, canBuyMachine, canDuplicate, canAddGpu, canSwap, canAddPart, partOptions, cloudAvailable, cloudWeekly,
  usage, flopsPerWeek, utilization,
} from '../engine/hardware.js';
import { location, canMove } from '../engine/company.js';

const PART_NAMES = { cpu: 'CPU', ram: 'RAM', storage: 'Speicher', cooling: 'Kühlung', psu: 'Netzteil', nic: 'Netzwerk' };
const ROLE_ICON = { train: '🧪', chat: '💬', api: '🔌', idle: '💤' };

export function gpuSummary(gpus) {
  if (!gpus.length) return 'keine GPU';
  const c = {};
  for (const g of gpus) c[g.id] = (c[g.id] || 0) + 1;
  return Object.entries(c).map(([id, n]) => `${n}× ${GPUS[id].name.replace('GeForce ', '')}`).join(', ');
}

const bestTf = (g) => Math.max(...Object.values(g.tf));

// ---------- Maschinen ----------

function poolCard(state, role) {
  const p = pool(state, role);
  if (!p.machines) return '';
  const extra = p.machines > 1 && role === 'train' ? ` · Cluster ${F.pct(p.clusterEff)}` : '';
  const warn = p.singleOnly ? chip('Netzwerk zu langsam – nur 1 Maschine rechnet', 'red') : p.hot ? chip(`${p.hot} überhitzt`, 'red') : '';
  return row({
    icon: ROLE_ICON[role], title: `${ROLES[role]}: ${F.tflops(p.tf)}`,
    sub: `${p.machines} Maschine(n) · ${p.cpuOnly ? 'nur CPU' : `${p.gpus} GPUs · ≥ ${F.gb(p.minVram)}/GPU`}${extra}`,
    chips: warn,
  });
}

function machineRow(state, m) {
  const s = machineStats(state, m);
  const ch = m.cloud ? { icon: '☁️' } : CHASSIS[m.chassis];
  const chips = [chip(`${ROLE_ICON[m.role]} ${ROLES[m.role]}`, m.role === 'idle' ? '' : 'blue')];
  if (s.hot) chips.push(chip(`🌡️ ${F.pct(s.coolF)}`, 'red'));
  else if (s.bottleneck) chips.push(chip(`Engpass: ${s.bottleneck} ${F.pct(s.eff)}`, s.eff < 0.85 ? 'amber' : ''));
  return row({
    icon: ch.icon, title: `${F.esc(m.name)}${m.count > 1 ? ` <span class="mult">×${m.count}</span>` : ''}`,
    sub: `${m.cloud ? `${s.gpus}× ${s.gpuList[0].name}` : gpuSummary(m.gpus)} · ${F.gb(s.vramTotal)} · ${F.tflops(s.tf)}`,
    chips: chips.join(''), act: m.cloud ? 'seg' : 'openMachine', data: m.cloud ? { tab: 'infra', id: 'cloud' } : { id: m.id },
  });
}

function machinesView(state) {
  const ms = allMachines(state);
  const pools = ['train', 'chat', 'api'].map((r) => poolCard(state, r)).filter(Boolean);
  const tp = pool(state, 'train');
  return `
    ${h2('Pools')}
    ${list(pools.length ? pools : [row({ icon: '💤', title: 'Keine Maschine aktiv', sub: 'Gib einer Maschine eine Rolle.' })])}
    ${tp.machines ? note(`Training schafft ${F.flops(flopsPerWeek(state, tp.tf))} pro Woche (Auslastung ${F.pct(utilization(state))}).`) : ''}
    ${h2(`Maschinen (${ms.reduce((a, m) => a + m.count, 0)})`, btn('＋ Kaufen', 'seg', { tab: 'infra', id: 'shop' }, { cls: 'small ghost' }))}
    ${list(ms.map((m) => machineRow(state, m)))}
  `;
}

// ---------- Shop ----------

function shopView(state, ui) {
  const f = ui.shopTab || 'machines';
  const tabs = fchips([['machines', 'Maschinen'], ['gpus', 'GPUs']], f, 'shopTab');
  if (f === 'machines') {
    const rows = Object.keys(CHASSIS).filter((id) => chassisAvailable(state, id)).map((id) => {
      const c = CHASSIS[id], b = defaultBuild(state, id), why = canBuyMachine(state, id);
      const price = b ? machinePrice(state, b) : 0;
      return `<div class="card">
        <div class="row"><div class="ico">${c.icon}</div><div class="grow"><div class="title">${c.name}</div>
        <div class="sub">${c.gpuSlots} GPU-Slots (${c.ff === 'sxm' ? 'SXM' : 'PCIe'}) · ${c.ramSlots} RAM · ${c.storSlots} Laufwerke · Platz ${c.space}</div>
        <div class="sub">${c.desc}</div></div><div class="right title">${F.money(price)}</div></div>
        <div class="sub">Grundausstattung: ${b ? `${CPUS[b.cpu].name}, ${b.ram.map((r) => RAM[r].name).join(', ')}, ${b.storage.map((s) => STORAGE[s].name).join(', ')}` : '–'}</div>
        <div class="btns">${btn(why || 'Kaufen', 'buyMachine', { id, n: 1 }, { disabled: !!why, cls: 'small' })}
          ${['server4u', 'hgx', 'nvl72'].includes(id) && !canBuyMachine(state, id, 10) ? btn('×10', 'buyMachine', { id, n: 10 }, { cls: 'ghost small' }) : ''}</div>
      </div>`;
    });
    return `${tabs}${note('Maschinen kommen mit der billigsten Ausstattung. GPUs, CPU, RAM, Kühlung & Co. rüstest du danach in der Maschine auf.')}${rows.join('') || empty('Nichts verfügbar.')}`;
  }
  const used = !!ui.used;
  const ids = Object.keys(GPUS).filter((id) => gpuAvailable(state, id, used))
    .filter((id) => ui.oldGpus || GPUS[id].year > F.gameYear(state.week) - 5)
    .sort((a, b) => GPUS[b].year - GPUS[a].year);
  const rows = ids.map((id) => {
    const g = GPUS[id], p = gpuPrice(state, id, used);
    const tfK = bestTf(g) / (p / 1000);
    return row({
      icon: g.vendor === 'amd' ? '🟥' : '🟩', title: g.name,
      sub: `${F.gb(g.vram)} · ${F.tflops(bestTf(g))} (${Object.keys(g.tf).pop().toUpperCase()}) · ${g.tdp} W · ${g.ff === 'sxm' ? 'SXM' : 'PCIe'} · ${Math.floor(g.year)}`,
      right: `<b>${F.money(p)}</b><br><span class="sub">${F.num(tfK, tfK < 10 ? 1 : 0)} TF/k$</span>`,
      act: 'openSheet', data: { kind: 'gpuInstall', id, used: used ? 1 : 0 },
    });
  });
  const phase = state.market.until ? note(`⚠️ Marktphase: Preise erhöht (Consumer ×${state.market.consumer}, Profi ×${state.market.pro}, Datacenter ×${state.market.dc}).`, 'amber') : '';
  return `${tabs}${phase}
    ${seg([[0, 'Neu'], [1, 'Gebraucht']], used ? 1 : 0, 'toggleUsed')}
    ${list(rows.length ? rows : [row({ title: 'Keine GPUs', sub: used ? 'Gebraucht gibt es GPUs erst 1,5 Jahre nach Release.' : '' })])}
    <div class="btns">${btn(ui.oldGpus ? 'Ältere ausblenden' : 'Ältere anzeigen', 'toggleOld', {}, { cls: 'ghost small' })}</div>
    ${used ? note('Gebrauchte GPUs: 55 % billiger, fallen aber 4× so oft aus.') : ''}`;
}

// GPU einbauen: Ziel-Maschine wählen
export function gpuInstallSheet(state, ui, s) {
  const g = GPUS[s.id], used = !!Number(s.used);
  const targets = state.machines.filter((m) => CHASSIS[m.chassis].ff === g.ff);
  const rows = targets.map((m) => {
    const free = CHASSIS[m.chassis].gpuSlots - m.gpus.length;
    const why = canAddGpu(state, m.id, s.id, used, 1);
    return `<div class="card"><div class="row"><div class="ico">${CHASSIS[m.chassis].icon}</div><div class="grow">
      <div class="title">${F.esc(m.name)}${m.count > 1 ? ` ×${m.count}` : ''}</div><div class="sub">${gpuSummary(m.gpus)} · ${free} Slot(s) frei</div></div></div>
      <div class="btns">${btn(why || `+1 (${F.money(gpuPrice(state, s.id, used) * m.count)})`, 'addGpu', { m: m.id, id: s.id, used: used ? 1 : 0 }, { disabled: !!why, cls: 'small' })}
      ${!why && free > 1 ? btn('Alle Slots füllen', 'fillGpu', { m: m.id, id: s.id, used: used ? 1 : 0 }, { cls: 'ghost small' }) : ''}</div></div>`;
  });
  return `<h3>${g.name}${used ? ' (gebraucht)' : ''}</h3>
    <div class="stats">${stat('VRAM', F.gb(g.vram))}${stat('Bandbreite', `${F.num(g.bw)} GB/s`)}${stat('Leistung', Object.entries(g.tf).map(([k, v]) => `${k.toUpperCase()} ${F.num(v, v < 10 ? 1 : 0)}`).join('<br>'))}${stat('Strom', `${g.tdp} W`)}</div>
    <div class="label">Einbauen in</div>
    ${rows.join('') || empty(g.ff === 'sxm' ? 'SXM-GPUs brauchen einen HGX-Node oder ein NVL72-Rack.' : 'Keine passende Maschine. Kauf zuerst einen PC oder Server.')}
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}</div>`;
}

// ---------- Maschinen-Detail ----------

export function machineSheet(state, ui, sh) {
  const m = state.machines.find((x) => x.id === Number(sh.id));
  if (!m) return empty('Maschine nicht gefunden.');
  const ch = CHASSIS[m.chassis], s = machineStats(state, m), cpu = CPUS[m.cpu];
  const fixed = !!ch.fixed;
  const slots = [];
  for (let i = 0; i < ch.gpuSlots; i++) {
    const g = m.gpus[i];
    slots.push(g
      ? `<button class="slot full" data-act="openSheet" data-kind="gpuSlot" data-m="${m.id}" data-idx="${i}"><b>${GPUS[g.id].name.replace('GeForce ', '')}</b><span>${F.gb(GPUS[g.id].vram)}${g.used ? ' · gebr.' : ''}</span></button>`
      : `<button class="slot" data-act="seg" data-tab="infra" data-id="shop" data-shop="gpus"><b>＋</b><span>frei</span></button>`);
  }
  const part = (kind, title, sub, cls = '') => row({ icon: '', title: `<span class="pk">${PART_NAMES[kind]}</span> ${title}`, sub, act: fixed ? '' : 'openSheet', data: { kind: 'part', m: m.id, part: kind }, cls });
  const ramGb = s.ramGb, ramSlots = `${m.ram.length}/${ch.ramSlots}`;
  const dupN = [1, 10, 100];
  return `<h3>${ch.icon} ${F.esc(m.name)}${m.count > 1 ? ` <span class="mult">×${m.count}</span>` : ''}</h3>
    <div class="sub">${ch.name}${m.count > 1 ? ' · Änderungen gelten für alle Maschinen der Gruppe' : ''}</div>
    <div class="label">Rolle</div>
    ${seg(Object.entries(ROLES).map(([id, l]) => [id, `${ROLE_ICON[id]} ${l}`]), m.role, 'setRole', { m: m.id })}
    <div class="stats">
      ${stat('Leistung', F.tflops(s.tf), `Effizienz ${F.pct(s.eff)}`)}
      ${stat(s.gpus ? 'VRAM' : 'RAM (statt VRAM)', F.gb(s.vramTotal), s.gpus ? `${s.gpus} GPU(s)` : 'nur CPU')}
      ${stat('Abwärme', F.kw(s.heat), `Kühlung ${F.kw(s.coolKw)}`)}
      ${stat('Netzteil', `${F.pct(s.heat / s.psuKw)}`, `${F.kw(s.heat)} / ${F.kw(s.psuKw)}`)}
    </div>
    ${s.gpus || !fixed ? `<div class="label">Engpässe</div><div class="card tight">
      ${factor('CPU-Feed', s.cpuF, s.cpuF < 0.97 ? 'stärkere CPU' : '')}
      ${factor('Storage', s.storF, s.storF < 0.97 ? 'schnellere/mehr SSDs' : '')}
      ${factor('RAM', s.ramF, s.ramF < 0.97 ? 'RAM ≥ VRAM' : '')}
      ${factor('Kühlung', s.coolF, s.coolF < 1 ? 'Throttling!' : '')}
      ${s.gpus > 1 && ch.ff === 'pcie' ? factor('PCIe-Lanes', s.laneF, s.laneF < 0.97 ? 'CPU mit mehr Lanes' : '') : ''}
      ${s.gpus > 1 ? factor('Multi-GPU', s.intra, ch.ff === 'sxm' ? 'NVLink' : s.intra > 0.9 ? 'NVLink-Brücke' : 'PCIe') : ''}
    </div>` : ''}
    ${ch.gpuSlots ? `<div class="label">GPU-Slots (${m.gpus.length}/${ch.gpuSlots})</div><div class="slots">${slots.join('')}</div>` : ''}
    <div class="label">Komponenten</div>
    ${list([
      part('cpu', cpu.name + (ch.cpuCount > 1 ? ` ×${ch.cpuCount}` : ''), `${cpu.lanes} Lanes · Feed ${F.tflops(cpu.feed * (ch.cpuCount || 1))} · ${cpu.mem.toUpperCase()}`),
      part('ram', `${F.gb(ramGb)} (${ramSlots} Slots)`, m.ram.length ? [...new Set(m.ram)].map((r) => `${m.ram.filter((x) => x === r).length}× ${RAM[r].name}`).join(', ') : 'kein RAM!', !m.ram.length ? 'warnrow' : ''),
      part('storage', `${F.tb(s.storTb)} (${m.storage.length}/${ch.storSlots})`, m.storage.length ? [...new Set(m.storage)].map((x) => `${m.storage.filter((y) => y === x).length}× ${STORAGE[x].name}`).join(', ') : 'kein Speicher!'),
      part('cooling', COOLING[m.cooling].name, `bis ${F.kw(COOLING[m.cooling].kw)} Abwärme`, s.hot ? 'warnrow' : ''),
      part('psu', PSU[m.psu].name, `${F.kw(s.heat)} von ${F.kw(PSU[m.psu].kw)} genutzt`),
      part('nic', NIC[m.nic].name + (ch.nicCount > 1 ? ` ×${ch.nicCount}` : ''), `Cluster-Effizienz ${F.pct(NIC[m.nic].eff)}`),
    ])}
    ${fixed ? note('Der Laptop lässt sich nicht aufrüsten. Kauf einen PC im Shop.') : `
      <div class="label">Gruppe</div>
      <div class="sub">Wert pro Maschine: ${F.money(machinePrice(state, m))} · Verkauf bringt ${F.pct(ECONOMY.sellRefund)}</div>
      <div class="btns">${dupN.map((n) => { const why = canDuplicate(state, m.id, n); return btn(`+${n} (${F.money(machinePrice(state, m) * n)})`, 'duplicate', { m: m.id, n }, { cls: 'ghost small', disabled: !!why, title: why || '' }); }).join('')}</div>
      <div class="btns">${btn('1 verkaufen', 'sellMachine', { m: m.id, n: 1 }, { cls: 'danger small' })}${m.count > 1 ? btn('Alle verkaufen', 'sellMachine', { m: m.id, n: m.count }, { cls: 'danger small' }) : ''}</div>`}
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}</div>`;
}

export function gpuSlotSheet(state, ui, sh) {
  const m = state.machines.find((x) => x.id === Number(sh.m));
  const g = m?.gpus[Number(sh.idx)];
  if (!g) return empty('Leer.');
  const G = GPUS[g.id], refund = gpuPrice(state, g.id, g.used) * ECONOMY.sellRefund * m.count;
  return `<h3>${G.name}${g.used ? ' (gebraucht)' : ''}</h3>
    <div class="stats">${stat('VRAM', F.gb(G.vram))}${stat('Bandbreite', `${F.num(G.bw)} GB/s`)}${stat('Leistung', Object.entries(G.tf).map(([k, v]) => `${k.toUpperCase()} ${F.num(v, v < 10 ? 1 : 0)}`).join('<br>'))}${stat('Strom', `${G.tdp} W`)}</div>
    <div class="btns">${btn('Zurück', 'openMachineBack', { id: m.id }, { cls: 'ghost' })}${btn(`Ausbauen & verkaufen (+${F.money(refund)})`, 'removeGpu', { m: m.id, idx: sh.idx }, { cls: 'danger' })}</div>`;
}

// ---------- Komponenten tauschen ----------

const partSpec = {
  cpu: (p) => `${p.lanes} Lanes · Feed ${F.tflops(p.feed)} · ${p.tdp} W · ${p.mem.toUpperCase()}`,
  cooling: (p) => `bis ${F.kw(p.kw)}`,
  psu: (p) => F.kw(p.kw),
  nic: (p) => `Cluster ${F.pct(p.eff)}`,
  ram: (p) => `${F.gb(p.gb)} ${p.mem.toUpperCase()}`,
  storage: (p) => `${F.tb(p.tb)} · Feed ${F.tflops(p.feed)}`,
};
const TABLE = { cpu: CPUS, ram: RAM, storage: STORAGE, cooling: COOLING, psu: PSU, nic: NIC };

export function partSheet(state, ui, sh) {
  const m = state.machines.find((x) => x.id === Number(sh.m));
  if (!m) return '';
  const kind = sh.part, T = TABLE[kind], ch = CHASSIS[m.chassis];
  const mult = (kind === 'cpu' ? ch.cpuCount || 1 : kind === 'nic' ? ch.nicCount || 1 : 1) * m.count;
  const opts = partOptions(state, m, kind).slice().reverse();
  const back = btn('Zurück', 'openMachineBack', { id: m.id }, { cls: 'ghost' });
  if (kind === 'ram' || kind === 'storage') {
    const installed = m[kind].map((id, i) => row({
      title: T[id].name, sub: partSpec[kind](T[id]),
      right: btn(`Raus (+${F.money(partPrice(state, kind, id) * ECONOMY.sellRefund * m.count)})`, 'removePart', { m: m.id, part: kind, idx: i }, { cls: 'ghost small' }),
    }));
    const add = opts.map((id) => {
      const why = canAddPart(state, m.id, kind, id);
      return row({ title: T[id].name, sub: partSpec[kind](T[id]), right: btn(why || `+ ${F.money(partPrice(state, kind, id) * m.count)}`, 'addPart', { m: m.id, part: kind, id }, { cls: 'small', disabled: !!why }) });
    });
    return `<h3>${PART_NAMES[kind]} – ${F.esc(m.name)}</h3>
      ${kind === 'ram' ? note(`Typ ${CPUS[m.cpu].mem.toUpperCase()} (von der CPU). Faustregel: RAM ≥ VRAM, sonst bremst der Datenlader. CPU-Offload braucht viel RAM.`) : note('Datasets und Checkpoints müssen auf die Laufwerke des Trainings-Pools passen. Mehrere SSDs addieren auch den Durchsatz.')}
      <div class="label">Eingebaut (${m[kind].length}/${ch[kind === 'ram' ? 'ramSlots' : 'storSlots']})</div>${list(installed.length ? installed : [row({ title: 'leer' })])}
      <div class="label">Hinzufügen${m.count > 1 ? ` (×${m.count})` : ''}</div>${list(add)}
      <div class="btns">${back}</div>`;
  }
  const cur = m[kind];
  const rows = opts.map((id) => {
    const p = T[id];
    if (id === cur) return row({ title: `✓ ${p.name}`, sub: partSpec[kind](p), cls: 'on' });
    const why = canSwap(state, m.id, kind, id);
    const net = (partPrice(state, kind, id) - partPrice(state, kind, cur) * ECONOMY.sellRefund) * mult;
    const memNote = kind === 'cpu' && p.mem !== CPUS[cur].mem ? ' · RAM wird ersetzt!' : '';
    return row({ title: p.name, sub: partSpec[kind](p) + memNote, right: btn(why || (net >= 0 ? F.money(net) : `+${F.money(-net)}`), 'swapPart', { m: m.id, part: kind, id }, { cls: 'small', disabled: !!why }) });
  });
  return `<h3>${PART_NAMES[kind]} – ${F.esc(m.name)}</h3>
    ${note({ cpu: 'Die CPU füttert die GPUs mit Daten (Feed) und stellt PCIe-Lanes (16 pro GPU für volle Bandbreite).', cooling: 'Mehr Abwärme als Kühlleistung → Thermal Throttling und mehr Defekte.', psu: 'GPUs + CPU müssen ins Netzteil passen, sonst lassen sie sich nicht einbauen.', nic: 'Wichtig, sobald mehrere Maschinen zusammen trainieren.' }[kind])}
    ${note(`Preis = neues Teil minus ${F.pct(ECONOMY.sellRefund)} vom alten${mult > 1 ? `, ×${mult}` : ''}.`)}
    ${list(rows)}
    <div class="btns">${back}</div>`;
}

// ---------- Standort ----------

function siteView(state) {
  const loc = location(state), u = usage(state);
  const others = LOCATION_ORDER.filter((id) => id !== state.location).map((id) => {
    const l = LOCATIONS[id], why = canMove(state, id);
    return `<div class="card ${why ? 'dim' : ''}"><div class="row"><div class="grow"><div class="title">${l.name}</div>
      <div class="sub">Platz ${F.num(l.space)} · ${F.kw(l.power)} · ${l.staff} Leute · ${l.classes.filter((c) => c !== 'laptop').map((c) => CLASS_NAMES[c]).join(', ')}</div><div class="sub">${l.desc}</div></div>
      <div class="right title">${F.money(l.rent)}/Wo</div></div>
      <div class="btns">${btn(why || `Umziehen (Kaution ${F.money(l.rent * ECONOMY.moveDepositWeeks)})`, 'move', { id }, { disabled: !!why, cls: 'ghost small' })}</div></div>`;
  }).join('');
  return `<div class="card hl"><div class="title">${loc.name}</div><div class="sub">${loc.desc}</div>
      ${kv('Stellplätze', `${F.num(u.space, 1)} / ${F.num(loc.space)}`)}${bar(u.space / loc.space, true)}
      ${kv('Strom', `${F.kw(u.power)} / ${F.kw(loc.power)}`)}${bar(u.power / loc.power, true)}
      ${kv('Team', `${u.staff} / ${loc.staff}`)}${bar(loc.staff ? u.staff / loc.staff : 1, true)}
      ${kv('Erlaubt', loc.classes.filter((c) => c !== 'laptop').map((c) => CLASS_NAMES[c]).join(', '))}
    </div>
    ${h2('Umziehen')}${others}`;
}

// ---------- Cloud ----------

function cloudView(state) {
  const ids = Object.keys(CLOUD).filter((id) => cloudAvailable(state, id)).reverse();
  const cards = ids.map((id) => {
    const c = CLOUD[id], g = GPUS[c.gpu];
    const groups = state.cloud.filter((x) => x.offer === id);
    const gl = groups.map((x) => `<div class="cgroup">
      <div class="row"><div class="grow"><b>${ROLE_ICON[x.role]} ${x.n} Instanz(en)</b><div class="sub">${F.money(cloudWeekly(state, id) * x.n)}/Wo</div></div>${stepper(x.n, 'cloud', { id: x.id })}</div>
      <div class="btns">${[10, 100, 1000].map((d) => btn(`+${d}`, 'cloud', { id: x.id, d }, { cls: 'ghost small' })).join('')}${btn('Kündigen', 'cloud', { id: x.id, d: -x.n }, { cls: 'danger small' })}</div>
      ${seg(Object.entries(ROLES).map(([r, l]) => [r, l]), x.role, 'setRole', { m: `cloud:${x.id}` })}</div>`).join('');
    return `<div class="card ${groups.length ? 'hl' : ''}"><div class="title">${c.name}</div>
      <div class="sub">${F.gb(g.vram * c.n)} VRAM · ${F.tflops(bestTf(g) * c.n)} · ${F.money(cloudWeekly(state, id))}/Wo pro Instanz</div>
      ${gl}
      <div class="btns">${btn(groups.length ? '＋ Weitere Gruppe' : 'Mieten', 'rentCloud', { id }, { cls: groups.length ? 'ghost small' : 'small' })}</div>
    </div>`;
  });
  return `${note('Cloud-Instanzen brauchen keinen Platz und keinen Strom, kosten aber jede Woche. Ausstattung ohne Engpässe, InfiniBand inklusive. Mehrere Gruppen pro Angebot = z. B. eine fürs Training, eine für den Chat.')}
    ${cards.join('') || empty('Noch keine Cloud-Angebote.')}`;
}

export function infraView(state, ui) {
  const s = ui.seg.infra;
  const views = { machines: machinesView, shop: shopView, site: siteView, cloud: cloudView };
  return `${seg([['machines', 'Maschinen'], ['shop', 'Shop'], ['site', 'Standort'], ['cloud', 'Cloud']], s, 'seg', { tab: 'infra' })}${views[s](state, ui)}`;
}

