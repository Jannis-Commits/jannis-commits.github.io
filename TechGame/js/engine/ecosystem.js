// Ökosystem: eigenes OS ↔ Drittentwickler ↔ Apps (Netzwerkeffekt), App-Store-Provision, Kartellrisiko.
import { ECOSYSTEM } from '../../config/balance.js';
import { TYPE } from '../../config/productTypes.js';
import { curve, clamp } from '../util/math.js';
import { yf, fx, note } from './core.js';

// Apps auf den etablierten Konkurrenz-Plattformen (Vergleichsgröße)
const RIVAL_APPS = {
  desktop: [[1985, 400], [1995, 15000], [2005, 80000], [2015, 150000], [2030, 220000]],
  mobile: [[2005, 500], [2008, 5000], [2012, 700000], [2020, 2.5e6], [2030, 3.5e6]],
};

const groupOf = (cat) => (cat === 'os_mobile' ? 'mobile' : 'desktop');
const ownPlatforms = (s, group) => s.products.filter((p) => p.owner === 'player' && p.cat === (group === 'mobile' ? 'os_mobile' : 'os_desktop')).map((p) => p.provides);

export const rivalApps = (s, group) => curve(RIVAL_APPS[group], yf(s), true);

export function firstPartyApps(s, group) {
  const plats = ownPlatforms(s, group);
  return s.products.filter((p) => p.owner === 'player' && (p.platforms || []).some((pl) => plats.includes(pl))).length * ECOSYSTEM.firstPartyApps;
}

export function totalApps(s, group) {
  return s.eco[group].apps + firstPartyApps(s, group);
}

export function osAppsFactor(s, p) {
  if (p.owner !== 'player') return 1;
  const g = groupOf(p.cat);
  const ratio = (totalApps(s, g) + 20) / rivalApps(s, g);
  return clamp(Math.pow(ratio, 0.25), ...ECOSYSTEM.appsFactorClamp);
}

export const hasStore = (s) => s.products.some((p) => p.owner === 'player' && p.cat === 'app_store');

export function storeRevenue(s) {
  if (!hasStore(s)) return 0;
  const apps = s.eco.desktop.apps + s.eco.mobile.apps;
  return apps * ECOSYSTEM.appRevenuePerWeek(yf(s)) * s.eco.storeCut;
}

export function tickEcosystem(s) {
  const store = hasStore(s);
  const storeProduct = s.products.find((p) => p.owner === 'player' && p.cat === 'app_store');
  for (const g of ['desktop', 'mobile']) {
    const cat = g === 'mobile' ? 'os_mobile' : 'os_desktop';
    const users = s.products.filter((p) => p.owner === 'player' && p.cat === cat).reduce((a, p) => a + p.users, 0);
    const e = s.eco[g];
    if (users <= 0) { e.devs *= 0.97; e.apps *= 0.99; continue; }
    let target = ECOSYSTEM.devBase * Math.pow(users / 1e6, 0.8);
    if (store) target *= ECOSYSTEM.storeBonus * (storeProduct ? 0.6 + storeProduct.quality / 100 : 1);
    target *= 1 + fx(s, 'devs');
    target *= clamp(1 - (s.eco.storeCut - 0.3) * 1.5, 0.4, 1.3);
    if (s.products.some((p) => p.owner === 'player' && (p.features || []).includes('s_devtools'))) target *= 1.2;
    e.devs += (target - e.devs) * ECOSYSTEM.devAdjust;
    e.apps = Math.max(0, e.apps + e.devs * ECOSYSTEM.appsPerDev - e.apps * ECOSYSTEM.appDecay);
  }
  if (storeProduct) {
    storeProduct.revenue = storeRevenue(s);
    storeProduct.users = Math.round(s.eco.desktop.apps + s.eco.mobile.apps);
    storeProduct.serverCost = storeProduct.revenue * 0.05;
  }

  // Kartellrisiko durch Vorinstallation
  const share = Math.max(
    s.shares.os_desktop?.size ? (s.shares.os_desktop.byOwner.player || 0) / s.shares.os_desktop.size : 0,
    s.shares.os_mobile?.size ? (s.shares.os_mobile.byOwner.player || 0) / s.shares.os_mobile.size : 0,
  );
  const pre = s.products.filter((p) => p.owner === 'player' && p.preinstall).length;
  const before = s.antitrust;
  if (pre && share > 0.3) s.antitrust = Math.min(100, s.antitrust + ECOSYSTEM.antitrustPerWeek * pre * share);
  else s.antitrust = Math.max(0, s.antitrust - ECOSYSTEM.antitrustDecay);
  if (before < 40 && s.antitrust >= 40) note(s, '⚖️', 'Die Kartellbehörde schaut sich deine Vorinstallationen genauer an.');
}

export const canPreinstall = (s, p) => p.owner === 'player' && TYPE[p.cat].group !== 'os' && TYPE[p.cat].group !== 'store'
  && s.products.some((o) => o.owner === 'player' && TYPE[o.cat].group === 'os');
