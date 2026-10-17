import { START } from '../config/formulas.js';

export const SAVE_KEY = 'aicg-save';
export const SAVE_VERSION = 1;

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
    apps: {},             // task -> modelId
    seenRivals: 0,
    nextId: 1,
    negWeeks: 0,
    gameOver: false,
    log: [],
    lastWeek: null,       // Zusammenfassung der letzten Runde
  };
}

function migrate(s) {
  // Zukünftige Versionen: hier Felder ergänzen
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
