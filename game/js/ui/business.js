import { TASKS, SKILLS } from '../../config/tasks.js';
import { STAFF } from '../../config/staff.js';
import { ROUNDS } from '../../config/funding.js';
import * as F from '../util/format.js';
import { btn, kv, h2, chip, seg, empty, row, list, stepper, check, note, stat } from './components.js';
import { candidate, checks, meets, weeklyIncome } from '../engine/market.js';
import { leaderboard } from '../engine/rivals.js';
import { weeklyCosts, salary, canHire, location } from '../engine/company.js';
import { usage } from '../engine/hardware.js';
import { nextRound, roundChecks, canRaise, valuation, roundMoney } from '../engine/funding.js';
import { productsView } from './products.js';

function contractsView(state) {
  const cards = state.contracts.map((c) => {
    const t = TASKS[c.task], m = candidate(state, c), ok = m && meets(state, c, m);
    const left = c.expires - state.week;
    return `<div class="card ${c.big ? 'hl' : ''}"><div class="row"><div class="ico">${t.icon}</div><div class="grow">
      <div class="title">${c.task === 'llm' ? (c.req.domain ? 'Fach-LLM' : c.req.skill ? 'Spezial-LLM' : 'Lizenz-Deal (LLM)') : t.name}${c.big ? ' ⭐' : ''}</div>
      <div class="sub">${F.esc(c.client)} · noch ${left} Wo</div></div>
      <div class="right title good">${F.money(c.reward)}</div></div>
      <div class="chips">${checks(state, c, m).map(check).join('')}</div>
      <div class="btns">${btn(ok ? `Liefern: ${F.esc(m.name)}` : m ? 'Kein Modell erfüllt alles' : 'Kein Modell', 'deliver', { id: c.id }, { disabled: !ok, cls: 'small' })}</div></div>`;
  }).join('');
  const subs = state.subs.map((x) => row({ icon: TASKS[x.task].icon, title: F.esc(x.client), sub: `noch ${x.until - state.week} Wo`, right: `<b class="good">${F.money(x.weekly)}/Wo</b>` }));
  return `${note('Neue Aufträge kommen jede Woche. Das Modell bleibt nach der Lieferung erhalten. 40 % der Kunden werden danach Stammkunden und zahlen wöchentlich.')}
    ${cards || empty('Gerade keine Aufträge. Nächste Woche kommen neue.')}
    ${subs.length ? h2(`Stammkunden (${subs.length})`) + list(subs) : ''}`;
}

function rankingView(state, ui) {
  const key = ui.rankKey || 'score';
  const rows = leaderboard(state, key);
  const short = { language: 'Lang.', coding: 'Code', math: 'Math', reasoning: 'Reas.' };
  const opts = [['score', 'Gesamt'], ...Object.keys(SKILLS).map((k) => [k, short[k]])];
  const mine = rows.findIndex((r) => r.mine);
  return `${seg(opts, key, 'rankKey')}
    ${mine >= 0 ? note(`Dein bestes Modell: Platz ${mine + 1} von ${rows.length}.`, 'blue') : note('Eigene LLMs erscheinen hier nach den Benchmarks (Modell-Detail).')}
    ${rows.length ? `<div class="card" style="padding:4px 10px"><table class="lb">${rows.slice(0, 40).map((r, i) => `
      <tr class="${r.mine ? 'mine' : ''}"><td class="pos">${i + 1}</td>
      <td><div class="nm">${F.esc(r.name)}</div><div class="ow"><i class="sw" style="background:${r.color}"></i>${F.esc(r.owner)}</div></td>
      <td class="r">${Math.round(r[key])}</td></tr>`).join('')}</table></div>`
    : empty('Noch hat niemand ein Sprachmodell veröffentlicht.')}
    <div class="sub" style="margin:8px 4px">AGI ≈ 100 Punkte in allen Benchmarks.</div>`;
}

function firmaView(state) {
  const costs = weeklyCosts(state), income = weeklyIncome(state), net = income - costs.total;
  const u = usage(state), loc = location(state);
  const staff = Object.entries(STAFF).map(([role, s]) => {
    const why = canHire(state, role);
    return `<div class="card"><div class="row"><div class="ico">${s.icon}</div><div class="grow"><div class="title">${s.name}</div>
      <div class="sub">${F.money(salary(state, role))}/Wo · ${s.desc}</div>${why && !state.staff[role] ? `<div class="warn">${why}</div>` : ''}</div>
      ${stepper(state.staff[role], 'staff', { role })}</div>
      ${loc.staff >= 15 ? `<div class="btns">${btn('+5', 'staff', { role, d: 5 }, { cls: 'ghost small' })}${btn('+25', 'staff', { role, d: 25 }, { cls: 'ghost small' })}${btn('−5', 'staff', { role, d: -5 }, { cls: 'ghost small' })}</div>` : ''}</div>`;
  }).join('');
  const r = nextRound(state);
  const fund = r ? `<div class="card ${canRaise(state) ? 'hl' : ''}"><div class="row"><div class="ico">💰</div><div class="grow"><div class="title">${r.name}</div>
      <div class="sub">${F.money(roundMoney(state, r))} für ${F.pct(r.equity)} · Bewertung ${F.money(valuation(state, r))}</div></div></div>
      <div class="chips">${roundChecks(state).map(check).join('')}</div>
      <div class="btns">${btn(canRaise(state) ? 'Annehmen' : 'Noch nicht', 'raise', {}, { disabled: !canRaise(state) })}</div></div>`
    : note('Alle Finanzierungsrunden abgeschlossen. Du bist börsennotiert!', 'blue');
  const hist = state.funding.history.map((h) => row({ icon: '✓', title: ROUNDS.find((x) => x.id === h.id).name, sub: `${F.money(h.money)} für ${F.pct(h.equity)} · ${F.date(h.week)}` }));
  return `
    ${h2('Finanzen pro Woche')}
    <div class="stats">${stat('Einnahmen', `<span class="good">${F.money(income)}</span>`)}${stat('Kosten', `<span class="bad">${F.money(costs.total)}</span>`)}</div>
    <div class="card tight">
      ${kv('Miete', F.money(costs.rent))}${kv('Gehälter', F.money(costs.salaries))}${kv('Strom & Kühlung', F.money(costs.power))}
      ${kv('Cloud', F.money(costs.cloud))}${kv('App-Hosting', F.money(costs.hosting))}${kv('<b>Netto</b>', `<b>${F.money(net)}</b>`, net >= 0 ? 'good' : 'bad')}
    </div>
    ${h2('Finanzierung')}
    ${fund}
    ${hist.length ? list(hist) : ''}
    <div class="sub" style="margin:6px 4px">Dein Anteil: ${F.pct(state.funding.equity, 1)} · eingesammelt: ${F.money(state.funding.raised)}</div>
    ${h2(`Team (${u.staff}/${loc.staff})`)}
    ${loc.staff === 0 ? note('Im Zimmer ist kein Platz fürs Team. Zieh in ein WG-Büro (Infra → Standort).', 'amber') : ''}
    <div class="card"><div class="row"><div class="ico">🧑‍🚀</div><div class="grow"><div class="title">Du (Gründer:in)</div><div class="sub">Forscht mit 2 P/Woche. Kein Gehalt.</div></div></div></div>
    ${staff}`;
}

export function businessView(state, ui) {
  const s = ui.seg.biz;
  const views = { contracts: contractsView, products: productsView, ranking: rankingView, firma: firmaView };
  return `${seg([['contracts', `Aufträge (${state.contracts.length})`], ['products', 'Produkte'], ['ranking', 'Ranking'], ['firma', 'Firma']], s, 'seg', { tab: 'biz' })}${views[s](state, ui)}`;
}
