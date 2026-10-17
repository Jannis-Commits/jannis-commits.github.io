// Rivalen-KI: wachsen, releasen Produkte nach Strategie, Preiskampf, Übernahmen, Pleiten.
import { RIVALS as RCFG, FINANCE } from '../../config/balance.js';
import { RIVALS, RIVAL, STRATEGIES } from '../../config/rivals.js';
import { TYPE } from '../../config/productTypes.js';
import { MODEL } from '../../config/businessModels.js';
import { PLATFORMS } from '../../config/platforms.js';
import { clamp, stepAt } from '../util/math.js';
import { rand, gauss, randInt, chance, pick } from '../util/rng.js';
import { nid, yf, year, sIdx, note, log } from './core.js';
import { ratingFor, freshness, refPrice, categoryShare } from './market.js';

export function initRivals(s) {
  s.rivals = RIVALS.map((r) => ({
    id: r.id, name: r.name, color: r.color, strategy: r.strategy, fictional: !!r.fictional,
    active: false, alive: true, cash: r.cash, staff: r.staff, rep: r.rep,
    value: 0, revenue: 0, costs: 0, revHist: [], valueHist: [], dev: [], ownedBy: null, priceWarWeek: -99,
  }));
  for (const r of s.rivals) if (RIVAL[r.id].founded <= yf(s)) activate(s, r, true);
}

function activate(s, r, initial) {
  r.active = true;
  const cfg = RIVAL[r.id];
  cfg.focus.forEach((f, i) => {
    if (focusOpen(s, f)) releaseRival(s, r, i, initial ? -randInt(s, 10, Math.round(TYPE[f.cat].lifetime * 0.6)) : s.week);
  });
  if (!initial) note(s, '🏁', `Neuer Konkurrent: ${r.name} betritt den Markt.`);
}

function focusOpen(s, f) {
  return yf(s) >= f.from && yf(s) >= TYPE[f.cat].year && (!f.until || yf(s) < f.until);
}

const modelFor = (s, f) => (Array.isArray(f.model) ? stepAt(f.model, yf(s)) : f.model);

function platformsFor(s, r, cat, provides) {
  const g = TYPE[cat].group;
  if (g === 'web') return ['web'];
  if (g !== 'desktop' && g !== 'mobile') return [];
  // eigenes OS zuerst, dann die reichweitenstärksten Plattformen
  const own = s.products.filter((p) => p.owner === r.id && p.provides && TYPE[p.cat].group === 'os'
    && ((g === 'desktop' && p.cat === 'os_desktop') || (g === 'mobile' && p.cat === 'os_mobile'))).map((p) => p.provides);
  const cands = PLATFORMS.filter((pl) => pl.group === g && !pl.own).map((pl) => pl.id)
    .filter((id) => (s.reach[id] || 0) > 0.02).sort((a, b) => (s.reach[b] || 0) - (s.reach[a] || 0));
  const n = r.staff > 150 ? 3 : r.staff > 40 ? 2 : 1;
  const out = [...new Set([...own, ...cands])].slice(0, Math.max(n, own.length));
  return out.length ? out : [g === 'mobile' ? 'android' : 'pc'];
}

function rivalQuality(s, r, f, copyQ) {
  const st = STRATEGIES[r.strategy];
  const base = copyQ ?? 50 + st.q + (f.q || 0) + 3 * Math.log10(r.staff + 1) - 3 + (yf(s) - 1985) * 0.12;
  return clamp(gauss(s, base, 5), 20, 97);
}

function releaseRival(s, r, focusIdx, releasedWeek, copy = null) {
  const cfg = RIVAL[r.id];
  const f = copy ? copy.focus : cfg.focus[focusIdx];
  const st = STRATEGIES[r.strategy];
  const t = TYPE[f.cat];
  let model = modelFor(s, f);
  if (!t.models.includes(model)) model = t.models[0];
  const old = s.products.find((p) => p.owner === r.id && p.focusIdx === focusIdx && p.cat === f.cat);
  const q = rivalQuality(s, r, f, copy?.q);
  const priceBase = refPrice(f.cat, f.aud, model);
  const price = MODEL[model].hasPrice ? Math.max(0.99, Math.round(priceBase * st.price * (0.9 + rand(s) * 0.2) * 100) / 100) : 0;
  const name = copy ? copy.name : stepAt(f.names, yf(s));
  const prevSame = old && old.baseName === name;
  const version = prevSame ? old.version + 1 : 1;
  const p = {
    id: old ? old.id : nid(s), owner: r.id, focusIdx, baseName: name, name, cat: f.cat, aud: f.aud,
    platforms: platformsFor(s, r, f.cat, f.provides), model, price, quality: q, baseRating: 3, rating: 3, bugs: 0,
    version, released: releasedWeek, users: old ? old.users : 0, hype: old ? 20 : 30, boost: 0,
    revenue: 0, serverCost: 0, share: 0, provides: f.provides || null,
  };
  p.baseRating = p.rating = ratingFor(s, f.cat, q);
  if (old) Object.assign(old, p);
  else s.products.push(p);
  if (releasedWeek === s.week && r.active && s.week > 0) {
    const big = s.products.some((x) => x.owner === 'player' && x.cat === f.cat);
    if (big || version === 1) log(s, '📦', `${r.name} veröffentlicht ${name}${version > 1 ? ' ' + version : ''} (${TYPE[f.cat].name})`);
  }
}

export function valuation(revWeekAvg, prevAvg, rep, cash, debt, extra = 1) {
  const annual = revWeekAvg * 52;
  const growth = prevAvg > 0 ? clamp(revWeekAvg / prevAvg - 1, -0.5, 1) : 0;
  const mult = Math.max(1, FINANCE.valueBaseMultiple + growth * FINANCE.valueGrowthMultiple + (rep / 100) * FINANCE.valueRepMultiple);
  return Math.max(0, annual * mult * extra + cash - debt);
}

export function avgOf(arr, from, to) {
  const xs = arr.slice(Math.max(0, arr.length - to), Math.max(0, arr.length - from));
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function playerBest(s) {
  return s.products.filter((p) => p.owner === 'player' && TYPE[p.cat].group !== 'store' && TYPE[p.cat].group !== 'os')
    .sort((a, b) => b.revenue - a.revenue)[0];
}

export function tickRivals(s) {
  const yr = yf(s);
  for (const r of s.rivals) {
    if (!r.alive) continue;
    if (!r.active) {
      if (RIVAL[r.id].founded <= yr) activate(s, r, false);
      continue;
    }
    const cfg = RIVAL[r.id];
    const st = STRATEGIES[r.strategy];
    const prods = s.products.filter((p) => p.owner === r.id);
    const revenue = prods.reduce((a, p) => a + p.revenue, 0);
    const server = prods.reduce((a, p) => a + p.serverCost, 0);
    const salary = 650 * sIdx(s) * RCFG.salaryOverhead * (st.cost ?? 1);
    const costs = r.staff * salary + server;
    r.revenue = revenue;
    r.costs = costs;
    r.cash += revenue - costs;
    r.revHist.push(revenue);
    if (r.revHist.length > 30) r.revHist.shift();

    // Personal wächst mit dem Umsatz
    const target = Math.max(4, (revenue * 0.55) / salary);
    const step = clamp((target - r.staff) * 0.05, -r.staff * RCFG.staffGrowth, r.staff * RCFG.staffGrowth + 0.3);
    r.staff = Math.max(3, r.staff + step);

    // Ruf folgt den Bewertungen
    if (prods.length) {
      const avgR = prods.reduce((a, p) => a + p.rating, 0) / prods.length;
      r.rep = clamp(r.rep + ((20 + (avgR - 2.5) * 20 + Math.log10(1 + revenue) * 2) - r.rep) * 0.01, 5, 95);
    }

    // laufende Entwicklungen
    for (const d of [...r.dev]) {
      d.weeksLeft--;
      if (d.weeksLeft <= 0) {
        r.dev = r.dev.filter((x) => x !== d);
        if (d.copy) releaseRival(s, r, d.focusIdx, s.week, d.copy);
        else if (focusOpen(s, cfg.focus[d.focusIdx])) releaseRival(s, r, d.focusIdx, s.week);
      }
    }
    // neue Entwicklungen
    if (r.cash > -salary * r.staff * 4) {
      cfg.focus.forEach((f, i) => {
        if (r.dev.some((d) => d.focusIdx === i)) return;
        const existing = prods.find((p) => p.focusIdx === i && p.cat === f.cat);
        if (f.until && yr >= f.until) {
          if (existing) s.products = s.products.filter((p) => p !== existing);
          return;
        }
        if (!focusOpen(s, f)) return;
        const name = stepAt(f.names, yr);
        const needs = !existing || freshness(s, existing) < RCFG.releaseFreshness || existing.baseName !== name;
        if (needs) r.dev.push({ focusIdx: i, weeksLeft: Math.round(randInt(s, ...RCFG.devWeeks) * st.speed) });
      });
    }
    // Kopierer: bauen dein bestes Produkt nach
    if (r.strategy === 'copycat' && !r.dev.length && chance(s, 0.03)) {
      const best = playerBest(s);
      if (best && best.revenue > 500 * sIdx(s) && !prods.some((p) => p.cat === best.cat)) {
        const idx = 100 + randInt(s, 0, 1e6);
        r.dev.push({ focusIdx: idx, weeksLeft: Math.round(randInt(s, 8, 14)), copy: {
          q: Math.max(25, best.quality - 6), name: best.name.slice(0, 4) + pick(s, ['ix', 'ify', 'Clone', 'Pro', 'X']),
          focus: { cat: best.cat, aud: best.aud, model: TYPE[best.cat].models.includes('oneTime') ? 'oneTime' : best.model, names: [[1985, '']] },
        } });
      }
    }
    // Preiskampf, wenn du ihnen Anteile wegnimmst
    if (st.price < 0.9 && s.week - r.priceWarWeek > 26) {
      for (const p of prods) {
        if (!MODEL[p.model].hasPrice) continue;
        if (categoryShare(s, p.cat, 'player') > categoryShare(s, p.cat, r.id) && categoryShare(s, p.cat, 'player') > 0.05) {
          p.price = Math.max(refPrice(p.cat, p.aud, p.model) * 0.35, p.price * RCFG.priceWarDrop);
          r.priceWarWeek = s.week;
          note(s, '🏷️', `${r.name} senkt die Preise für ${p.name} – Preiskampf!`);
          break;
        }
      }
    }

    const debt = 0;
    r.value = valuation(avgOf(r.revHist, 0, 13), avgOf(r.revHist, 13, 26), r.rep, r.cash, debt);
    r.valueHist.push(r.value);
    if (r.valueHist.length > 120) r.valueHist.shift();

    // Pleite
    if (r.cash < 0 && RIVAL[r.id].protected) r.staff = Math.max(3, r.staff * 0.97);   // Entlassungen statt Pleite
    else if (r.cash < -(revenue * 26 + 2e5 * sIdx(s)) && revenue < costs) {
      r.alive = false;
      s.products = s.products.filter((p) => p.owner !== r.id);
      note(s, '💀', `${r.name} ist pleite und verschwindet vom Markt.`);
    }
  }
  rivalAcquisitions(s);
}

function rivalAcquisitions(s) {
  const alive = s.rivals.filter((r) => r.alive && r.active);
  for (const buyer of alive) {
    const st = STRATEGIES[buyer.strategy];
    if (!st.buy || !chance(s, RCFG.buyChance * st.buy)) continue;
    const targets = alive.filter((t) => t !== buyer && !RIVAL[t.id].protected && t.value < buyer.value * 0.06 && t.value > 0
      && buyer.cash > t.value * 1.3 && yf(s) - Math.max(1985, RIVAL[t.id].founded) >= RCFG.buyMinAgeYears);
    if (!targets.length) continue;
    const t = pick(s, targets);
    buyer.cash -= t.value * 1.3;
    absorb(s, t, buyer.id);
    note(s, '🤝', `${buyer.name} übernimmt ${t.name}.`);
  }
}

// Firma t wird von owner übernommen: Produkte wechseln den Besitzer
export function absorb(s, t, owner) {
  t.alive = false;
  t.ownedBy = owner;
  for (const p of s.products) {
    if (p.owner !== t.id) continue;
    p.owner = owner;
    p.focusIdx = 1000 + p.id;
    if (owner === 'player') {
      p.features = p.features || [];
      p.patch = 0;
      p.fixed = 0;
      p.preinstall = false;
    }
  }
}

export function acquisitionPrice(s, r) {
  return Math.round(r.value * 1.35 + 1e5 * sIdx(s));
}

export function buyRival(s, id) {
  const r = s.rivals.find((x) => x.id === id);
  if (!r || !r.alive || !r.active) return 'Nicht verfügbar';
  const price = acquisitionPrice(s, r);
  if (s.money < price) return 'Zu wenig Geld';
  if (r.value > s.finance.value * 0.8) return 'Die Firma ist zu groß für dich';
  s.money -= price;
  s.money += Math.max(0, r.cash) * 0.5;
  absorb(s, r, 'player');
  note(s, '🤝', `Du hast ${r.name} übernommen!`, true);
  return null;
}

export function ranking(s) {
  const list = s.rivals.filter((r) => r.alive && r.active).map((r) => ({ id: r.id, name: r.name, value: r.value, color: r.color }));
  list.push({ id: 'player', name: s.companyName, value: s.finance.value, color: '#2563eb' });
  return list.sort((a, b) => b.value - a.value);
}

export const playerRank = (s) => ranking(s).findIndex((x) => x.id === 'player') + 1;

export { STRATEGIES };
