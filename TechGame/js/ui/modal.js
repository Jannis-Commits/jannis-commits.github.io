// Modals aus der Warteschlange: Events, Ären, Sieg, Game Over
import * as F from '../util/format.js';
import { EVENT } from '../../config/events.js';
import { ERAS } from '../../config/eras.js';
import { BOOST } from '../../config/prestige.js';
import { eventText } from '../engine/events.js';
import { btn } from './components.js';

export function modalView(s, ui) {
  if (ui.result) {
    return `<div class="em">${ui.result.icon}</div><h3>${ui.result.title}</h3><p class="txt">${F.esc(ui.result.text)}</p>${btn('Weiter', 'resultOk', {}, { cls: 'block' })}`;
  }
  const q = s.queue[0];
  if (!q) return '';
  if (q.type === 'event') {
    const e = EVENT[q.id];
    return `<div class="em">${e.icon}</div><h3>${e.title}</h3><p class="txt">${F.esc(eventText(s, e, q.ctx || {}))}</p>
      ${e.options.map((o, i) => `<button class="opt" data-act="eventOpt" data-i="${i}"><b>${o.label}</b>${o.desc ? `<span>${o.desc}${o.chance !== undefined ? ` (${Math.round(o.chance * 100)} %)` : ''}</span>` : ''}</button>`).join('')}`;
  }
  if (q.type === 'era') {
    const e = ERAS.find((x) => x.id === q.id);
    return `<div class="em">${e.icon}</div><h3>${e.name} beginnt</h3><p class="txt">${e.text}</p>
      ${e.keyTech ? `<p class="sub">Wer die Schlüssel-Technologie nicht innerhalb von 2 Jahren erforscht, verliert Marktanteile.</p>` : ''}
      ${btn('Los geht’s', 'queueOk', {}, { cls: 'block' })}`;
  }
  if (q.type === 'victory') {
    return `<div class="em">👑</div><h3>Weltspitze erreicht!</h3>
      <p class="txt">${F.esc(s.companyName)} ist das wertvollste Software-Unternehmen der Welt – mit eigenem Betriebssystem. Wähle einen dauerhaften Boost für deine nächsten Runs.</p>
      <div class="boosts">${q.picks.map((id) => { const b = BOOST[id]; return `<button class="opt" data-act="pickBoost" data-id="${id}"><b>${b.icon} ${b.name}</b><span>${b.desc}</span></button>`; }).join('')}</div>`;
  }
  if (q.type === 'boostPicked') {
    return `<div class="em">✨</div><h3>Boost gesichert</h3><p class="txt">Er gilt ab dem nächsten Run. Weiterspielen oder direkt neu anfangen?</p>
      <div class="btns">${btn('Weiterspielen', 'queueOk', {}, { cls: 'plain' })}${btn('Neuer Run', 'newRun')}</div>`;
  }
  if (q.type === 'gameover') {
    const t = { bankrupt: ['💸', 'Pleite', 'Acht Wochen im Minus – die Bank zieht den Stecker.'],
      exit: ['🏝️', 'Verkauft', `Du hast ${s.companyName} verkauft und bist reich. Aber Weltherrschaft sieht anders aus.`],
      takeover: ['🦈', 'Übernommen', 'Deine Investoren haben an die Konkurrenz verkauft. Du bist raus.'] }[q.reason] || ['🛑', 'Game Over', ''];
    return `<div class="em">${t[0]}</div><h3>${t[1]}</h3><p class="txt">${t[2]}<br><br>Du hast es bis ${F.date(s.week)} geschafft, ${s.stats.released} Releases, Spitzenwert ${F.money(s.stats.peakValue)}.</p>
      ${btn('Neuer Run', 'newRun', {}, { cls: 'block' })}`;
  }
  return btn('OK', 'queueOk', {}, { cls: 'block' });
}
