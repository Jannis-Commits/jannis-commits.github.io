import { CHAT, API, OPEN_SOURCE, INFERENCE, USEFULNESS, DOMAIN_MARKET } from '../../config/products.js';
import { DOMAINS } from '../../config/pipeline.js';
import { LLM } from '../../config/formulas.js';
import { COMPUTE } from '../../config/formulas.js';
import { gameYear } from '../util/format.js';
import { allMachines, machineStats } from './hardware.js';
import { serveRate } from './memory.js';
import { llmShare, rivalTopScores } from './rivals.js';
import { diff } from './difficulty.js';

// ---------- Märkte ----------

const logistic = (c, y) => c.marketMax / (1 + Math.exp(-(y - c.mid) * c.k)) + c.base;
export const chatMarket = (state) => logistic(CHAT, gameYear(state.week));
export const apiMarket = (state) => logistic(API, gameYear(state.week));

export function apiRefPrice(state) {
  const y = gameYear(state.week);
  return Math.max(API.refPriceMin, API.refPriceStart * Math.pow(API.refPriceDrop, Math.max(0, y - 2019)));
}

export const llmModels = (state) => state.models.filter((m) => m.task === 'llm' && m.status === 'ready');
const model = (state, id) => state.models.find((m) => m.id === id && m.status === 'ready');
export const chatModel = (state) => { const m = model(state, state.chat.modelId); return m?.chat ? m : undefined; };
export const apiModel = (state) => model(state, state.api.modelId);
export const productModel = (state, kind) => (kind === 'chat' ? chatModel(state) : apiModel(state));

// ---------- Ziele (wohin sich Nutzer/Nachfrage bewegen) ----------

export function conversion(price) {
  if (price <= 0) return 0;
  return Math.min(CHAT.maxConversion, CHAT.baseConversion * Math.pow(CHAT.refPrice / price, CHAT.priceElasticity));
}

export const usefulness = (score) => Math.min(USEFULNESS.max, Math.pow(score / USEFULNESS.ref, USEFULNESS.exp));

export function chatTarget(state) {
  const m = chatModel(state);
  if (!m) return 0;
  return chatMarket(state) * llmShare(state, m.score) * usefulness(m.score) * (1 + state.rep / CHAT.repFactor);
}

export function apiTarget(state) {
  const m = apiModel(state);
  if (!m) return 0;
  const s = (1 - API.codingWeight) * m.score + API.codingWeight * (m.skills?.coding || m.score);
  const priceFactor = Math.min(API.maxPriceFactor, Math.pow(apiRefPrice(state) / state.api.price, API.priceElasticity));
  return Math.min(apiMarket(state), apiMarket(state) * llmShare(state, s) * usefulness(s) * priceFactor);
}

// ---------- Kapazität: Maschinen mit Rolle "chat" bzw. "api" ----------

export function capacity(state, kind) {
  const m = productModel(state, kind);
  if (!m) return { tokens: 0, machines: 0, fits: true };
  const prec = (m.bits || 16) <= 8 ? 'fp8' : 'fp16';
  let tokS = 0, machines = 0, fits = false, anyMachine = false;
  for (const g of allMachines(state).filter((x) => x.role === kind)) {
    anyMachine = true;
    const r = serveRate(state, m, machineStats(state, g, prec));
    if (r.fits) fits = true;
    tokS += r.tokS * g.count;
    machines += g.count;
  }
  return { tokens: tokS * COMPUTE.secondsPerWeek, machines, fits: fits || !anyMachine, anyMachine };
}

export function demand(state, kind) {
  if (kind === 'chat') return chatModel(state) ? state.chat.free * CHAT.tokensFree + state.chat.paid * CHAT.tokensPaid : 0;
  return apiModel(state) ? state.api.tokens : 0;
}

export function load(state, kind) {
  const d = demand(state, kind);
  if (!d) return 0;
  const cap = capacity(state, kind).tokens;
  return cap > 0 ? d / cap : Infinity;
}

const servedShare = (l) => Math.min(1, 1 / Math.max(l, 1e-9));

// ---------- Fach-Märkte ----------

export const domainMarketSize = (state) =>
  DOMAIN_MARKET.max / (1 + Math.exp(-(gameYear(state.week) - DOMAIN_MARKET.mid) * DOMAIN_MARKET.k));

const domainOf = (m, d) => Math.min(100, m.score * (m.domainF?.[d] ?? LLM.domainBase));

export function domainShare(state, ds) {
  const e = diff(state).marketExp;
  const mine = Math.pow(ds, e);
  const others = rivalTopScores(state).reduce((a, r) => a + Math.pow(r.score * DOMAIN_MARKET.rivalFactor, e), 0);
  return mine + others > 0 ? mine / (mine + others) : 0;
}

// Pro Fachgebiet: bestes Modell aus Chat/API, Score, Anteil, Einnahmen
export function domainMarkets(state) {
  const ms = [chatModel(state), apiModel(state)].filter(Boolean);
  const size = domainMarketSize(state);
  return Object.keys(DOMAINS).map((d) => {
    const m = ms.sort((a, b) => domainOf(b, d) - domainOf(a, d))[0];
    if (!m) return { domain: d, model: null, score: 0, share: 0, revenue: 0, size };
    const score = domainOf(m, d), share = domainShare(state, score);
    return { domain: d, model: m, score, share, revenue: size * share, size };
  });
}

// ---------- Einnahmen ----------

export function productRevenue(state) {
  const chat = chatModel(state) ? (state.chat.paid * state.chat.price) / 4.33 * servedShare(load(state, 'chat')) : 0;
  const api = apiModel(state) ? (state.api.tokens / 1e6) * state.api.price * servedShare(load(state, 'api')) : 0;
  const domains = domainMarkets(state).reduce((a, x) => a + x.revenue, 0);
  return { chat, api, domains, total: chat + api + domains };
}

export const totalUsers = (state) => (chatModel(state) ? state.chat.free + state.chat.paid : 0);
export const productsActive = (state) => !!(chatModel(state) || apiModel(state));

// ---------- Woche simulieren ----------

export function tickProducts(state, events) {
  let worst = 0;
  const churn = (kind) => {
    const l = load(state, kind);
    worst = Math.max(worst, l);
    return Math.min(0.9, Math.max(0, l - 1) * INFERENCE.churnPerOverload);
  };

  if (chatModel(state)) {
    const c = churn('chat');
    const users = state.chat.free + state.chat.paid;
    const next = (users + (chatTarget(state) - users) * CHAT.growth) * (1 - c);
    const conv = conversion(state.chat.price);
    state.chat.paid = next * conv;
    state.chat.free = next * (1 - conv);
  } else {
    state.chat.free = state.chat.paid = 0;
  }

  if (apiModel(state)) {
    const c = churn('api');
    state.api.tokens += (apiTarget(state) - state.api.tokens) * API.growth;
    state.api.tokens *= 1 - c;
  } else {
    state.api.tokens = 0;
  }

  if (worst > 1) {
    state.rep = Math.max(0, state.rep - INFERENCE.repLossOverload);
    if (!state.overloadWarned) {
      events.push({ type: 'warn', text: `Server überlastet (${worst === Infinity ? '∞' : Math.round(worst * 100)} %)! Mehr Maschinen auf Chat/API stellen.`, important: true });
      state.overloadWarned = true;
    }
  } else {
    state.overloadWarned = false;
  }
}

// ---------- Aktionen ----------

export function setProductModel(state, kind, id) {
  (kind === 'chat' ? state.chat : state.api).modelId = id;
}

export const setChatPrice = (state, p) => { state.chat.price = p; };
export const setApiPrice = (state, p) => { state.api.price = p; };

export function canOpenSource(state, m) {
  if (!m || m.status !== 'ready') return 'Modell nicht fertig';
  if (m.origin !== 'own') return 'Nur eigene Modelle';
  if (state.openSourced.includes(m.id)) return 'Schon veröffentlicht';
  return null;
}

export function openSource(state, id) {
  const m = model(state, id);
  if (canOpenSource(state, m)) return null;
  state.openSourced.push(id);
  const gain = m.score * OPEN_SOURCE.repPerScore;
  state.rep = Math.min(100, state.rep + gain);
  return gain;
}

// Modell gelöscht → Produkte freigeben
export function releaseModel(state, id) {
  if (state.chat.modelId === id) state.chat.modelId = null;
  if (state.api.modelId === id) state.api.modelId = null;
}
