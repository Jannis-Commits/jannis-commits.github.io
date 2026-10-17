import { RESEARCH_TREE } from '../../config/research.js';
import { btn, h2, bar, chip } from './components.js';
import { isDone, isAvailable, pointsPerWeek } from '../engine/research.js';

export function researchView(state) {
  const ppw = pointsPerWeek(state);
  const cur = state.research.current;
  const ids = Object.keys(RESEARCH_TREE);
  const avail = ids.filter((id) => isAvailable(state, id));
  const locked = ids.filter((id) => !isDone(state, id) && !isAvailable(state, id));
  const done = ids.filter((id) => isDone(state, id));

  const card = (id, mode) => {
    const n = RESEARCH_TREE[id];
    const isCur = id === cur;
    const weeks = Math.ceil((n.cost - (isCur ? state.research.progress : 0)) / ppw);
    const missing = n.req.filter((r) => !isDone(state, r)).map((r) => RESEARCH_TREE[r].name);
    return `<div class="card ${isCur ? 'hl' : ''} ${mode === 'locked' ? 'dim' : ''}">
      <div class="row"><div class="grow"><div class="title">${n.name}</div><div class="sub">${n.desc}</div></div>
      ${mode !== 'done' ? `<div class="right sub">${n.cost} P<br>~${weeks} Wo</div>` : ''}</div>
      ${isCur ? bar(state.research.progress / n.cost) : ''}
      ${mode === 'locked' ? `<div class="chips">${missing.map((m) => chip('braucht ' + m)).join('')}</div>` : ''}
      ${mode === 'avail' && !isCur ? `<div class="btns">${btn(cur ? 'Wechseln (Fortschritt geht verloren)' : 'Erforschen', 'research', { id }, { cls: cur ? 'ghost small' : 'small' })}</div>` : ''}
    </div>`;
  };

  return `
    <div class="card"><div class="row"><div class="ico">🔬</div><div class="grow"><div class="title">${ppw} Forschungspunkte / Woche</div>
      <div class="sub">Mehr Researcher einstellen = schneller forschen.</div></div></div></div>
    ${cur ? h2('Aktuell') + card(cur, 'avail') : ''}
    ${h2('Verfügbar')}${avail.filter((id) => id !== cur).map((id) => card(id, 'avail')).join('') || '<div class="empty">Nichts verfügbar.</div>'}
    ${locked.length ? h2('Gesperrt') + locked.map((id) => card(id, 'locked')).join('') : ''}
    ${h2(`Erforscht (${done.length})`)}${done.map((id) => card(id, 'done')).join('')}
  `;
}
