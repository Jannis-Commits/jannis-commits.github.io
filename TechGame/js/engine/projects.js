// Projekte: Anlegen, Phasen (Konzept → Entwicklung → Testing → Release), Qualität, Bugs, Updates, Support.
import { WORK, QUALITY, BUGS, REPUTATION, STAFF } from '../../config/balance.js';
import { TYPE, expectedFeatures } from '../../config/productTypes.js';
import { FEATURE } from '../../config/features.js';
import { MODEL } from '../../config/businessModels.js';
import { clamp } from '../util/math.js';
import { gauss, pick } from '../util/rng.js';
import { nid, yf, wIdx, sIdx, fx, hasTech, note, log, catUnlocked, staffById, productById, projectById } from './core.js';
import { basePoints, roleKey, gainXp } from './staff.js';
import { techFit } from './research.js';
import { ratingFor, refPrice, platformsFor } from './market.js';

export const PHASES = {
  concept: { name: 'Konzept', icon: '💡' },
  dev: { name: 'Entwicklung', icon: '⌨️' },
  test: { name: 'Testing', icon: '🐞' },
};

const NAME_PARTS = {
  tool: [['Quick', 'Super', 'Turbo', 'Easy', 'Smart', 'Hyper', 'Pro'], ['Disk', 'Zip', 'Calc', 'File', 'Clean', 'Sync', 'Tool']],
  game: [['Space', 'Dungeon', 'Pixel', 'Galaxy', 'Dragon', 'Neon', 'Shadow'], ['Quest', 'Raiders', 'Legends', 'Racer', 'Empire', 'Craft', 'Wars']],
  office: [['Word', 'Text', 'Office', 'Smart', 'Team', 'Doc'], ['Star', 'Works', 'Suite', 'Pro', 'Pad', 'One']],
  database: [['Data', 'Base', 'Iron', 'Quick', 'Hyper', 'Core'], ['Base', 'SQL', 'Store', 'Vault', 'Server', 'DB']],
  browser: [['Net', 'Web', 'Sky', 'Fox', 'Light', 'Orbit'], ['Surfer', 'Scout', 'Navigator', 'Voyager', 'Wave', 'Lens']],
  web_service: [['Find', 'Friend', 'Hello', 'Spot', 'Buzz', 'Loop'], ['ly', 'Hub', 'Book', 'Space', 'Feed', 'Zone']],
  os_desktop: [['Nova', 'Astra', 'Core', 'Blue', 'Zen', 'Atlas'], ['OS', 'DOS', 'System', 'Windows', 'X', 'One']],
  mobile_app: [['Snap', 'Tap', 'Swipe', 'Pocket', 'Happy', 'Insta'], ['Chat', 'Pic', 'Fit', 'Go', 'Pay', 'Play']],
  os_mobile: [['Nova', 'Astra', 'Blue', 'Zen', 'Pocket', 'Atlas'], ['Mobile', 'Touch', 'OS', 'Phone', 'Go', 'Air']],
  cloud: [['Sky', 'Nimbus', 'Cloud', 'Stack', 'Cirrus', 'Hyper'], ['Cloud', 'Compute', 'Services', 'Platform', 'Grid', 'Scale']],
  ai: [['Mind', 'Sage', 'Nova', 'Echo', 'Muse', 'Atlas'], ['AI', 'GPT', 'Pilot', 'Brain', 'Assist', 'Chat']],
  app_store: [['App', 'Nova', 'Star', 'Mega', 'Blue', 'Pocket'], ['Store', 'Market', 'Shop', 'Plaza', 'Hub', 'Mall']],
};

export function suggestName(s, cat) {
  const [a, b] = NAME_PARTS[cat] || NAME_PARTS.tool;
  return `${pick(s, a)}${pick(s, b)}`;
}

export function defaultModel(cat) {
  return TYPE[cat].models[0];
}

export function defaultPrice(cat, aud, model) {
  const r = refPrice(cat, aud, model);
  return r >= 10 ? Math.round(r) : Math.round(r * 100) / 100;
}

export function maxPlatforms(s) {
  return 1 + fx(s, 'maxPlatforms');
}

export function projectWork(s, f) {
  const t = TYPE[f.cat];
  const effort = (f.features || []).reduce((a, id) => a + (FEATURE[id]?.effort || 0), 0);
  const nPl = Math.max(1, (f.platforms || []).length);
  let w = t.work * wIdx(s) * (1 + effort) * (1 + WORK.extraPlatform * (nPl - 1));
  if (f.baseProductId) w *= WORK.updateWorkFactor;
  return w;
}

export function featureScore(s, cat, aud, features) {
  const ai = { p: 0, b: 1, d: 2 }[aud];
  const sum = (features || []).reduce((a, id) => a + (FEATURE[id]?.fit[ai] || 0), 0);
  return clamp(sum / expectedFeatures(yf(s)), 0, 1.15);
}

export function budgetCost(s, p) {
  const lvl = WORK.budgetLevels[p.budget || 0];
  return Math.round(lvl.cost * sIdx(s) * Math.sqrt(TYPE[p.cat].work / 4));
}

export function validateForm(s, f) {
  if (!f.cat || !catUnlocked(s, f.cat) && !f.baseProductId) return 'Kategorie nicht verfügbar';
  const t = TYPE[f.cat];
  if ((t.group === 'desktop' || t.group === 'mobile') && !(f.platforms || []).length) return 'Wähle eine Plattform';
  if ((f.platforms || []).length > maxPlatforms(s)) return `Maximal ${maxPlatforms(s)} Plattform(en) – mehr per Forschung`;
  if (!f.features?.length) return 'Wähle mindestens ein Feature';
  if (!t.models.includes(f.model)) return 'Geschäftsmodell passt nicht';
  return null;
}

export function createProject(s, f) {
  const err = validateForm(s, f);
  if (err) return err;
  const base = f.baseProductId ? productById(s, f.baseProductId) : null;
  const t = TYPE[f.cat];
  const p = {
    id: nid(s),
    name: (f.name || '').trim() || suggestName(s, f.cat),
    cat: f.cat, aud: f.aud, platforms: t.group === 'desktop' || t.group === 'mobile' ? [...f.platforms] : t.group === 'web' ? ['web'] : [],
    features: [...f.features], model: f.model, price: MODEL[f.model].hasPrice ? Math.max(0, +f.price || 0) : 0,
    budget: f.budget || 0, testWeeks: clamp(f.testWeeks ?? 2, 1, 12),
    phase: 'concept', work: projectWork(s, f), progress: 0, testDone: 0,
    bugs: 0, ptsTotal: 0, ptsSkill: 0, ptsDesign: 0, hype: 0,
    baseProductId: base ? base.id : null, version: base ? base.version + 1 : 1, started: s.week,
  };
  if (base) p.name = base.name;
  s.projects.push(p);
  for (const id of f.team || []) {
    const m = staffById(s, id);
    if (m) m.assign = `p:${p.id}`;
  }
  return null;
}

export function cancelProject(s, id) {
  s.projects = s.projects.filter((p) => p.id !== id);
  for (const m of s.staff) if (m.assign === `p:${id}`) m.assign = null;
  s.campaigns = s.campaigns.filter((c) => !(c.kind === 'project' && c.targetId === id));
}

export const teamOf = (s, p) => s.staff.filter((m) => m.assign === `p:${p.id}`);

function phaseKey(p) {
  return p.phase === 'test' ? 'test' : p.phase;
}

export function memberPoints(s, m, p) {
  const w = WORK.roleWeight[phaseKey(p)][roleKey(m)] ?? 0.3;
  let pts = basePoints(s, m) * w * (1 + fx(s, 'devSpeed')) * (1 + WORK.budgetLevels[p.budget || 0].speed);
  if (m.role === 'design' && !m.founder) pts *= 1 + fx(s, 'designSpeed');
  return pts;
}

export function teamPoints(s, p) {
  return teamOf(s, p).reduce((a, m) => a + memberPoints(s, m, p), 0);
}

export function projectEta(s, p) {
  const pts = teamPoints(s, p);
  if (p.phase === 'test') return p.testWeeks - p.testDone;
  if (pts <= 0) return Infinity;
  return (p.work - p.progress) / pts + p.testWeeks;
}

function bugRate(s, m) {
  return BUGS.perPoint * (1 - (m.skill / 100) * BUGS.skillReduce) * (s.crunch ? 1.9 : 1) * Math.max(0.2, 1 - fx(s, 'bugs'));
}

export function tickProjects(s) {
  for (const p of [...s.projects]) {
    const team = teamOf(s, p);
    s.report.budget = (s.report.budget || 0) + budgetCost(s, p);
    if (!team.length) continue;
    const before = p.phase;
    let pts = 0;
    for (const m of team) {
      const mp = memberPoints(s, m, p);
      pts += mp;
      gainXp(s, m, mp);
      if (p.phase === 'test') {
        p.bugs = Math.max(0, p.bugs - mp * BUGS.qaFixPerPoint * (m.role === 'qa' ? 1.3 : 1));
      } else {
        p.ptsTotal += mp;
        p.ptsSkill += mp * m.skill;
        if (m.role === 'design' || (m.founder && p.phase === 'concept')) p.ptsDesign += mp * (m.founder ? 0.7 : 1);
        if (p.phase === 'dev') p.bugs += mp * bugRate(s, m);
      }
    }
    if (p.phase !== 'test') {
      p.progress += pts;
      if (p.phase === 'concept' && p.progress >= p.work * WORK.phaseShare.concept) p.phase = 'dev';
      if (p.progress >= p.work) { p.progress = p.work; p.phase = 'test'; }
    } else {
      p.testDone++;
      if (p.testDone >= p.testWeeks) { releaseProject(s, p); continue; }
    }
    if (before !== p.phase && p.phase === 'test') note(s, '🐞', `${p.name}: Entwicklung fertig – jetzt im Testing (${Math.round(p.bugs)} Bugs).`, true);
  }
}

export function estimateQuality(s, p) {
  const t = TYPE[p.cat];
  const tot = Math.max(0.001, p.ptsTotal);
  const skill = p.ptsTotal ? p.ptsSkill / tot / 100 : (teamOf(s, p).reduce((a, m) => a + m.skill, 0) / Math.max(1, teamOf(s, p).length)) / 100;
  const ratio = p.ptsTotal ? p.ptsDesign / tot : t.designIdeal;
  const dBal = clamp(1 - Math.abs(ratio - t.designIdeal) * 2.5, 0.2, 1);
  const feat = featureScore(s, p.cat, p.aud, p.features);
  const tech = techFit(s, p.cat);
  let q = 22 + 62 * Math.pow(skill, 0.9) * (0.55 + 0.45 * dBal) * (0.55 + 0.45 * feat) * (0.7 + 0.3 * tech);
  q += WORK.budgetLevels[p.budget || 0].quality + fx(s, 'quality');
  q -= Math.min(QUALITY.maxBugPenalty, p.bugs * QUALITY.bugPenaltyPerBug);
  return { q: clamp(q, 5, 100), skill, dBal, feat, tech };
}

export function releaseNow(s, id) {
  const p = projectById(s, id);
  if (!p || p.phase !== 'test') return 'Erst nach der Entwicklung möglich';
  releaseProject(s, p);
  return null;
}

export function releaseProject(s, p) {
  const t = TYPE[p.cat];
  const est = estimateQuality(s, p);
  const quality = clamp(est.q + gauss(s, 0, 2.5), 5, 100);
  const baseRating = ratingFor(s, p.cat, quality);
  const bugs = Math.round(p.bugs);
  s.projects = s.projects.filter((x) => x !== p);
  for (const m of s.staff) if (m.assign === `p:${p.id}`) m.assign = null;
  for (const c of s.campaigns) if (c.kind === 'project' && c.targetId === p.id) { c.kind = 'product'; }

  let prod = p.baseProductId ? productById(s, p.baseProductId) : null;
  const provides = t.id === 'os_desktop' ? 'own' : t.id === 'os_mobile' ? 'own_mobile' : null;
  if (prod) {
    // Update: Upgrade-Verkäufe bei Einmalkauf
    if (prod.model === 'oneTime') s.money += prod.users * 0.2 * p.price * 0.5;
    Object.assign(prod, {
      version: p.version, quality, baseRating, bugs, features: p.features, platforms: p.platforms,
      model: p.model, price: p.price, released: s.week, hype: prod.hype + p.hype + 10, patch: 0, fixed: 0,
    });
  } else {
    prod = {
      id: nid(s), owner: 'player', name: p.name, cat: p.cat, aud: p.aud, platforms: p.platforms, features: p.features,
      model: p.model, price: p.price, quality, baseRating, rating: baseRating, bugs, patch: 0, fixed: 0,
      version: 1, released: s.week, users: 0, hype: p.hype + 10, boost: 0, preinstall: false,
      revenue: 0, serverCost: 0, share: 0, provides: provides && !s.products.some((x) => x.provides === provides) ? provides : null,
    };
    s.products.push(prod);
    prod.users = Math.min(s.fans * 0.15, 1e9);
  }
  for (const c of s.campaigns) if (c.kind === 'product' && c.targetId === p.id) c.targetId = prod.id;
  updateRating(s, prod);
  s.stats.released++;
  const r = Math.round(prod.rating);
  s.rep = clamp(s.rep + (REPUTATION.fromRating[r] || 0), 0, 100);
  note(s, '🎉', `Release: ${prod.name}${prod.version > 1 ? ' v' + prod.version : ''} – Qualität ${Math.round(quality)}, ${prod.rating.toFixed(1)} ★${bugs ? `, ${bugs} Bugs` : ''}`, true);
  if (!s.stats.bestProduct || quality > s.stats.bestProduct.q) s.stats.bestProduct = { name: prod.name, q: Math.round(quality), year: Math.floor(yf(s)) };
}

export function updateRating(s, p) {
  const pen = Math.min(BUGS.maxRatingPenalty, p.bugs * BUGS.ratingPenaltyPerBug);
  p.rating = clamp(p.baseRating - pen - (MODEL[p.model].ratingMalus || 0), 1, 5);
}

// Support: zugewiesene MA fixen Bugs veröffentlichter Produkte, Nutzer finden neue Bugs
export function tickSupport(s) {
  for (const p of s.products) {
    if (p.owner !== 'player') continue;
    if (TYPE[p.cat].group !== 'store') p.bugs += Math.sqrt(p.users / 1e6) * 0.6 * Math.max(0.2, 1 - fx(s, 'bugs'));
    const team = s.staff.filter((m) => m.assign === `s:${p.id}`);
    let fixed = 0;
    for (const m of team) {
      const pts = basePoints(s, m) * (WORK.roleWeight.test[roleKey(m)] ?? 0.4);
      fixed += pts * BUGS.supportFixPerPoint * (1 + fx(s, 'supportFix'));
      gainXp(s, m, pts * 0.7);
    }
    fixed = Math.min(fixed, p.bugs);
    p.bugs -= fixed;
    p.fixed = (p.fixed || 0) + fixed;
    if (p.fixed >= BUGS.patchEvery || (p.bugs < 0.5 && p.fixed >= 1)) {
      p.patch++;
      p.fixed = 0;
      log(s, '🩹', `Patch ${p.version}.0.${p.patch} für ${p.name} veröffentlicht`);
    }
    updateRating(s, p);
  }
}

// Auftragsarbeit für Geld nebenbei
export function freelanceIncome(s) {
  let inc = 0;
  for (const m of s.staff) {
    if (m.assign !== 'freelance') continue;
    inc += m.founder ? STAFF.founderFreelance * sIdx(s) * (0.6 + m.skill / 100) : m.salary * STAFF.freelanceRate;
  }
  return inc;
}

export function updateForm(s, productId) {
  const p = productById(s, productId);
  if (!p) return null;
  return {
    step: 1, cat: p.cat, aud: p.aud, platforms: (p.platforms || []).filter((pl) => platformsFor(s, p.cat).some((x) => x.id === pl) || TYPE[p.cat].group === 'web'),
    features: [...(p.features || [])], model: p.model, price: p.price, budget: 1, testWeeks: 2, team: [], name: p.name, baseProductId: p.id,
  };
}

export const projectsUsingFeature = (s, id) => s.projects.filter((p) => p.features.includes(id));
export { hasTech };
