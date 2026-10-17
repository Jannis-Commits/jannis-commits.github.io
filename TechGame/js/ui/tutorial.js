import { TUTORIAL } from '../../config/tutorial.js';
import { btn } from './components.js';

export function currentStep(s) {
  if (s.tutorial.hidden) return null;
  return TUTORIAL.find((t) => !t.done(s)) || null;
}

export function coachCard(s, tab) {
  const t = currentStep(s);
  if (!t || t.tab !== tab) return '';
  return `<div class="coach"><h3>${t.title}</h3><p class="sub" style="color:inherit">${t.text}</p>
    <div class="btns">${t.ack ? btn('Verstanden', 'tutAck', { id: t.id }, { cls: 'sm' }) : ''}${btn('Tutorial ausblenden', 'tutHide', {}, { cls: 'plain sm' })}</div></div>`;
}

export const tutorialTab = (s) => currentStep(s)?.tab || null;
