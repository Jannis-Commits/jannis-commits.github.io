import { START } from '../config/formulas.js';
import { INFERENCE } from '../config/products.js';

export const SAVE_KEY = 'aicg-save';
export const SAVE_VERSION = 2;

export function newGame(seed = Date.now()) {
  return {
    version: SAVE_VERSION,
    week: 0,
    money: START.money,
    rng: seed | 0,
    rep: 0,
    location: START.location,
    hardware: { ...START.hardware },
    cloudGpus: 0,
    staff: { engineer: 0, researcher: 0 },
    research: { done: ['logreg'], current: null, progress: 0 },
    datasets: [],
    models: [],
    training: null,
    contracts: [],
    apps: {},             // task -> modelId (nur kleine Modelle, LLMs laufen über Produkte)
    chat: { modelId: null, price: 20, free: 0, paid: 0 },
    api: { modelId: null, price: 20, tokens: 0 },
    openSourced: [],
    inferenceShare: INFERENCE.defaultShare,
    overloadWarned: false,
    seenRivals: 0,
    nextId: 1,
    negWeeks: 0,
    gameOver: false,
    log: [],
    lastWeek: null,       // Zusammenfassung der letzten Runde
  };
}

function migrate(s) {
  // Neue Felder kommen aus newGame(), alte Werte bleiben erhalten
  const out = { ...newGame(), ...s, version: SAVE_VERSION };
  if ((s.version || 1) < 2) delete out.apps.llm;   // v1: LLM-App → jetzt Chat/API-Produkte
  return out;
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
  return migrate(s);
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ }
}
