import { RESEARCH_TREE, BRANCHES } from '../../config/research.js';
import { WEEKS_PER_YEAR, START } from '../../config/formulas.js';
import { btn, bar, chip, fchips, list, row, section, note } from './components.js';
import { isDone, isAvailable, pointsPerWeek, tooEarly } from '../engine/research.js';
import { date } from '../util/format.js';

export function researchView(state, ui) {
  const ppw = pointsPerWeek(state);
  const r = state.research;
  const br = ui.branch || 'all';
  const ids = Object.keys(RESEARCH_TREE).filter((id) => br === 'all' || RESEARCH_TREE[id].branch === br);
  const avail = ids.filter((id) => isAvailable(state, id) && id !== r.current && !r.queue.includes(id)).sort((a, b) => RESEARCH_TREE[a].cost - RESEARCH_TREE[b].cost);
  const locked = ids.filter((id) => !isDone(state, id) && !isAvailable(state, id));
  const done = ids.filter((id) => isDone(state, id));
  const weeks = (id, prog = 0) => Math.ceil((RESEARCH_TREE[id].cost - prog) / ppw);

  const cur = r.current ? RESEARCH_TREE[r.current] : null;
  const head = `<div class="card ${cur ? 'hl' : ''}">
    <div class="row"><div class="ico">🔬</div><div class="grow"><div class="title">${cur ? cur.name : 'Keine Forschung aktiv'}</div>
    <div class="sub">${cur ? `${Math.floor(r.progress)} / ${cur.cost} P · noch ~${weeks(r.current, r.progress)} Wo` : 'Wähle unten etwas aus.'} · ${ppw} P/Woche</div></div></div>
    ${cur ? bar(r.progress / cur.cost) : ''}
    ${r.queue.length ? `<div class="chips">${r.queue.map((q, i) => `<button class="chip blue" data-act="unqueue" data-id="${q}">${i + 1}. ${RESEARCH_TREE[q].name} ✕</button>`).join('')}</div>` : ''}
  </div>`;

  const availRows = avail.map((id) => {
    const n = RESEARCH_TREE[id];
    const full = r.current && r.queue.length >= 3;
    return row({
      title: n.name, sub: n.desc, chips: chip(BRANCHES[n.branch]),
      right: `<span class="sub">${n.cost} P · ${weeks(id)} Wo</span><br>${btn(r.current ? 'Warteschlange' : 'Start', 'research', { id }, { cls: r.current ? 'ghost small' : 'small', disabled: full })}`,
    });
  });
  const lockedRows = locked.map((id) => {
    const n = RESEARCH_TREE[id];
    const missing = n.req.filter((x) => !isDone(state, x)).map((x) => RESEARCH_TREE[x].name);
    const early = tooEarly(state, id) ? chip(`ab ${date(Math.ceil((n.year - START.year) * WEEKS_PER_YEAR))}`, 'amber') : '';
    return row({ title: n.name, sub: n.desc, chips: early + missing.map((m) => chip('braucht ' + m)).join(''), right: `<span class="sub">${n.cost} P</span>`, cls: 'dim' });
  });

  return `${head}
    ${fchips([['all', 'Alle'], ...Object.entries(BRANCHES)], br, 'branch')}
    ${availRows.length ? list(availRows) : note('In diesem Zweig ist gerade nichts erforschbar.')}
    ${lockedRows.length ? section(ui, 'res-locked', 'Gesperrt', list(lockedRows), { count: lockedRows.length }) : ''}
    ${done.length ? section(ui, 'res-done', 'Erforscht', `<div class="chips">${done.map((id) => chip('✓ ' + RESEARCH_TREE[id].name, 'green')).join('')}</div>`, { count: done.length }) : ''}`;
}
