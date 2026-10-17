import { TASKS, SKILLS } from '../../config/tasks.js';
import { DATASETS } from '../../config/datasets.js';
import * as F from '../util/format.js';
import { btn, h2, chip, seg, empty } from './components.js';
import { bestModelFor, datasetAvailable } from '../engine/market.js';
import { leaderboard } from '../engine/rivals.js';
import { productsView } from './products.js';

function contractsView(state) {
  const cards = state.contracts.map((c) => {
    const t = TASKS[c.task], m = bestModelFor(state, c.task), ok = m && m.score >= c.minScore;
    const left = c.expires - state.week;
    return `<div class="card"><div class="row"><div class="ico">${t.icon}</div><div class="grow">
      <div class="title">${c.task === 'llm' ? 'Lizenz-Deal (LLM)' : t.name}</div><div class="sub">${F.esc(c.client)}</div></div>
      <div class="right"><div class="title good">${F.money(c.reward)}</div></div></div>
      <div class="chips">${chip(`Mindest-Score ${c.minScore}`, 'blue')}${chip(`noch ${left} Wo`, left <= 1 ? 'red' : '')}
        ${m ? chip(`Dein bestes: ${Math.round(m.score)}`, ok ? 'green' : 'amber') : chip('Kein Modell', 'amber')}</div>
      <div class="btns">${btn(ok ? 'Liefern' : 'Modell zu schwach', 'deliver', { id: c.id }, { disabled: !ok })}</div></div>`;
  }).join('');
  return `<div class="sub" style="margin:0 4px 10px">Aufträge kommen jede Woche neu. Dein Modell bleibt nach der Lieferung erhalten.</div>
    ${cards || empty('Gerade keine Aufträge. Nächste Woche kommen neue.')}`;
}

function datasetsView(state) {
  const owned = state.datasets.map((id) => DATASETS[id]);
  const shop = Object.keys(DATASETS).filter((id) => datasetAvailable(state, id));
  const card = (id, buy) => {
    const d = DATASETS[id];
    return `<div class="card"><div class="row"><div class="grow"><div class="title">${d.name}</div><div class="sub">${d.desc}</div></div>
      ${buy ? `<div class="right title">${d.cost ? F.money(d.cost) : 'Gratis'}</div>` : ''}</div>
      <div class="chips">${chip(F.tokens(d.tokens))}${chip(`Qualität ${F.pct(d.quality)}`, d.quality >= 0.8 ? 'green' : d.quality < 0.5 ? 'red' : '')}
      ${d.tags.map((t) => chip(Object.values(TASKS).find((x) => x.tag === t)?.name || t, 'blue')).join('')}
      ${d.mix ? Object.entries(d.mix).map(([k, v]) => chip(`${SKILLS[k]} ${F.pct(v)}`)).join('') : ''}</div>
      ${buy ? `<div class="btns">${btn(state.money < d.cost ? 'Zu wenig Geld' : 'Kaufen', 'buyDs', { id }, { disabled: state.money < d.cost })}</div>` : ''}</div>`;
  };
  return `${h2('Shop')}${shop.map((id) => card(id, true)).join('') || empty('Neue Datasets gibt es durch Forschung und mit der Zeit.')}
    ${h2(`Gekauft (${owned.length})`)}${state.datasets.map((id) => card(id, false)).join('') || empty('Noch nichts gekauft.')}`;
}

function rankingView(state, ui) {
  const key = ui.rankKey || 'score';
  const rows = leaderboard(state, key);
  const short = { language: 'Lang.', coding: 'Code', math: 'Math', reasoning: 'Reas.' };
  const opts = [['score', 'Gesamt'], ...Object.keys(SKILLS).map((k) => [k, short[k]])];
  return `${seg(opts, key, 'rankKey')}
    ${rows.length ? `<div class="card" style="padding:4px 10px"><table class="lb">${rows.slice(0, 30).map((r, i) => `
      <tr class="${r.mine ? 'mine' : ''}"><td class="pos">${i + 1}</td>
      <td><div class="nm">${F.esc(r.name)}</div><div class="ow"><i class="sw" style="background:${r.color}"></i>${F.esc(r.owner)}</div></td>
      <td class="r">${Math.round(r[key])}</td></tr>`).join('')}</table></div>`
    : empty('Noch hat niemand ein Sprachmodell veröffentlicht. Die Rangliste zeigt LLM-Benchmarks.')}
    <div class="sub" style="margin:8px 4px">AGI ≈ 100 Punkte in allen Benchmarks.</div>`;
}

export function marketView(state, ui) {
  const s = ui.marketSeg || 'contracts';
  const views = { contracts: contractsView, products: productsView, datasets: datasetsView, ranking: rankingView };
  const tabs = [['contracts', `Aufträge`], ['products', 'Produkte'], ['datasets', 'Daten'], ['ranking', 'Ranking']];
  return `${seg(tabs, s, 'marketSeg')}${views[s](state, ui)}`;
}
