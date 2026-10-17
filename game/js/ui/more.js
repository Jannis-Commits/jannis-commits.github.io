import * as F from '../util/format.js';
import { btn, h2, empty } from './components.js';

export function moreView(state) {
  return `
    ${h2('Spielstand')}
    <div class="card"><div class="sub">Wird nach jeder Woche automatisch im Browser gespeichert. Mach ab und zu ein Backup.</div>
      <div class="btns">${btn('Backup exportieren', 'export', {}, { cls: 'ghost' })}${btn('Backup importieren', 'openImport', {}, { cls: 'ghost' })}</div>
      <div class="btns">${btn('Neues Spiel', 'confirmReset', {}, { cls: 'danger' })}</div></div>

    ${h2('Logbuch')}
    <div class="card">${state.log.map((l) => `<div class="log"><span class="w">Wo ${l.week}</span><span>${F.esc(l.text)}</span></div>`).join('') || empty('Noch nichts passiert.')}</div>

    ${h2('Info')}
    <div class="card"><div class="sub">AI Company · v0.2 (M2). 1 Runde = 1 Woche, ein Spieljahr hat 26 Wochen. Alle Balancing-Werte liegen in <code>game/config/</code>.</div></div>
  `;
}

export function importSheet() {
  return `<h3>Backup importieren</h3><div class="sub">Füge den Backup-Text ein. Dein aktueller Spielstand wird überschrieben.</div>
    <div class="label">Backup</div><textarea id="importText" placeholder="Backup-Text hier einfügen"></textarea>
    <div class="btns">${btn('Abbrechen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Importieren', 'doImport')}</div>`;
}

export function exportSheet(text) {
  return `<h3>Backup exportieren</h3><div class="sub">Kopier den Text und speicher ihn z.B. in deinen Notizen.</div>
    <div class="label">Backup</div><textarea id="exportText" readonly>${text}</textarea>
    <div class="btns">${btn('Schließen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Kopieren', 'copyExport')}${btn('Als Datei', 'downloadExport', {}, { cls: 'ghost' })}</div>`;
}

export function confirmSheet(text, act) {
  return `<h3>Sicher?</h3><div class="sub">${text}</div>
    <div class="btns">${btn('Abbrechen', 'closeSheet', {}, { cls: 'ghost' })}${btn('Ja', act, {}, { cls: 'danger' })}</div>`;
}
