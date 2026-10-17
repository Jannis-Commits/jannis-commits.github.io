import { btn, h2, empty, note } from './components.js';
import { eventView } from '../engine/events.js';
import { DIFFICULTY } from '../../config/difficulty.js';
import { diff } from '../engine/difficulty.js';
import { seg, kv } from './components.js';

export function eventSheet(state) {
  const e = state.pending[0];
  if (!e) return `${empty('Keine offenen Entscheidungen.')}<div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}</div>`;
  const v = eventView(state, e);
  return `<div class="event"><div class="big-ico">${v.icon}</div><h3>${v.title}</h3><p>${v.text}</p></div>
    ${state.pending.length > 1 ? note(`Noch ${state.pending.length - 1} weitere Entscheidung(en).`) : ''}
    <div class="btns col">${v.choices.map((c) => btn(c.label, 'resolve', { id: e.id, c: c.id }, { cls: c.cls || '', disabled: !!c.disabled })).join('')}</div>`;
}

const SETTINGS = [
  ['autoResearch', 'Forschung automatisch wählen', 'Wenn nichts läuft, startet die empfohlene Forschung.'],
  ['autoQuant', 'Benchmarks & 8-Bit automatisch', 'Neue LLMs werden getestet und eine 8-Bit-Version erstellt.'],
  ['autoScale', 'Cloud-Server automatisch skalieren', 'Mietet Cloud-GPUs für Chat/API passend zur Last (nie teurer als die Einnahmen).'],
];

export function settingsSheet(state) {
  const st = state.settings || {};
  const d = diff(state);
  return `<h3>Menü</h3>
    <div class="sub">Schwierigkeit: <b>${d.icon} ${d.name}</b></div>
    ${h2('Automatik')}
    <div class="card tight">${SETTINGS.map(([k, t, desc]) => `<div class="kv"><span><b>${t}</b><br><span class="sub">${desc}</span></span>${seg([[0, 'Aus'], [1, 'An']], st[k] ? 1 : 0, 'toggleSetting', { k })}</div>`).join('')}</div>
    ${h2('Spielstand')}
    <div class="sub">Wird nach jeder Aktion automatisch im Browser gespeichert. Mach ab und zu ein Backup.</div>
    <div class="btns">${btn('Backup exportieren', 'export', {}, { cls: 'ghost' })}${btn('Backup importieren', 'openSheet', { kind: 'import' }, { cls: 'ghost' })}</div>
    <div class="btns">${btn('Neues Spiel', 'openSheet', { kind: 'newGame' }, { cls: 'danger' })}</div>
    ${h2('Info')}
    <div class="sub">AI Company · v0.4. 1 Runde = 1 Woche, ein Spieljahr hat 26 Wochen. Echte GPUs & CPUs (Specs gerundet), ab ~2027 Roadmap bzw. fiktiv. Alle Balancing-Werte liegen in <code>game/config/</code>.</div>
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
  abortJob: ['Training abbrechen?', 'Der bisherige Fortschritt geht verloren.', 'abortJob'],
};

export function confirmSheet(state, ui, sh) {
  const [title, text, act] = CONFIRM[sh.what];
  return `<h3>${title}</h3><div class="sub">${text}</div>
    <div class="btns">${btn('Abbrechen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Ja', act, {}, { cls: 'danger' })}</div>`;
}

export function newGameSheet(state, ui, sh) {
  return `<h3>Neues Spiel</h3>
    ${sh.first ? '<div class="sub">Willkommen bei AI Company! Gründe deine AI-Firma 2015 mit einem Laptop – und überhol OpenAI, Google & Co.</div>' : note('Dein aktueller Spielstand wird gelöscht.', 'amber')}
    <div class="label">Schwierigkeit</div>
    ${Object.entries(DIFFICULTY).map(([id, d]) => `<button class="opt ${id === 'normal' ? 'on' : ''}" data-act="newGame" data-d="${id}">
      <span class="ico">${d.icon}</span><span class="grow"><b>${d.name}</b><br><span class="sub">${d.desc} Start mit ${(d.money).toLocaleString('de-DE')} $.</span></span></button>`).join('')}
    ${sh.first ? '' : `<div class="btns">${btn('Abbrechen', 'closeSheet', {}, { cls: 'ghost' })}</div>`}`;
}

