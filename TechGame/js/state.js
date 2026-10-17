// Spielstand: Erzeugen, Speichern, Laden, Migration, Export/Import.
import { START, ECOSYSTEM } from '../config/balance.js';
import { initRivals } from './engine/rivals.js';
import { refreshApplicants, makeFounder } from './engine/staff.js';
import { settleMarket } from './engine/market.js';
import { resetFxCache } from './engine/core.js';

export const SAVE_KEY = 'swtycoon-save';
export const META_KEY = 'swtycoon-meta';
export const SAVE_VERSION = 1;
export const GAME_VERSION = '1.0.0';

export function newGame(meta = loadMeta(), seed = (Date.now() ^ (Math.random() * 1e9)) | 0) {
  const boosts = [...(meta.boosts || [])];
  const has = (id) => boosts.includes(id);
  const s = {
    version: SAVE_VERSION,
    seed,
    rng: seed,
    week: 0,
    companyName: 'Meine Firma',
    money: START.money * (has('money') ? 3 : 1),
    rep: START.reputation + (has('rep') ? 20 : 0),
    fans: 0,
    office: has('garage') ? 1 : START.office,
    hardware: START.hardware,
    staff: [],
    applicants: [],
    applicantsWeek: 0,
    crunch: false,
    projects: [],
    products: [],
    research: { done: [], current: null, progress: {} },
    rivals: [],
    shares: {},
    reach: {},
    finance: {
      loans: [], investor: null, offer: null, roundsDone: [], ownedShare: 1,
      ipo: false, ipoWeek: null, sentiment: 1, history: [], revHist: [], value: START.money,
    },
    eco: { desktop: { devs: 0, apps: 0 }, mobile: { devs: 0, apps: 0 }, storeCut: ECOSYSTEM.storeCutDefault },
    campaigns: [],
    flags: {},
    events: { cooldown: {}, seen: {} },
    queue: [],            // Modals, die angezeigt werden müssen (Events, Ären, Sieg …)
    antitrust: 0,
    era: 'desktop',
    tutorial: { ack: {}, hidden: false },
    log: [],
    report: null,
    negWeeks: 0,
    gameOver: null,
    won: false,
    stats: { released: 0, peakValue: 0, bestProduct: null },
    boosts,
    prestige: meta.prestige || 0,
    nextId: 1,
    debug: false,
  };
  resetFxCache();
  s.staff.push(makeFounder(s));
  initRivals(s);
  refreshApplicants(s);
  settleMarket(s);
  return s;
}

// Migrationen: Schlüssel = Zielversion. Werden der Reihe nach angewendet.
const MIGRATIONS = {
  // 2: (s) => { s.neuesFeld = 0; },
};

function migrate(raw) {
  let s = raw;
  const from = s.version || 1;
  for (let v = from + 1; v <= SAVE_VERSION; v++) MIGRATIONS[v]?.(s);
  s.version = SAVE_VERSION;
  resetFxCache();
  return s;
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function save(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ }
}

export function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY)) || { prestige: 0, boosts: [] };
  } catch {
    return { prestige: 0, boosts: [] };
  }
}

export function saveMeta(meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* egal */ }
}

// Export als Text-Code (Base64 von JSON, inkl. Prestige-Meta)
export function exportSave(s) {
  const json = JSON.stringify({ save: s, meta: loadMeta() });
  return 'SWT1:' + btoa(unescape(encodeURIComponent(json)));
}

export function importSave(text) {
  let t = text.trim();
  if (t.startsWith('SWT1:')) t = t.slice(5);
  const json = t.startsWith('{') ? t : decodeURIComponent(escape(atob(t)));
  const data = JSON.parse(json);
  const s = data.save || data;
  if (typeof s.week !== 'number' || typeof s.money !== 'number' || !Array.isArray(s.staff)) throw new Error('Kein gültiger Spielstand');
  if (data.meta) saveMeta(data.meta);
  return migrate(s);
}
