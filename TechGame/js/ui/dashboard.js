import * as F from '../util/format.js';
import { ERAS } from '../../config/eras.js';
import { ROLE } from '../../config/roles.js';
import { VICTORY } from '../../config/balance.js';
import { yf, seats, freeSeats, playerProducts } from '../engine/core.js';
import { weeklyIncome, weeklyCosts } from '../engine/finance.js';
import { missedEra } from '../engine/market.js';
import { teamOf } from '../engine/projects.js';
import { playerRank, ranking } from '../engine/rivals.js';
import { victoryStatus } from '../engine/victory.js';
import { h2, stat, bar, lineChart, miniBars, chip } from './components.js';
import { coachCard } from './tutorial.js';

export function alerts(s) {
  const out = [];
  if (s.money < 0) out.push(['bad', '🚨', `Konto im Minus seit ${s.negWeeks} Woche(n). Nach 8 Wochen ist Schluss.`, 'market']);
  const idle = s.staff.filter((m) => !m.assign && ROLE[m.role].work);
  if (idle.length) out.push(['', '💤', `${idle.length} ${idle.length === 1 ? 'Person hat' : 'Leute haben'} nichts zu tun.`, 'team']);
  const noTeam = s.projects.filter((p) => !teamOf(s, p).length);
  if (noTeam.length) out.push(['', '🧩', `${noTeam[0].name}${noTeam.length > 1 ? ` (+${noTeam.length - 1})` : ''} hat kein Team.`, 'projects']);
  const buggy = playerProducts(s).filter((p) => p.bugs > 12 && !s.staff.some((m) => m.assign === `s:${p.id}`));
  if (buggy.length) out.push(['', '🐞', `${buggy[0].name} hat ${Math.round(buggy[0].bugs)} offene Bugs – niemand im Support.`, 'products']);
  const era = missedEra(s);
  if (era) out.push(['bad', era.icon, `Du verschläfst die ${era.name}! Deine Produkte verlieren Anteile.`, 'research']);
  if (!s.research.current && s.staff.some((m) => m.assign === 'research')) out.push(['', '🔬', 'Dein Forschungsteam wartet auf ein Thema.', 'research']);
  if (s.finance.offer) out.push(['info', '💼', `${s.finance.offer.investor} wartet auf deine Antwort.`, 'market']);
  if (s.finance.investor) {
    const left = s.finance.investor.deadline - s.week;
    if (left < 26) out.push(['', '⏳', `Investorenziel: noch ${left} Wochen.`, 'market']);
  }
  if (s.antitrust >= 40) out.push(['bad', '⚖️', `Kartellrisiko ${Math.round(s.antitrust)} %`, 'products']);
  if (freeSeats(s) <= 0 && s.money > 20000 && s.office < 6) out.push(['info', '🏢', 'Büro voll – für mehr Leute musst du umziehen.', 'team']);
  return out;
}

export function dashboardView(s, ui) {
  const inc = weeklyIncome(s).total;
  const cost = weeklyCosts(s).total;
  const prods = playerProducts(s);
  const users = prods.filter((p) => p.cat !== 'app_store').reduce((a, p) => a + p.users, 0);
  const hist = s.finance.history.slice(-52);
  const rank = playerRank(s);
  const total = ranking(s).length;
  let html = coachCard(s, 'home');

  html += `<div class="hero">
    ${lineChart([{ values: hist.map((h) => h.value), color: '#fff', width: 2.5 }], { w: 200, h: 80 })}
    <div class="k">Firmenwert von ${F.esc(s.companyName)}</div>
    <div class="v">${F.money(s.finance.value)}</div>
    <div class="meta"><div><b>#${rank}</b>von ${total}</div><div><b>${F.money(inc)}</b>Umsatz/Woche</div><div><b>${F.money(inc - cost, { sign: true })}</b>Gewinn/Woche</div></div>
  </div>`;

  const al = alerts(s);
  if (al.length) html += al.map(([cls, icon, text, tab]) =>
    `<div class="alert ${cls}" data-act="tab" data-id="${tab}"><span>${icon}</span><span class="grow">${text}</span><span class="muted">›</span></div>`).join('');

  html += `<div class="stats">
    ${stat('Nutzer', F.count(users))}
    ${stat('Ruf', `${Math.round(s.rep)}<small> / 100</small>`)}
    ${stat('Team', `${s.staff.length}<small> / ${seats(s)} Plätze</small>`)}
    ${stat('Fans', F.count(s.fans))}
  </div>`;

  if (hist.length > 2) {
    html += h2('Cashflow', 'letzte 26 Wochen');
    html += `<div class="card">${miniBars(hist.slice(-26).map((h) => h.inc - h.exp))}
      <div class="row mt"><div class="grow sub">Einnahmen <b class="pos">${F.money(inc)}</b></div><div class="sub">Ausgaben <b class="neg">${F.money(cost)}</b></div></div></div>`;
  }

  // Ziel
  const v = victoryStatus(s);
  if (s.week > 150 || v.osShare > 0) {
    html += h2('Weg zur Weltspitze');
    html += `<div class="card">
      <div class="row"><span class="grow">Nr. 1 nach Firmenwert</span>${v.rankOk ? chip('erreicht', 'green') : chip(`Platz ${v.rank}`)}</div>
      <div class="row mt"><span class="grow">Eigenes OS mit ${Math.round(VICTORY.osShare * 100)} % Marktanteil</span><b>${F.pct(v.osShare)}</b></div>
      <div class="mt">${bar(v.osShare / VICTORY.osShare, v.osOk ? 'green' : '')}</div>
      ${s.won ? '<p class="sub mt">👑 Gewonnen! Du kannst weiterspielen oder einen neuen Run mit Prestige-Boost starten.</p>' : ''}
    </div>`;
  }

  const era = ERAS.find((e) => e.id === s.era);
  const next = ERAS[ERAS.indexOf(era) + 1];
  html += h2('Ära');
  html += `<div class="card flat"><div class="row"><div class="ico">${era.icon}</div><div class="grow"><div class="title">${era.name}</div>
    <div class="sub">${next ? `Nächste: ${next.name} ab ${next.year}` : 'Die letzte Ära – jetzt zählt nur noch die Spitze.'}</div></div></div>
    ${next ? `<div class="mt">${bar((yf(s) - era.year) / (next.year - era.year), '', true)}</div>` : ''}</div>`;

  if (s.report?.notes?.length) {
    html += h2('Letzte Woche');
    html += `<div class="card">${s.report.notes.map((n) => `<div class="logline"><span>${n.icon}</span><span class="grow">${F.esc(n.text)}</span></div>`).join('')}</div>`;
  }

  if (s.log.length) {
    html += h2('Chronik');
    html += `<div class="card">${s.log.slice(0, ui.logAll ? 60 : 8).map((l) =>
      `<div class="logline"><span class="w">KW ${F.kw(l.w)}<br>${F.yearOf(l.w)}</span><span>${l.icon}</span><span class="grow">${F.esc(l.text)}</span></div>`).join('')}
      ${!ui.logAll && s.log.length > 8 ? `<button class="btn plain sm block mt" data-act="logAll">Alles anzeigen</button>` : ''}</div>`;
  }
  return html;
}
