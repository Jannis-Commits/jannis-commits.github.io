import * as F from '../util/format.js';
import { PRODUCT_TYPES, TYPE } from '../../config/productTypes.js';
import { RIVAL } from '../../config/rivals.js';
import { FINANCE } from '../../config/balance.js';
import { yf, rivalById, companyName } from '../engine/core.js';
import { ranking, acquisitionPrice, STRATEGIES } from '../engine/rivals.js';
import { marketSize, platformName } from '../engine/market.js';
import { weeklyIncome, weeklyCosts, loanLimit, loanRate, debt, ipoReady, nextRound } from '../engine/finance.js';
import { avgOf } from '../engine/rivals.js';
import { btn, chip, bar, h2, seg, empty, sheetHead, kv, stars, lineChart, stat } from './components.js';
import { coachCard } from './tutorial.js';

const colorOf = (s, owner) => (owner === 'player' ? '#1d5bff' : rivalById(s, owner)?.color || '#94a3b8');

export function marketView(s, ui) {
  let html = coachCard(s, 'market');
  const tab = ui.marketSeg || 'rank';
  html += seg([['rank', '🏆 Rangliste'], ['markets', '📊 Märkte'], ['finance', '💰 Finanzen']], tab, 'marketSeg');
  if (tab === 'rank') html += rankView(s);
  if (tab === 'markets') html += marketsView(s);
  if (tab === 'finance') html += financeView(s);
  return html;
}

function rankView(s) {
  const list = ranking(s);
  const top = list.slice(0, 5);
  const hist = s.finance.history.slice(-104);
  const series = top.map((c) => ({
    color: c.id === 'player' ? '#1d5bff' : c.color,
    width: c.id === 'player' ? 3 : 1.6,
    values: c.id === 'player' ? hist.map((h) => h.value) : (rivalById(s, c.id)?.valueHist || []).slice(-104),
  }));
  let html = `<div class="card">${lineChart(series, { h: 140, log: true })}
    <div class="legend">${top.map((c) => `<span style="--c:${c.id === 'player' ? '#1d5bff' : c.color}">${F.esc(c.name)}</span>`).join('')}</div>
    <p class="tiny mt">Firmenwert der Top 5 (logarithmisch), letzte 2 Jahre</p></div>`;
  html += h2('Firmenwert');
  list.forEach((c, i) => {
    const me = c.id === 'player';
    const r = me ? null : rivalById(s, c.id);
    html += `<div class="card ${me ? 'hl' : 'tap'}" ${me ? '' : `data-act="openRival" data-id="${c.id}"`}><div class="row">
      <div class="big" style="width:34px;color:${i < 3 ? 'var(--blue)' : 'var(--faint)'}">${i + 1}</div>
      <div class="grow"><div class="title"><span style="color:${c.color}">●</span> ${F.esc(c.name)}${me ? ' (du)' : ''}</div>
      <div class="sub">${me ? `${s.staff.length} Leute` : `${STRATEGIES[r.strategy].name}${r.fictional ? '' : ''}`}</div></div>
      <div class="right"><b>${F.money(c.value)}</b></div></div></div>`;
  });
  const gone = s.rivals.filter((r) => !r.alive);
  if (gone.length) html += `<p class="tiny">Vom Markt verschwunden: ${gone.map((r) => `${r.name}${r.ownedBy ? ` (gekauft von ${companyName(s, r.ownedBy)})` : ''}`).join(', ')}</p>`;
  return html;
}

function marketsView(s) {
  let html = '';
  for (const t of PRODUCT_TYPES) {
    if (t.group === 'store' || yf(s) < t.year) continue;
    const sh = s.shares[t.id];
    if (!sh || !sh.size) continue;
    const owners = Object.entries(sh.byOwner).sort((a, b) => b[1] - a[1]);
    const mine = (sh.byOwner.player || 0) / sh.size;
    html += `<div class="card"><div class="row"><div class="ico">${t.icon}</div><div class="grow"><div class="title">${t.name}</div>
      <div class="sub">${F.count(sh.size)} potenzielle Nutzer</div></div>${mine ? `<b class="${mine > 0.3 ? 'pos' : ''}">${F.pct(mine, mine < 0.1 ? 1 : 0)}</b>` : ''}</div>
      <div class="stack mt">${owners.map(([o, u]) => `<i style="width:${(u / sh.size * 100).toFixed(2)}%;background:${colorOf(s, o)}"></i>`).join('')}</div>
      <div class="legend">${owners.slice(0, 4).map(([o, u]) => `<span style="--c:${colorOf(s, o)}">${F.esc(companyName(s, o))} ${F.pct(u / sh.size)}</span>`).join('')}<span style="--c:#e3e8f0">Sonstige ${F.pct(sh.others / sh.size)}</span></div>
    </div>`;
  }
  html += h2('Plattformen', 'Reichweite');
  html += '<div class="card">' + Object.entries(s.reach).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1])
    .map(([id, v]) => `<div class="row" style="margin:6px 0"><span class="grow">${platformName(s, id)}</span><span style="width:45%">${bar(v)}</span><b style="width:48px;text-align:right">${F.pct(v)}</b></div>`).join('') + '</div>';
  return html;
}

function financeView(s) {
  const inc = weeklyIncome(s);
  const cost = weeklyCosts(s);
  const f = s.finance;
  let html = `<div class="stats">${stat('Firmenwert', F.money(f.value))}${stat('Deine Anteile', F.pct(f.ownedShare))}
    ${stat('Dein Vermögen', F.money(f.value * f.ownedShare))}${stat('Schulden', F.money(debt(s)))}</div>`;
  html += h2('Diese Woche');
  html += `<div class="card">
    ${kv('Produkte', F.money(inc.products), 'pos')}${inc.freelance ? kv('Auftragsarbeit', F.money(inc.freelance), 'pos') : ''}
    ${kv('Gehälter', `−${F.money(cost.salaries)}`)}${kv('Miete', `−${F.money(cost.rent)}`)}
    ${cost.servers ? kv('Server', `−${F.money(cost.servers)}`) : ''}${cost.budgets ? kv('Projekt-Budgets', `−${F.money(cost.budgets)}`) : ''}
    ${cost.loans ? kv('Kreditraten', `−${F.money(cost.loans)}`) : ''}
    ${kv('Ergebnis', F.money(inc.total - cost.total, { sign: true }), inc.total - cost.total >= 0 ? 'pos' : 'neg')}</div>`;

  // Investoren
  html += h2('Investoren');
  if (f.offer) {
    html += `<div class="card hl"><div class="title">💼 ${f.offer.investor}: ${f.offer.name}</div>
      <p class="sub">${F.money(f.offer.amount)} für ${F.pct(f.offer.share)} deiner Firma. Ziel: ${F.money(f.offer.targetRev)} Umsatz/Woche innerhalb von ${f.offer.weeks} Wochen – sonst wollen sie mehr Anteile.</p>
      <div class="btns">${btn('Annehmen', 'acceptOffer')}${btn('Ablehnen', 'declineOffer', {}, { cls: 'plain' })}</div></div>`;
  } else if (f.investor) {
    const now = avgOf(f.revHist, 0, 4);
    html += `<div class="card"><div class="title">${f.investor.name} läuft</div>
      <div class="sub">Ziel ${F.money(f.investor.targetRev)}/Woche, aktuell ${F.money(now)} · noch ${f.investor.deadline - s.week} Wochen</div>
      <div class="mt">${bar(now / f.investor.targetRev)}</div></div>`;
  } else {
    const r = nextRound(s);
    html += `<div class="card flat sub">${f.ipo ? 'Deine Firma ist börsennotiert.' : r ? `Nächste Runde: ${r.name} ab ${F.money(r.minValue)} Firmenwert und ${F.money(r.minRev)} Jahresumsatz.` : 'Alle Finanzierungsrunden durch.'}</div>`;
  }

  // Börse
  html += h2('Börse');
  if (f.ipo) {
    html += `<div class="card">${kv('Börsengang', F.date(f.ipoWeek))}${kv('Stimmung', `${Math.round((f.sentiment - 1) * 100)} %`, f.sentiment >= 1 ? 'pos' : 'neg')}
      <p class="tiny mt">Alle ${FINANCE.quarterWeeks} Wochen Quartalszahlen: Wachstum hebt den Kurs.</p></div>`;
  } else {
    const ready = ipoReady(s);
    html += `<div class="card"><p class="sub">Börsengang ab ${F.money(FINANCE.ipoMinValue)} Firmenwert und ${F.money(FINANCE.ipoMinRevenueYear)} Jahresumsatz. Bringt viel Geld (${Math.round(FINANCE.ipoFloat * 100)} % der Anteile) und eine höhere Bewertung.</p>
      ${btn('🔔 An die Börse gehen', 'ipo', {}, { cls: 'block', disabled: !ready })}</div>`;
  }

  // Kredite
  html += h2('Kredite', `${F.pct(loanRate(s), 1)} Zinsen p. a.`);
  const lim = loanLimit(s);
  html += `<div class="card"><div class="sub">Verfügbarer Rahmen: <b>${F.money(lim)}</b></div><div class="gap mt">
    ${[0.25, 0.5, 1].map((k) => btn(F.money(Math.round(lim * k)), 'loan', { amount: Math.round(lim * k), weeks: 104 }, { cls: 'ghost sm', disabled: lim * k < 500 })).join('')}</div>
    <p class="tiny mt">Laufzeit 2 Jahre, wöchentliche Raten.</p></div>`;
  for (const l of f.loans) {
    html += `<div class="card"><div class="row"><div class="grow"><div class="title">${F.money(l.principal)} Kredit</div>
      <div class="sub">Rest ${F.money(l.remaining)} · Rate ${F.money(l.payment)}/W · noch ${l.weeksLeft} W</div></div>
      ${btn('Tilgen', 'repay', { id: l.id }, { cls: 'sm plain', disabled: s.money < l.remaining })}</div></div>`;
  }
  return html;
}

export function rivalSheet(s, ui) {
  const r = rivalById(s, ui.sheet.id);
  if (!r) return sheetHead('Unbekannt');
  const st = STRATEGIES[r.strategy];
  let html = sheetHead(F.esc(r.name), `<span style="color:${r.color}">●</span>`);
  html += `<div class="card">${kv('Strategie', st.name)}${kv('Firmenwert', F.money(r.value))}${kv('Umsatz', `${F.money(r.revenue)}/W`)}
    ${kv('Mitarbeiter', `≈ ${F.count(r.staff)}`)}${kv('Ruf', Math.round(r.rep))}${kv('Gegründet', RIVAL[r.id].founded)}</div><p class="tiny">${st.desc}</p>`;
  html += h2('Produkte');
  const prods = s.products.filter((p) => p.owner === r.id).sort((a, b) => b.users - a.users);
  if (!prods.length) html += empty('Gerade keine Produkte am Markt.');
  for (const p of prods) {
    html += `<div class="card"><div class="row"><div class="ico">${TYPE[p.cat].icon}</div><div class="grow"><div class="title">${F.esc(p.name)}${p.version > 1 ? ` ${p.version}` : ''}</div>
      <div class="sub">${F.count(p.users)} Nutzer ${stars(p.rating)}</div></div><div class="right tiny">Q ${Math.round(p.quality)}</div></div></div>`;
  }
  if (r.dev.length) html += `<p class="tiny">In Entwicklung: ${r.dev.length} Projekt(e)</p>`;
  const price = acquisitionPrice(s, r);
  const tooBig = r.value > s.finance.value * 0.8;
  html += h2('Übernahme');
  html += `<div class="card"><p class="sub">${tooBig ? 'Diese Firma ist (noch) zu groß für dich – du musst mindestens 25 % wertvoller sein.' : `Du übernimmst alle Produkte. Preis: ${F.money(price)}.`}</p>
    ${btn(`Für ${F.money(price)} kaufen`, 'buyRival', { id: r.id }, { cls: 'block', disabled: tooBig || s.money < price })}</div>`;
  return html;
}
