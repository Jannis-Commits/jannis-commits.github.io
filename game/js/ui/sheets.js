import { btn, h2, empty, note } from './components.js';
import { eventView } from '../engine/events.js';

export function eventSheet(state) {
  const e = state.pending[0];
  if (!e) return `${empty('Keine offenen Entscheidungen.')}<div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}</div>`;
  const v = eventView(state, e);
  return `<div class="event"><div class="big-ico">${v.icon}</div><h3>${v.title}</h3><p>${v.text}</p></div>
    ${state.pending.length > 1 ? note(`Noch ${state.pending.length - 1} weitere Entscheidung(en).`) : ''}
    <div class="btns col">${v.choices.map((c) => btn(c.label, 'resolve', { id: e.id, c: c.id }, { cls: c.cls || '', disabled: !!c.disabled })).join('')}</div>`;
}

export function settingsSheet(state) {
  return `<h3>Menü</h3>
    ${h2('Spielstand')}
    <div class="sub">Wird nach jeder Aktion automatisch im Browser gespeichert. Mach ab und zu ein Backup.</div>
    <div class="btns">${btn('Backup exportieren', 'export', {}, { cls: 'ghost' })}${btn('Backup importieren', 'openSheet', { kind: 'import' }, { cls: 'ghost' })}</div>
    <div class="btns">${btn('Neues Spiel', 'confirm', { what: 'reset' }, { cls: 'danger' })}</div>
    ${h2('Info')}
    <div class="sub">AI Company · v0.3. 1 Runde = 1 Woche, ein Spieljahr hat 26 Wochen. Echte GPUs & CPUs (Specs gerundet), ab ~2027 Roadmap bzw. fiktiv. Alle Balancing-Werte liegen in <code>game/config/</code>.</div>
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}</div>`;
}

export function importSheet() {
  return `<h3>Backup importieren</h3><div class="sub">Füge den Backup-Text ein. Dein aktueller Spielstand wird überschrieben.</div>
    <div class="label">Backup</div><textarea id="importText" placeholder="Backup-Text hier einfügen"></textarea>
    <div class="btns">${btn('Abbrechen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Importieren', 'doImport')}</div>`;
}

export function exportSheet(state, ui) {
  return `<h3>Backup exportieren</h3><div class="sub">Kopier den Text und speicher ihn z.B. in deinen Notizen.</div>
    <div class="label">Backup</div><textarea id="exportText" readonly>${ui.exportText}</textarea>
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Kopieren', 'copyExport')}${btn('Als Datei', 'downloadExport', {}, { cls: 'ghost' })}</div>`;
}

const CONFIRM = {
  reset: ['Neues Spiel?', 'Dein aktueller Spielstand wird gelöscht.', 'reset'],
  abortJob: ['Training abbrechen?', 'Der bisherige Fortschritt geht verloren.', 'abortJob'],
};

export function confirmSheet(state, ui, sh) {
  const [title, text, act] = CONFIRM[sh.what];
  return `<h3>${title}</h3><div class="sub">${text}</div>
    <div class="btns">${btn('Abbrechen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Ja', act, {}, { cls: 'danger' })}</div>`;
}

export function oldSaveSheet() {
  return `<h3>Großes Update 🎉</h3>
    <div class="sub">AI Company wurde komplett umgebaut: echte GPUs & CPUs, Rechner selbst bauen und aufrüsten, VRAM, Fine-Tuning, Quantisierung, Finanzierung und Ereignisse.</div>
    ${note('Alte Spielstände passen leider nicht zum neuen System – du startest neu.', 'amber')}
    <div class="btns">${btn('Los geht’s', 'dismissOld')}</div>`;
}

