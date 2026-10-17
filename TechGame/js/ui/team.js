import * as F from '../util/format.js';
import { ROLES, ROLE } from '../../config/roles.js';
import { OFFICES, HARDWARE } from '../../config/offices.js';
import { WORK } from '../../config/balance.js';
import { seats, freeSeats, hwBonus, staffById, playerProducts, sIdx } from '../engine/core.js';
import { hireFee, searchCost, fairSalary, avgMorale, basePoints, bulkCost, weeklySalaries } from '../engine/staff.js';
import { moveCost, hwAvailable, hwCost } from '../engine/office.js';
import { rentOf } from '../engine/finance.js';
import { assignLabel } from './projects.js';
import { btn, chip, bar, h2, empty, sheetHead, kv, toggle, seg, initials, pick } from './components.js';
import { coachCard } from './tutorial.js';

export function teamView(s, ui) {
  let html = coachCard(s, 'team');
  const off = OFFICES[s.office];
  const next = OFFICES[s.office + 1];
  html += `<div class="card"><div class="row"><div class="ico blue">${off.icon}</div><div class="grow">
    <div class="title">${off.name}</div><div class="sub">${s.staff.length} von ${off.seats} Plätzen · Miete ${F.money(rentOf(s))}/W</div></div></div>
    <div class="mt">${bar(s.staff.length / off.seats, s.staff.length >= off.seats ? 'amber' : '')}</div>
    ${next ? `<div class="row mt"><div class="grow sub">Nächstes: ${next.icon} ${next.name} (${next.seats} Plätze, ${F.money(next.rent * sIdx(s))}/W)</div>
      ${btn(`Umziehen ${F.money(moveCost(s, s.office + 1))}`, 'moveOffice', { id: s.office + 1 }, { cls: 'sm', disabled: s.money < moveCost(s, s.office + 1) })}</div>` : ''}</div>`;

  const hw = HARDWARE[s.hardware];
  const nhw = HARDWARE[s.hardware + 1];
  html += `<div class="card"><div class="row"><div class="ico">${hw.icon}</div><div class="grow"><div class="title">${hw.name}</div>
    <div class="sub">Tempo ×${hwBonus(s).toFixed(2)}${hwBonus(s) < hw.bonus - 0.001 ? ' (veraltet)' : ''}</div></div></div>
    ${nhw ? `<div class="row mt"><div class="grow sub">${nhw.icon} ${nhw.name}: ×${nhw.bonus}${hwAvailable(s, s.hardware + 1) ? '' : ` – ab ${nhw.year}`}</div>
      ${hwAvailable(s, s.hardware + 1) ? btn(`Aufrüsten ${F.money(hwCost(s, s.hardware + 1))}`, 'upgradeHw', { id: s.hardware + 1 }, { cls: 'sm', disabled: s.money < hwCost(s, s.hardware + 1) }) : ''}</div>` : ''}</div>`;

  html += `<div class="card ${s.crunch ? 'warn' : ''}"><div class="row"><div class="grow"><div class="title">🔥 Crunch</div>
    <div class="sub">+${Math.round((WORK.crunchSpeed - 1) * 100)} % Tempo, aber viel mehr Bugs, sinkende Moral und Kündigungen</div></div>${toggle(s.crunch, 'crunch')}</div></div>`;

  html += h2('Bewerber', freeSeats(s) > 0 ? `${freeSeats(s)} Plätze frei` : 'Büro voll');
  if (!s.applicants.length) html += empty('Gerade keine Bewerbungen.');
  for (const a of s.applicants) {
    const fee = hireFee(s, a);
    html += `<div class="card"><div class="row"><div class="avatar">${initials(a.name)}</div><div class="grow">
      <div class="title">${F.esc(a.name)}</div><div class="sub">${ROLE[a.role].icon} ${ROLE[a.role].name} · Skill ${a.skill} · Tempo ${a.speed.toFixed(2)}</div>
      <div class="tiny">${F.money(a.salary)}/Woche · Einstellung ${F.money(fee)}</div></div>
      ${btn('Einstellen', 'hire', { id: a.id }, { cls: 'sm', disabled: freeSeats(s) <= 0 || s.money < fee })}</div></div>`;
  }
  html += `<div class="btns">${btn(`Neue Bewerber suchen (${F.money(searchCost(s))})`, 'searchApplicants', {}, { cls: 'ghost', disabled: s.money < searchCost(s) })}</div>`;
  if (s.office >= 2) html += `<div class="btns">${btn('Mehrere auf einmal einstellen', 'openBulk', {}, { cls: 'plain', disabled: freeSeats(s) <= 0 })}</div>`;

  const filter = ui.teamFilter || 'all';
  html += h2('Team', `Moral Ø ${Math.round(avgMorale(s))} · ${F.money(weeklySalaries(s))}/W`);
  const counts = Object.fromEntries(ROLES.map((r) => [r.id, s.staff.filter((m) => m.role === r.id).length]));
  html += seg([['all', `Alle ${s.staff.length}`], ...ROLES.filter((r) => counts[r.id]).map((r) => [r.id, `${r.icon} ${counts[r.id]}`]), ['idle', '💤']], filter, 'teamFilter');
  let list = s.staff;
  if (filter === 'idle') list = list.filter((m) => !m.assign && ROLE[m.role].work);
  else if (filter !== 'all') list = list.filter((m) => m.role === filter);
  const shown = list.slice(0, ui.teamAll ? 999 : 40);
  for (const m of shown) html += staffRow(s, m);
  if (list.length > shown.length) html += btn(`Alle ${list.length} anzeigen`, 'teamAll', {}, { cls: 'plain block' });
  return html;
}

function staffRow(s, m) {
  const r = ROLE[m.role];
  return `<div class="card tap" data-act="openStaff" data-id="${m.id}"><div class="row">
    <div class="avatar" style="${m.founder ? 'background:var(--blue);color:#fff' : ''}">${initials(m.name)}</div>
    <div class="grow"><div class="title">${F.esc(m.name)}${m.founder ? ' ⭐' : ''} <span class="tiny">Lv ${m.level}</span></div>
      <div class="sub">${r.icon} ${m.founder ? 'Gründer:in' : r.short} · Skill ${m.skill} · ${r.global ? 'wirkt firmenweit' : assignLabel(s, m)}</div>
      <div class="mt">${bar(m.morale / 100, m.morale < 35 ? 'red' : m.morale < 55 ? 'amber' : 'green', true)}</div></div>
    <div class="right tiny">${m.founder ? '—' : F.money(m.salary)}</div></div></div>`;
}

export function staffSheet(s, ui) {
  const m = staffById(s, ui.sheet.id);
  if (!m) return sheetHead('Nicht mehr im Team');
  const r = ROLE[m.role];
  let html = sheetHead(`${F.esc(m.name)}${m.founder ? ' ⭐' : ''}`, r.icon);
  html += `<div class="card">
    ${kv('Rolle', m.founder ? 'Gründer:in (Developer)' : r.name)}
    ${kv('Skill', m.skill)}${kv('Tempo', m.speed.toFixed(2))}
    ${kv('Level', `${m.level} (${Math.round(m.xp)} / ${22 * m.level} XP)`)}
    ${kv('Moral', Math.round(m.morale), m.morale < 35 ? 'neg' : '')}
    ${kv('Gehalt', m.founder ? 'kein Gehalt' : `${F.money(m.salary)}/W (fair: ${F.money(fairSalary(s, m.role, m.skill, m.speed))})`)}
    ${kv('Leistung', `${basePoints(s, m).toFixed(2)} Punkte/Woche`)}
  </div><p class="tiny">${r.desc}</p>`;
  if (r.work || m.founder) {
    html += h2('Aufgabe');
    const opts = [[null, '💤 Nichts']];
    for (const p of s.projects) opts.push([`p:${p.id}`, `⌨️ ${F.esc(p.name)}`]);
    opts.push(['research', '🔬 Forschung']);
    for (const p of playerProducts(s)) if (p.cat !== 'app_store') opts.push([`s:${p.id}`, `🛠️ Support ${F.esc(p.name)}`]);
    opts.push(['freelance', '💼 Auftragsarbeit (bringt Geld)']);
    for (const [val, label] of opts) html += pick(m.assign === val, label, 'assign', { id: m.id, to: val ?? '' }, { check: false });
  }
  if (!m.founder) html += `<div class="btns">${btn('Gehalt +12 %', 'raise', { id: m.id }, { cls: 'ghost' })}${btn('Entlassen', 'fire', { id: m.id }, { cls: 'danger' })}</div>`;
  return html;
}

export function bulkSheet(s, ui) {
  const role = ui.bulk?.role || 'dev';
  const n = Math.min(ui.bulk?.n || 5, freeSeats(s));
  const { total, salary } = bulkCost(s, role, n);
  let html = sheetHead('Mehrere einstellen', '👥');
  html += seg(ROLES.map((r) => [r.id, `${r.icon} ${r.short}`]), role, 'bulkRole');
  html += `<p class="sub">${ROLE[role].desc}</p>`;
  html += `<div class="row"><span class="grow">Anzahl</span><div class="stepper">${btn('−', 'bulkN', { d: -1 }, { cls: 'ghost' })}<span class="n">${n}</span>${btn('+', 'bulkN', { d: 1 }, { cls: 'ghost' })}</div></div>`;
  html += `<div class="card flat mt">${kv('Gehalt je Person', `≈ ${F.money(salary)}/W`)}${kv('Einstellungskosten', F.money(total))}${kv('Freie Plätze', freeSeats(s))}</div>`;
  html += btn(`${n} einstellen`, 'hireBulk', { role, n }, { cls: 'block', disabled: n <= 0 || s.money < total });
  return html;
}
