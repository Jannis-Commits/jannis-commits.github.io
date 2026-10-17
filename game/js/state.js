import { START } from '../config/formulas.js';
import { DEFAULTS } from '../config/parts.js';
import { DIFFICULTY, DEFAULT_DIFFICULTY } from '../config/difficulty.js';

export const SAVE_KEY = 'aicg-save-v3';
export const OLD_SAVE_KEY = 'aicg-save';
export const SAVE_VERSION = 3;

export function newGame(seed = Date.now(), difficulty = DEFAULT_DIFFICULTY) {
  return {
    version: SAVE_VERSION,
    difficulty,
    week: 0,
    money: DIFFICULTY[difficulty]?.money ?? START.money,
    rng: seed | 0,
    rep: 0,
    location: START.location,
    machines: [{ id: 1, name: 'Laptop', chassis: 'laptop', ...DEFAULTS.laptop, nic: 'gbe', gpus: [], count: 1, role: 'train' }],
    cloud: [],                 // Cloud-Gruppen: { id, offer, n, role }
    market: { consumer: 1, pro: 1, dc: 1, until: 0 },
    phasesSeen: 0,
    staff: { researcher: 0, ml: 0, infra: 0, data: 0, sales: 0 },
    research: { done: ['logreg'], current: null, progress: 0, queue: [], bonus: 0 },
    datasets: [],
    models: [],
    job: null,                 // laufendes Training (Pretraining, Post-Training, Distillation)
    quick: [],                 // Quantisierung & Evals
    contracts: [],
    apps: {},                  // task -> modelId (nur kleine Modelle, LLMs laufen über Produkte)
    chat: { modelId: null, price: 20, free: 0, paid: 0 },
    api: { modelId: null, price: 20, tokens: 0 },
    openSourced: [],
    funding: { round: 0, equity: 1, raised: 0, history: [] },
    fundingReady: false,
    goal: 0,
    pending: [],               // Ereignisse mit Entscheidung
    stats: { delivered: 0, upgrades: 0 },
    subs: [],                  // Stammkunden: { id, client, task, weekly, until }
    settings: { autoResearch: true, autoQuant: true, autoScale: true },
    overloadWarned: false,
    seenRivals: 0,
    nextId: 2,
    negWeeks: 0,
    gameOver: false,
    log: [],
    lastWeek: null,
  };
}

function migrate(s) {
  // Neue Felder kommen aus newGame(), alte Werte bleiben erhalten
  return { ...newGame(), ...s, version: SAVE_VERSION };
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

// Gab es einen Spielstand der alten Version (vor dem Hardware-Umbau)?
export function hasOldSave() {
  try { return !!localStorage.getItem(OLD_SAVE_KEY); } catch { return false; }
}

export function dropOldSave() {
  try { localStorage.removeItem(OLD_SAVE_KEY); } catch { /* egal */ }
}

export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* Speicher voll oder blockiert – Spiel läuft weiter */
  }
}

export function exportSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importSave(text) {
  const t = text.trim();
  const json = t.startsWith('{') ? t : decodeURIComponent(escape(atob(t)));
  const s = JSON.parse(json);
  if (typeof s.week !== 'number' || typeof s.money !== 'number') throw new Error('Kein gültiger Spielstand');
  if ((s.version || 1) < 3) throw new Error('Spielstand aus einer alten Version (vor dem Hardware-Umbau)');
  return migrate(s);
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ }
}
