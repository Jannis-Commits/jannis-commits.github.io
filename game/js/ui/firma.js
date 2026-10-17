import { HARDWARE } from '../../config/hardware.js';
import { LOCATIONS, LOCATION_ORDER } from '../../config/locations.js';
import { STAFF } from '../../config/staff.js';
import { ECONOMY } from '../../config/formulas.js';
import * as F from '../util/format.js';
import { btn, kv, stat, h2, stepper, bar } from './components.js';
import {
  location, usage, weeklyCompute, weeklyCosts, cloudType, cloudWeeklyPrice, utilization,
  hardwareAvailable, canBuyHardware, canMove, canHire,
} from '../engine/company.js';
import { weeklyIncome } from '../engine/market.js';
import { pointsPerWeek } from '../engine/research.js';

export function firmaView(state) {
  const loc = location(state), u = usage(state), costs = weeklyCosts(state), income = weeklyIncome(state);
  const net = income - costs.total;
  const ct = cloudType(state);

  const hw = Object.keys(HARDWARE).filter((id) => state.hardware[id] || hardwareAvailable(state, id)).map((id) => {
    const h = HARDWARE[id], n = state.hardware[id] || 0, why = canBuyHardware(state, id);
    return `<div class="card">
      <div class="row"><div class="grow"><div class="title">${h.name}${n ? ` × ${n}` : ''}</div>
      <div class="sub">${h.tflops} TFLOP/s · ${h.power} kW · Platz ${h.space}</div><div class="sub">${h.desc}</div></div>
      <div class="right"><div class="title">${h.cost ? F.money(h.cost) : '–'}</div></div></div>
      ${h.cost ? `<div class="btns">${btn(why || 'Kaufen', 'buyHw', { id }, { disabled: !!why })}
      ${n ? btn(`Verkaufen (${F.money(h.cost * ECONOMY.sellRefund)})`, 'sellHw', { id }, { cls: 'ghost' }) : ''}</div>` : ''}
    </div>`;
  }).join('');

  const nextLocs = LOCATION_ORDER.filter((id) => id !== state.location).map((id) => {
    const l = LOCATIONS[id], why = canMove(state, id);
    return `<div class="card ${why ? 'dim' : ''}"><div class="row"><div class="grow"><div class="title">${l.name}</div>
      <div class="sub">Platz ${l.space} · ${l.power} kW · ${l.staff} Mitarbeiter</div><div class="sub">${l.desc}</div></div>
      <div class="right"><div class="title">${F.money(l.rent)}/Wo</div></div></div>
      <div class="btns">${btn(why || `Umziehen (Kaution ${F.money(l.rent * ECONOMY.moveDepositWeeks)})`, 'move', { id }, { disabled: !!why, cls: 'ghost' })}</div></div>`;
  }).join('');

  const staff = Object.entries(STAFF).map(([role, s]) => {
    const why = canHire(state, role);
    return `<div class="card"><div class="row"><div class="grow"><div class="title">${s.name}</div>
      <div class="sub">${F.money(s.salary)}/Wo · ${s.desc}</div>${why && !state.staff[role] ? `<div class="warn">${why}</div>` : ''}</div>
      ${stepper(state.staff[role], 'staff', { role })}</div></div>`;
  }).join('');

  return `
    ${h2('Überblick')}
    <div class="stats">
      ${stat('Einnahmen/Wo', `<span class="good">${F.money(income)}</span>`)}
      ${stat('Kosten/Wo', `<span class="bad">${F.money(costs.total)}</span>`)}
      ${stat('Compute/Wo', F.flops(weeklyCompute(state)))}
      ${stat('Forschung/Wo', `${pointsPerWeek(state)} Punkte`)}
    </div>
    <div class="card">
      ${kv('Netto pro Woche', F.money(net), net >= 0 ? 'good' : 'bad')}
      ${kv('Ruf', `${Math.round(state.rep)} / 100`)}
      ${kv('Compute-Auslastung', F.pct(utilization(state)))}
    </div>

    ${h2('Kosten pro Woche')}
    <div class="card">
      ${kv('Miete', F.money(costs.rent))}${kv('Gehälter', F.money(costs.salaries))}
      ${kv('Strom & Kühlung', F.money(costs.power))}${kv('Cloud', F.money(costs.cloud))}${kv('App-Hosting', F.money(costs.hosting))}
    </div>

    ${h2('Standort')}
    <div class="card hl"><div class="title">${loc.name}</div><div class="sub">${loc.desc}</div>
      ${kv('Platz', `${F.num(u.space, 1)} / ${loc.space}`)}${bar(u.space / loc.space, true)}
      ${kv('Strom', `${F.num(u.power, 2)} / ${loc.power} kW`)}${bar(u.power / loc.power, true)}
      ${kv('Team', `${u.staff} / ${loc.staff}`)}
    </div>
    ${nextLocs}

    ${h2('Hardware')}
    ${hw}

    ${h2('Cloud-Compute')}
    <div class="card"><div class="row"><div class="grow"><div class="title">${ct.name}</div>
      <div class="sub">${ct.tflops} TFLOP/s · ${F.money(cloudWeeklyPrice(state))}/Wo pro GPU</div>
      <div class="sub">Kein Platz oder Strom nötig. Kosten laufen jede Woche.</div></div>
      ${stepper(state.cloudGpus, 'cloud', {})}</div>
      <div class="btns">${btn('−10', 'cloud', { d: -10 }, { cls: 'ghost small' })}${btn('+10', 'cloud', { d: 10 }, { cls: 'ghost small' })}${btn('Alle weg', 'cloud', { d: -9999 }, { cls: 'ghost small' })}</div>
    </div>

    ${h2('Team')}
    <div class="card"><div class="row"><div class="ico">🧑‍💻</div><div class="grow"><div class="title">Du (Gründer:in)</div><div class="sub">Forscht, trainiert, verkauft. Kein Gehalt.</div></div></div></div>
    ${staff}
  `;
}
