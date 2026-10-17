// Markt: Marktgrößen, Plattform-Reichweite, Attraktivität, Marktanteile, Nutzer & Umsatz – für alle Firmen gleich.
import { MARKET, ECOSYSTEM } from '../../config/balance.js';
import { PRODUCT_TYPES, TYPE, AUDIENCES } from '../../config/productTypes.js';
import { MODEL, AD_RPU } from '../../config/businessModels.js';
import { PLATFORMS, PLATFORM, WEB_REACH, homeFade } from '../../config/platforms.js';
import { ERAS } from '../../config/eras.js';
import { curve, clamp, lerp, stepAt } from '../util/math.js';
import { yf, year, fx, hasTech, rivalById } from './core.js';
import { teamPower } from './staff.js';
import { osAppsFactor } from './ecosystem.js';

const OS_CATS = PRODUCT_TYPES.filter((t) => t.group === 'os').map((t) => t.id);
const OTHER_CATS = PRODUCT_TYPES.filter((t) => t.group !== 'os' && t.group !== 'store').map((t) => t.id);

export function marketSize(s, cat) {
  const t = TYPE[cat];
  if (yf(s) < t.year) return 0;
  let m = curve(t.market, yf(s), true);
  if (s.flags.recession) m *= 0.85;
  if (s.flags.pandemic && (t.group === 'web' || t.group === 'mobile')) m *= 1.15;
  return m;
}

function othersScore(s, cat) {
  const y = yf(s);
  if (cat === 'os_desktop') return 0.12 + 1.5 * homeFade(y);
  if (cat === 'os_mobile') return 0.1 + 1.8 * Math.max(0, 1 - (y - 2007) / 6);
  return lerp(MARKET.othersScore, MARKET.othersScoreLate, clamp((y - 1985) / 30, 0, 1));
}

export function platformName(s, id) {
  const pl = PLATFORM[id];
  if (pl.own) {
    const os = s.products.find((p) => p.owner === 'player' && p.provides === id);
    if (os) return os.name;
  }
  return stepAt(pl.names, yf(s));
}

// Reichweite jeder Plattform (Anteil der Nutzer, die sie haben) aus den OS-Nutzerzahlen
export function computeReach(s) {
  const reach = {};
  for (const pl of PLATFORMS) reach[pl.id] = 0;
  for (const cat of OS_CATS) {
    const size = marketSize(s, cat);
    if (!size) continue;
    let used = 0;
    for (const p of s.products) {
      if (p.cat !== cat || !p.provides) continue;
      reach[p.provides] += p.users / size;
      used += p.users;
    }
    if (cat === 'os_desktop') reach.home = Math.max(0, 1 - used / size) * homeFade(yf(s)) * 0.85;
  }
  reach.web = yf(s) >= 1995 ? curve(WEB_REACH, yf(s)) : 0;
  for (const k in reach) reach[k] = clamp(reach[k], 0, 1);
  s.reach = reach;
}

export function productReach(s, p) {
  const g = TYPE[p.cat].group;
  if (g !== 'desktop' && g !== 'mobile') return 1;
  let r = 0;
  for (const pl of p.platforms || []) r += s.reach[pl] || 0;
  return clamp(r, 0, 1);
}

// Verfügbare Plattformen für eine Kategorie (für Spieler-Projekte)
export function platformsFor(s, cat) {
  const g = TYPE[cat].group;
  if (g === 'desktop') {
    return PLATFORMS.filter((pl) => (pl.group === 'desktop' || pl.id === 'web')
      && (pl.id !== 'web' || hasTech(s, pl.tech))
      && (!pl.until || yf(s) < pl.until)
      && (!pl.own || s.products.some((p) => p.owner === 'player' && p.provides === pl.id))
      && (pl.id === 'web' || pl.id === 'home' || s.products.some((p) => p.provides === pl.id)));
  }
  if (g === 'mobile') {
    return PLATFORMS.filter((pl) => pl.group === 'mobile' && s.products.some((p) => p.provides === pl.id && (!pl.own || p.owner === 'player')));
  }
  return [];
}

export function freshness(s, p) {
  const age = Math.max(0, s.week - p.released);
  return 0.3 + 0.7 * Math.exp(-age / TYPE[p.cat].lifetime);
}

export function refPrice(cat, aud, model) {
  const m = MODEL[model];
  return Math.max(0, TYPE[cat].refPrice[aud] * (m.defaultPriceMult ?? 1));
}

export function priceFactor(s, p, aud = p.aud) {
  const m = MODEL[p.model];
  if (!m.hasPrice || m.id === 'freemium') return 1;
  const ref = refPrice(p.cat, aud, p.model) || 1;
  const e = MARKET.priceElasticity[m.elasticity] ?? 1.2;
  return clamp(Math.pow(ref / Math.max(0.01, p.price), e), ...MARKET.priceDemandClamp);
}

export function ownerRep(s, owner) {
  if (owner === 'player') return s.rep;
  return rivalById(s, owner)?.rep ?? 30;
}

export function visibility(s) {
  const base = MARKET.visibilityBase;
  return base + (1 - base) * Math.pow(clamp(s.rep / 80 + Math.log10(1 + s.fans) / 24, 0, 1), 1.4);
}

// Ära verschlafen? → Liefert die Ära, deren Schlüssel-Tech fehlt
export function missedEra(s) {
  for (const e of ERAS) {
    if (!e.keyTech || yf(s) < e.year) continue;
    const weeksIn = (yf(s) - e.year) * 52;
    if (weeksIn > MARKET.eraGraceWeeks && !hasTech(s, e.keyTech)) return e;
  }
  return null;
}

export function ownOSShare(s, cat) {
  const size = marketSize(s, cat);
  if (!size) return 0;
  let u = 0;
  for (const p of s.products) if (p.owner === 'player' && p.cat === cat) u += p.users;
  return u / size;
}

function modelDemand(s, p, aud) {
  const m = MODEL[p.model];
  let d = m.demand * m.audMult[aud];
  if (m.techBoost && p.owner === 'player') for (const [t, v] of Object.entries(m.techBoost)) if (hasTech(s, t)) d *= 1 + v;
  if (m.techBoost && p.owner !== 'player') for (const [t, v] of Object.entries(m.techBoost)) if (t === 'cloud_saas' && yf(s) >= 2009) d *= 1 + v;
  return d;
}

export function score(s, p, aud, ctx) {
  const q = Math.max(1, p.quality * freshness(s, p));
  let sc = Math.pow(q / 50, 2.2);
  sc *= Math.pow(clamp(p.rating, 1, 5) / 3, 1.2);
  sc *= 1 + p.hype / 150 + (p.boost || 0) * (p.owner === 'player' ? ctx.mkt : 1);
  const rep = ownerRep(s, p.owner);
  sc *= aud === 'b' ? 0.25 + rep / 70 : 0.6 + rep / 125;   // Firmenkunden kaufen bei bekannten Namen
  sc *= Math.pow(priceFactor(s, p, aud), 0.6);
  sc *= modelDemand(s, p, aud);
  sc *= p.aud === aud ? 1 : 0.3;
  sc *= Math.pow(Math.max(0.005, productReach(s, p)), 0.5);
  const g = TYPE[p.cat].group;
  if (g === 'os') sc *= osAppsFactor(s, p);
  if (p.owner === 'player') {
    sc *= ctx.vis * ctx.era;
    if (aud === 'b' || p.model === 'license') sc *= ctx.sales;
    if (p.preinstall) sc *= 1 + ECOSYSTEM.preinstallBoost * Math.max(ownOSShare(s, 'os_desktop'), g === 'mobile' ? ownOSShare(s, 'os_mobile') : 0);
  }
  if (s.flags.aiHype && p.cat === 'ai') sc *= 1.2;
  return sc;
}

function ratingTop(s, cat) {
  const qs = s.products.filter((p) => p.cat === cat).map((p) => p.quality * freshness(s, p)).sort((a, b) => b - a).slice(0, 3);
  return qs.length ? qs.reduce((a, b) => a + b, 0) / qs.length : 50;
}

// Bewertung beim Release: relativ zur aktuellen Konkurrenz
export function ratingFor(s, cat, q) {
  const ref = (50 + ratingTop(s, cat)) / 2;
  return clamp(1 + 4 / (1 + Math.exp(-((q - ref) / 14 + 0.4))), 1, 5);
}

export function weeklyRevenue(s, p, prevUsers) {
  const m = MODEL[p.model];
  switch (m.id) {
    case 'oneTime': {
      const buyers = Math.max(0, p.users - prevUsers) + p.users * MARKET.turnoverOneTime;
      return buyers * p.price * MARKET.retailCut;
    }
    case 'subscription':
    case 'license':
      return p.users * p.price * 12 / 52;
    case 'freemium':
      return p.users * m.payFrac * clamp(Math.pow(refPrice(p.cat, p.aud, p.model) / Math.max(0.01, p.price), 1.3), 0.15, 2.2) * p.price * 12 / 52;
    case 'ads': {
      let r = p.users * curve(AD_RPU, yf(s)) / 52;
      if (p.owner === 'player') r *= 1 + fx(s, 'adRevenue');
      if (s.flags.dotcom) r *= 0.75;
      return r;
    }
    case 'openSource':
      return p.users * m.supportRevenue / 52 * (p.aud === 'b' ? 3 : 1);
    default:
      return 0;
  }
}

export function serverCostOf(s, p) {
  const c = TYPE[p.cat].serverCost;
  return p.users * c * (p.owner === 'player' ? Math.max(0.2, 1 - fx(s, 'serverCost')) : 0.8);
}

function ctxFor(s) {
  const mkt = 1 + Math.min(1.5, 0.15 * Math.pow(teamPower(s, 'marketing'), 0.7)) + fx(s, 'marketing');
  const sales = 1 + Math.min(1, 0.12 * Math.pow(teamPower(s, 'sales'), 0.7));
  return { mkt, sales, vis: visibility(s), era: missedEra(s) ? MARKET.eraPenalty : 1 };
}

function processCategory(s, cat, ctx, settle) {
  const size = marketSize(s, cat);
  const prods = s.products.filter((p) => p.cat === cat);
  const byOwner = {};
  if (!size || !prods.length) {
    for (const p of prods) { p.revenue = 0; p.serverCost = 0; }
    s.shares[cat] = { size, byOwner, others: size };
    return;
  }
  const k = MARKET.shareExponent;
  const oth = Math.pow(othersScore(s, cat), k);
  const targets = new Map(prods.map((p) => [p, 0]));
  for (const a of AUDIENCES) {
    const seg = size * TYPE[cat].audience[a.id];
    if (seg <= 0) continue;
    // Produkte derselben Firma kannibalisieren sich: Firmen-Score = bestes Produkt + 25 % der übrigen
    const raw = prods.map((p) => Math.pow(score(s, p, a.id, ctx), k));
    const owners = new Map();
    prods.forEach((p, i) => {
      const o = owners.get(p.owner) || { max: 0, sum: 0 };
      o.max = Math.max(o.max, raw[i]);
      o.sum += raw[i];
      owners.set(p.owner, o);
    });
    let total = oth;
    for (const o of owners.values()) { o.eff = o.max + 0.25 * (o.sum - o.max); total += o.eff; }
    prods.forEach((p, i) => {
      const o = owners.get(p.owner);
      const share = (o.eff / total) * (raw[i] / o.sum);
      let t = share * seg * Math.min(1, Math.pow(priceFactor(s, p, a.id), 0.4));
      const g = TYPE[cat].group;
      if (g === 'desktop' || g === 'mobile') t = Math.min(t, seg * productReach(s, p));
      targets.set(p, targets.get(p) + t);
    });
  }
  let used = 0;
  for (const p of prods) {
    const prev = p.users;
    const target = targets.get(p);
    if (settle) p.users = target;
    else if (target > p.users) p.users += (target - p.users) * MARKET.adoption;
    else p.users -= (p.users - target) * MARKET.decline;
    p.target = target;
    p.revenue = settle ? weeklyRevenue(s, p, p.users) : weeklyRevenue(s, p, prev);
    p.serverCost = serverCostOf(s, p);
    p.share = p.users / size;
    p.newUsers = Math.max(0, p.users - prev);
    byOwner[p.owner] = (byOwner[p.owner] || 0) + p.users;
    used += p.users;
  }
  s.shares[cat] = { size, byOwner, others: Math.max(0, size - used) };
}

export function tickMarket(s, settle = false) {
  const ctx = ctxFor(s);
  for (const cat of OS_CATS) processCategory(s, cat, ctx, settle);
  computeReach(s);
  for (const cat of OTHER_CATS) processCategory(s, cat, ctx, settle);
  // Hype & Kampagnen-Boost klingen ab
  for (const p of s.products) p.hype = Math.max(0, p.hype * 0.95 - 0.2);
}

export function settleMarket(s) {
  computeReach(s);
  tickMarket(s, true);
  tickMarket(s, true);
}

export const categoryShare = (s, cat, owner = 'player') => {
  const sh = s.shares[cat];
  return sh && sh.size ? (sh.byOwner[owner] || 0) / sh.size : 0;
};
