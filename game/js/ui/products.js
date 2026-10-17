import { CHAT, API, INFERENCE, OPEN_SOURCE } from '../../config/products.js';
import * as F from '../util/format.js';
import { btn, kv, h2, chip, bar, empty } from './components.js';
import { effects } from '../engine/research.js';
import { llmShare } from '../engine/rivals.js';
import {
  llmModels, chatModel, apiModel, chatTarget, apiTarget, conversion, productRevenue, load,
  inferenceCapacity, inferenceDemand, apiRefPrice, chatMarket,
} from '../engine/products.js';

function loadChip(l) {
  if (!l) return chip('Keine Last');
  return chip(`Serverlast ${Math.round(l * 100)} %`, l > 1 ? 'red' : l > 0.8 ? 'amber' : 'green');
}

function modelLine(m, kind) {
  return `<button class="opt ${m ? 'on' : ''}" data-act="pickModel" data-kind="${kind}">
    <span class="ico">🧠</span><span class="grow"><b>${m ? F.esc(m.name) : 'Kein Modell gewählt'}</b><br>
    <span class="sub">${m ? `Score ${Math.round(m.score)} · ${F.params(m.params)}${m.bits ? ` · ${m.bits} Bit` : ''}` : 'Tippen zum Auswählen'}</span></span>
    <span class="sub">ändern ›</span></button>`;
}

function priceSeg(prices, current, act, fmt) {
  return `<div class="seg" style="flex-wrap:wrap">${prices.map((p) =>
    `<button class="${p === current ? 'on' : ''}" style="flex:1 0 22%" data-act="${act}" data-v="${p}">${fmt(p)}</button>`).join('')}</div>`;
}

export function productsView(state) {
  const llms = llmModels(state);
  if (!llms.length) return empty('Produkte gibt es für Sprachmodelle (LLMs). Erforsche „Transformer“ und trainiere dein erstes LLM.');

  const rev = productRevenue(state);
  const l = load(state);
  const chatOk = effects(state).features.has('chat');
  const cm = chatModel(state), am = apiModel(state);
  const share = INFERENCE.shares.reduce((b, v) => (Math.abs(v - state.inferenceShare) < Math.abs(b - state.inferenceShare) ? v : b));

  return `
    ${h2('Server & Inferenz')}
    <div class="card"><div class="row"><div class="grow"><div class="title">Compute für Inferenz: ${F.pct(state.inferenceShare)}</div>
      <div class="sub">Der Rest geht ins Training. Gilt nur, solange ein Produkt läuft.</div></div></div>
      ${priceSeg(INFERENCE.shares, share, 'infShare', (v) => `${Math.round(v * 100)} %`)}
      ${kv('Bedarf', `${F.flops(inferenceDemand(state))}/Wo`)}
      ${kv('Kapazität', `${F.flops(inferenceCapacity(state))}/Wo`)}
      ${bar(Math.min(1, l || 0))}
      <div class="chips">${loadChip(l)}${rev.served < 1 ? chip(`Nur ${F.pct(rev.served)} der Anfragen bedient`, 'red') : ''}</div>
    </div>

    ${h2('Chat-Website')}
    <div class="card ${cm ? 'hl' : ''}">
      ${chatOk ? `${modelLine(cm, 'chat')}
        <div class="label">Abo-Preis pro Monat</div>
        ${priceSeg(CHAT.prices, state.chat.price, 'chatPrice', (p) => (p ? `${p} $` : 'Gratis'))}
        ${cm ? `${kv('Free-Nutzer', F.count(Math.round(state.chat.free)))}
          ${kv('Zahlende Nutzer', `${F.count(Math.round(state.chat.paid))} (${F.pct(conversion(state.chat.price), 1)})`)}
          ${kv('Ziel-Nutzer', F.count(Math.round(chatTarget(state))))}
          ${kv('Marktanteil', F.pct(llmShare(state, cm.score), 1))}
          ${kv('Markt gesamt', `${F.count(chatMarket(state))} Nutzer`)}
          ${kv('Einnahmen', `${F.money(rev.chat)}/Wo`, 'good')}
          <div class="btns">${btn('Chat abschalten', 'stopChat', {}, { cls: 'ghost small' })}</div>` : ''}`
      : '<div class="sub">Erforsche „Instruction Tuning“, damit dein LLM chatten kann.</div>'}
    </div>

    ${h2('API')}
    <div class="card ${am ? 'hl' : ''}">
      ${modelLine(am, 'api')}
      <div class="label">Preis pro 1M Tokens · Marktpreis ~${F.num(apiRefPrice(state), 2)} $</div>
      ${priceSeg(API.prices, state.api.price, 'apiPrice', (p) => `${p} $`)}
      ${am ? `${kv('Tokens pro Woche', F.count(state.api.tokens))}
        ${kv('Ziel', F.count(apiTarget(state)))}
        ${kv('Einnahmen', `${F.money(rev.api)}/Wo`, 'good')}
        <div class="btns">${btn('API abschalten', 'stopApi', {}, { cls: 'ghost small' })}</div>` : ''}
    </div>

    ${h2('Open Source')}
    <div class="sub" style="margin:0 4px 10px">Bringt Ruf statt Geld. Ruf erhöht Nutzerwachstum und Auftragswerte.</div>
    ${llms.map((m) => {
      const done = state.openSourced.includes(m.id);
      return `<div class="card"><div class="row"><div class="grow"><div class="title">${F.esc(m.name)}</div>
        <div class="sub">Score ${Math.round(m.score)} · +${F.num(m.score * OPEN_SOURCE.repPerScore, 1)} Ruf</div></div>
        ${done ? chip('Open Source', 'green') : btn('Veröffentlichen', 'openSource', { id: m.id }, { cls: 'ghost small' })}</div></div>`;
    }).join('')}
  `;
}

export function pickModelSheet(state, kind) {
  const llms = llmModels(state).sort((a, b) => b.score - a.score);
  const cur = kind === 'chat' ? state.chat.modelId : state.api.modelId;
  return `<h3>Modell für ${kind === 'chat' ? 'Chat-Website' : 'API'}</h3>
    ${llms.map((m) => `<button class="opt ${m.id === cur ? 'on' : ''}" data-act="setModel" data-kind="${kind}" data-id="${m.id}">
      <span class="check">${m.id === cur ? '✓' : ''}</span><span class="grow"><b>${F.esc(m.name)}</b><br>
      <span class="sub">Score ${Math.round(m.score)} · ${F.params(m.params)}${m.arch === 'moe' ? ' · MoE' : ''}${m.bits ? ` · ${m.bits} Bit` : ''}</span></span></button>`).join('')}
    <div class="sub">Tipp: Quantisierte und MoE-Modelle brauchen weniger Inferenz-Compute.</div>
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}</div>`;
}
