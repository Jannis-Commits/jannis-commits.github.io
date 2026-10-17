import * as F from '../util/format.js';
import { RESEARCH, BRANCHES, NODE, FX_LABELS } from '../../config/research.js';
import { nodeState, researchPointsPerWeek, unlocksOf } from '../engine/research.js';
import { btn, chip, bar, h2, seg, empty } from './components.js';
import { coachCard } from './tutorial.js';

function fxText(n) {
  const parts = Object.entries(n.fx).map(([k, v]) => FX_LABELS[k]?.(v)).filter(Boolean);
  const un = unlocksOf(n.id);
  if (un.length) parts.unshift(`Schaltet frei: ${un.join(', ')}`);
  return parts.join(' · ') || 'Grundlage für weitere Forschung';
}

export function researchView(s, ui) {
  let html = coachCard(s, 'research');
  const pts = researchPointsPerWeek(s);
  const cur = s.research.current ? NODE[s.research.current] : null;
  const researchers = s.staff.filter((m) => m.assign === 'research').length;
  if (cur) {
    const prog = (s.research.progress[cur.id] || 0) / cur.pts;
    const left = pts > 0 ? (cur.pts - (s.research.progress[cur.id] || 0)) / pts : Infinity;
    html += `<div class="card hl"><div class="row"><div class="ico">${BRANCHES.find((b) => b.id === cur.branch).icon}</div><div class="grow">
      <div class="title">${cur.name}</div><div class="sub">${pts > 0 ? `fertig in ${F.weeks(left)}` : 'Niemand forscht – teile jemanden der Forschung zu'}</div></div></div>
      <div class="mt">${bar(prog)}</div></div>`;
  } else {
    html += `<div class="card flat"><div class="title">Keine laufende Forschung</div><div class="sub">Wähle unten ein Thema.</div></div>`;
  }
  html += `<p class="sub">${researchers} ${researchers === 1 ? 'Person forscht' : 'Leute forschen'} · ${pts.toFixed(1)} Punkte/Woche · ${s.research.done.length}/${RESEARCH.length} erforscht</p>`;
  if (!researchers) html += `<div class="alert info"><span>💡</span><span class="grow">Weise im Team jemanden „Forschung“ zu. Research-Leute forschen am schnellsten.</span></div>`;

  const branch = ui.branch || 'lang';
  html += seg(BRANCHES.map((b) => {
    const avail = RESEARCH.filter((n) => n.branch === b.id && nodeState(s, n) === 'available').length;
    return [b.id, `${b.icon} ${b.name.split(' ')[0]}${avail ? ` <span class="chip blue">${avail}</span>` : ''}`];
  }), branch, 'branch');

  const nodes = RESEARCH.filter((n) => n.branch === branch).sort((a, b) => a.year - b.year);
  html += '<div class="tree">';
  for (const n of nodes) {
    const st = nodeState(s, n);
    const paid = s.research.progress[n.id] !== undefined;
    const reqs = n.req.filter((r) => !s.research.done.includes(r)).map((r) => NODE[r].name);
    let action = '';
    if (st === 'available') action = btn(paid ? 'Fortsetzen' : F.money(n.cost), 'research', { id: n.id }, { cls: 'sm', disabled: !paid && s.money < n.cost });
    html += `<div class="node ${st}"><div class="card ${st === 'active' ? 'hl' : ''} ${st === 'locked' || st === 'future' ? 'dim' : ''}">
      <div class="row top-a"><div class="grow"><div class="title">${n.name}</div>
      <div class="sub">${fxText(n)}</div>
      <div class="tiny mt">${st === 'done' ? '✓ erforscht' : st === 'future' ? `verfügbar ab ${n.year}` : st === 'locked' ? `braucht: ${reqs.join(', ')}` : `${n.pts} Punkte${paid ? `, ${Math.round((s.research.progress[n.id] || 0) / n.pts * 100)} % geschafft` : ''}`}</div></div>
      ${st === 'done' ? chip('✓', 'green') : st === 'active' ? chip('läuft', 'blue') : action}</div></div></div>`;
  }
  html += '</div>';
  return html;
}
