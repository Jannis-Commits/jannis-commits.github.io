import { CHAT, API, OPEN_SOURCE, INFERENCE, USEFULNESS } from '../../config/products.js';
import { MOE, QUANT } from '../../config/formulas.js';
import { gameYear } from '../util/format.js';
import { weeklyCompute } from './company.js';
import { llmShare } from './rivals.js';

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
export const chatModel = (state) => model(state, state.chat.modelId);
export const apiModel = (state) => model(state, state.api.modelId);

// Aktive Parameter pro Token (MoE und Quantisierung sparen Inferenz)
export function servingParams(m) {
  return m.params * (m.arch === 'moe' ? MOE.activeShare : 1) * (m.bits ? QUANT[m.bits].hosting : 1);
}

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

// ---------- Compute-Aufteilung ----------

export const productsActive = (state) => !!(chatModel(state) || apiModel(state));

export function inferenceCapacity(state) {
  return productsActive(state) ? weeklyCompute(state) * state.inferenceShare : 0;
}

export function trainingCompute(state) {
  return weeklyCompute(state) * (productsActive(state) ? 1 - state.inferenceShare : 1);
}

export function inferenceDemand(state) {
  let flops = 0;
  const c = chatModel(state), a = apiModel(state);
  if (c) flops += (state.chat.free * CHAT.tokensFree + state.chat.paid * CHAT.tokensPaid) * 2 * servingParams(c);
  if (a) flops += state.api.tokens * 2 * servingParams(a);
  return flops;
}

export function load(state) {
  const demand = inferenceDemand(state);
  if (!demand) return 0;
  const cap = inferenceCapacity(state);
  return cap > 0 ? demand / cap : Infinity;
}

// ---------- Einnahmen ----------

export function productRevenue(state) {
  const served = Math.min(1, 1 / Math.max(load(state), 1e-9));
  const chat = chatModel(state) ? state.chat.paid * state.chat.price / 4.33 : 0;
  const api = apiModel(state) ? state.api.tokens / 1e6 * state.api.price : 0;
  return { chat: chat * served, api: api * served, served, total: (chat + api) * served };
}

export const totalUsers = (state) => (chatModel(state) ? state.chat.free + state.chat.paid : 0);

// ---------- Woche simulieren ----------

export function tickProducts(state, events) {
  const l = load(state);
  const overload = Math.max(0, l - 1);
  const churn = Math.min(0.9, overload * INFERENCE.churnPerOverload);

  if (chatModel(state)) {
    const target = chatTarget(state);
    const users = state.chat.free + state.chat.paid;
    let next = users + (target - users) * CHAT.growth;
    next *= 1 - churn;
    const conv = conversion(state.chat.price);
    state.chat.paid = next * conv;
    state.chat.free = next * (1 - conv);
  } else {
    state.chat.free = state.chat.paid = 0;
  }

  if (apiModel(state)) {
    state.api.tokens += (apiTarget(state) - state.api.tokens) * API.growth;
    state.api.tokens *= 1 - churn;
  } else {
    state.api.tokens = 0;
  }

  if (overload > 0) {
    state.rep = Math.max(0, state.rep - INFERENCE.repLossOverload);
    if (!state.overloadWarned) {
      events.push({ type: 'warn', text: `Server überlastet (${Math.round(l * 100)} %)! Mehr Compute für Inferenz oder mehr Hardware.`, important: true });
      state.overloadWarned = true;
    }
  } else {
    state.overloadWarned = false;
  }
}

// ---------- Aktionen ----------

export function setChatModel(state, id) {
  state.chat.modelId = id;
}

export function setApiModel(state, id) {
  state.api.modelId = id;
}

export const setChatPrice = (state, p) => { state.chat.price = p; };
export const setApiPrice = (state, p) => { state.api.price = p; };
export const setInferenceShare = (state, v) => { state.inferenceShare = Math.max(0, Math.min(0.9, v)); };

export function openSource(state, id) {
  const m = model(state, id);
  if (!m || state.openSourced.includes(id)) return null;
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
