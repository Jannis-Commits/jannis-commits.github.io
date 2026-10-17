import * as F from '../util/format.js';
import { GAME_VERSION } from '../state.js';
import { EVENTS } from '../../config/events.js';
import { btn, sheetHead, kv, h2 } from './components.js';

export function settingsSheet(s, ui) {
  let html = sheetHead('Einstellungen', '⚙️');
  html += `<label class="sub">Firmenname</label><input type="text" data-input="companyName" value="${F.esc(s.companyName)}" maxlength="24">`;
  html += h2('Spielstand');
  html += `<p class="sub">Wird nach jeder Woche automatisch gespeichert. Mit dem Code kannst du ihn sichern oder auf ein anderes Gerät mitnehmen.</p>`;
  html += `<div class="btns">${btn('Code exportieren', 'export', {}, { cls: 'ghost' })}${btn('Code importieren', 'importOpen', {}, { cls: 'ghost' })}</div>`;
  if (ui.exportText) html += `<textarea readonly id="exportBox">${ui.exportText}</textarea>${btn('Kopieren', 'copyExport', {}, { cls: 'plain block mt' })}`;
  if (ui.importOpen) html += `<textarea data-input="importText" placeholder="Code hier einfügen">${F.esc(ui.importText || '')}</textarea>${btn('Spielstand laden', 'import', {}, { cls: 'block mt' })}`;
  html += h2('Neustart');
  html += ui.confirmReset
    ? `<div class="card bad"><p>Dein aktueller Run wird gelöscht. Prestige-Boosts bleiben.</p><div class="btns">${btn('Ja, neu starten', 'reset', {}, { cls: 'danger' })}${btn('Abbrechen', 'cancelReset', {}, { cls: 'plain' })}</div></div>`
    : btn('Neues Spiel', 'confirmReset', {}, { cls: 'plain block' });
  if (s.tutorial.hidden) html += btn('Tutorial wieder einblenden', 'tutShow', {}, { cls: 'plain block mt' });
  html += h2('Info');
  html += `<div class="card">${kv('Prestige', s.prestige)}${kv('Boosts', s.boosts.length ? s.boosts.join(', ') : '—')}
    <div class="kv" data-act="versionTap"><span>Version</span><span>${GAME_VERSION}</span></div></div>`;
  if (s.debug) html += debugPanel(s);
  return html;
}

function debugPanel(s) {
  return `<h2>🐛 Debug</h2><div class="card warn">
    <div class="gap">${btn('+10k $', 'dbgMoney', { v: 1e4 }, { cls: 'sm' })}${btn('+1 Mio. $', 'dbgMoney', { v: 1e6 }, { cls: 'sm' })}${btn('+1 billion $', 'dbgMoney', { v: 1e9 }, { cls: 'sm' })}</div>
    <div class="gap mt">${btn('+4 Wochen', 'dbgWeeks', { v: 4 }, { cls: 'sm ghost' })}${btn('+1 Jahr', 'dbgWeeks', { v: 52 }, { cls: 'sm ghost' })}${btn('+5 Jahre', 'dbgWeeks', { v: 260 }, { cls: 'sm ghost' })}</div>
    <div class="gap mt">${btn('Forschung fertig', 'dbgResearch', {}, { cls: 'sm ghost' })}${btn('Alles erforschen', 'dbgAllResearch', {}, { cls: 'sm ghost' })}${btn('Projekte fertig', 'dbgProjects', {}, { cls: 'sm ghost' })}</div>
    <div class="gap mt">${btn('Ruf +20', 'dbgRep', {}, { cls: 'sm ghost' })}${btn('Moral 100', 'dbgMorale', {}, { cls: 'sm ghost' })}${btn('Debug aus', 'dbgOff', {}, { cls: 'sm plain' })}</div>
    <label class="sub mt" style="display:block">Event auslösen</label>
    <div class="gap">${EVENTS.map((e) => btn(e.icon, 'dbgEvent', { id: e.id }, { cls: 'sm plain' })).join('')}</div>
  </div>`;
}
