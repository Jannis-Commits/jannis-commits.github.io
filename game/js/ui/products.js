import { CHAT, API } from '../../config/products.js';
import { DOMAINS } from '../../config/pipeline.js';
import { TASKS } from '../../config/tasks.js';
import * as F from '../util/format.js';
import { btn, kv, h2, chip, bar, empty, row, list, note } from './components.js';
import { has } from '../engine/research.js';
import { llmShare } from '../engine/rivals.js';
import { shownScore } from '../engine/training.js';
import { minServeGb } from '../engine/memory.js';
import { appIncome } from '../engine/market.js';
import { hostingCost } from '../engine/company.js';
import {
  llmModels, chatModel, apiModel, chatTarget, apiTarget, conversion, productRevenue, load, capacity, demand, apiRefPrice, chatMarket, domainMarkets, domainMarketSize,
} from '../engine/products.js';
import { stageBadges } from './lab.js';

function loadBlock(state, kind) {
  const cap = capacity(state, kind), l = load(state, kind), d = demand(state, kind);
  const m = kind === 'chat' ? chatModel(state) : apiModel(state);
  let warn = '';
  if (!cap.anyMachine) warn = note(`Keine Maschine mit Rolle „${kind === 'chat' ? 'Chat' : 'API'}“. Infra → Maschine → Rolle.`, 'red');
  else if (!cap.fits) warn = note(`Das Modell passt nicht in den VRAM dieser Maschinen (braucht ≥ ${F.gb(minServeGb(state, m))} pro GPU, oder Tensor-Parallel). Quantisieren oder größere GPUs!`, 'red');
  return `<div class="label">Server (${cap.machines} Maschine(n))</div>
    ${kv('Bedarf', `${F.count(d)} Tokens/Wo`)}${kv('Kapazität', `${F.count(cap.tokens)} Tokens/Wo`)}
    ${bar(Math.min(1, l || 0), false, l > 1 ? 'red' : l > 0.8 ? 'amber' : '')}
    <div class="chips">${l ? chip(`Last ${l === Infinity ? '∞' : Math.round(l * 100) + ' %'}`, l > 1 ? 'red' : l > 0.8 ? 'amber' : 'green') : chip('Keine Last')}
      ${btn('Maschinen', 'seg', { tab: 'infra', id: 'machines' }, { cls: 'ghost small' })}</div>${warn}`;
}

function modelLine(m, kind) {
  return `<button class="opt ${m ? 'on' : ''}" data-act="openSheet" data-kind="pickModel" data-pick="${kind}">
    <span class="ico">🧠</span><span class="grow"><b>${m ? F.esc(m.name) : 'Kein Modell gewählt'}</b> ${m ? stageBadges(m) : ''}<br>
    <span class="sub">${m ? `Score ${m.evaluated ? '' : '~'}${Math.round(shownScore(m))} · ${F.short(m.params)}` : 'Tippen zum Auswählen'}</span></span>
    <span class="sub">ändern ›</span></button>`;
}

function priceSeg(prices, current, act, fmt) {
  return `<div class="seg wrap">${prices.map((p) =>
    `<button class="${p === current ? 'on' : ''}" data-act="${act}" data-v="${p}">${fmt(p)}</button>`).join('')}</div>`;
}

export function productsView(state) {
  const llms = llmModels(state);
  const rev = productRevenue(state);
  const cm = chatModel(state), am = apiModel(state);
  const apps = Object.entries(state.apps).map(([t, id]) => state.models.find((m) => m.id === id)).filter(Boolean);
  const appRows = apps.map((m) => row({ icon: TASKS[m.task].icon, title: F.esc(m.name), sub: `${F.money(appIncome(state, m))}/Wo − Hosting ${F.money(hostingCost(m))}/Wo`, act: 'openSheet', data: { kind: 'model', id: m.id } }));

  const llmPart = !llms.length ? empty('Chat & API gibt es für Sprachmodelle. Erforsche „Transformer“ und trainiere ein LLM – oder lade ein Open-Weight-Modell.') : `
    ${h2('Chat-Website')}
    <div class="card ${cm ? 'hl' : ''}">
      ${has(state, 'sft') || llms.some((m) => m.chat) ? `${modelLine(cm, 'chat')}
        <div class="label">Abo-Preis pro Monat</div>
        ${priceSeg(CHAT.prices, state.chat.price, 'chatPrice', (p) => (p ? `${p} $` : 'Gratis'))}
        ${cm ? `${kv('Nutzer (frei / zahlend)', `${F.count(Math.round(state.chat.free))} / ${F.count(Math.round(state.chat.paid))}`)}
          ${kv('Ziel-Nutzer', F.count(Math.round(chatTarget(state))))}
          ${kv('Marktanteil', F.pct(llmShare(state, cm.score), 1))} ${kv('Markt gesamt', F.count(chatMarket(state)))}
          ${kv('Conversion', F.pct(conversion(state.chat.price), 1))}
          ${kv('Einnahmen', `${F.money(rev.chat)}/Wo`, 'good')}
          ${loadBlock(state, 'chat')}
          <div class="btns">${btn('Chat abschalten', 'stopProduct', { kind: 'chat' }, { cls: 'ghost small' })}</div>` : ''}`
      : note('Dein LLM muss erst chatfähig werden: erforsche „Instruction Tuning“ und mach ein SFT-Post-Training.')}
    </div>
    ${h2('API')}
    <div class="card ${am ? 'hl' : ''}">
      ${modelLine(am, 'api')}
      <div class="label">Preis pro 1M Tokens · Markt ~${F.num(apiRefPrice(state), 2)} $</div>
      ${priceSeg(API.prices, state.api.price, 'apiPrice', (p) => `${p} $`)}
      ${am ? `${kv('Tokens pro Woche', F.count(state.api.tokens))}${kv('Ziel', F.count(apiTarget(state)))}
        ${kv('Einnahmen', `${F.money(rev.api)}/Wo`, 'good')}
        ${loadBlock(state, 'api')}
        <div class="btns">${btn('API abschalten', 'stopProduct', { kind: 'api' }, { cls: 'ghost small' })}</div>` : ''}
    </div>
    ${h2('Fach-Märkte')}
    ${note(`Firmen zahlen für Spezialisten – je Fachgebiet ${F.money(domainMarketSize(state))}/Wo Markt. Es zählt dein bestes Modell aus Chat/API. Mit Fach-Daten per SFT spezialisieren!`)}
    ${list(domainMarkets(state).map((d) => row({
      icon: DOMAINS[d.domain].icon, title: DOMAINS[d.domain].name,
      sub: d.model ? `${F.esc(d.model.name)} · Fach-Score ${Math.round(d.score)} · Anteil ${F.pct(d.share, 1)}` : 'Kein Modell in Chat/API',
      right: `<b class="${d.revenue > 0 ? 'good' : ''}">${F.money(d.revenue)}</b>`,
    })))}`;
  return `${llmPart}
    ${h2('Apps (kleine Modelle)')}${appRows.length ? list(appRows) : empty('Keine App live. Im Modell-Detail „Als App starten“.')}`;
}

export function pickModelSheet(state, ui, sh) {
  const kind = sh.pick;
  const llms = llmModels(state).filter((m) => kind !== 'chat' || m.chat).sort((a, b) => b.score - a.score);
  const cur = kind === 'chat' ? state.chat.modelId : state.api.modelId;
  return `<h3>Modell für ${kind === 'chat' ? 'Chat-Website' : 'API'}</h3>
    ${llms.map((m) => `<button class="opt ${m.id === cur ? 'on' : ''}" data-act="useModel" data-kind="${kind}" data-id="${m.id}">
      <span class="check">${m.id === cur ? '✓' : ''}</span><span class="grow"><b>${F.esc(m.name)}</b> ${stageBadges(m)}<br>
      <span class="sub">Score ${m.evaluated ? '' : '~'}${Math.round(shownScore(m))} · ${F.short(m.params)} · braucht ${F.gb(minServeGb(state, m))} VRAM</span></span></button>`).join('') || empty(kind === 'chat' ? 'Kein chatfähiges Modell (SFT nötig).' : 'Kein LLM.')}
    ${note('Quantisierte und MoE-Modelle brauchen weniger VRAM und liefern mehr Tokens pro GPU.')}
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}</div>`;
}
