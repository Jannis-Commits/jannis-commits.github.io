import { TASKS } from '../../config/tasks.js';
import { METHODS } from '../../config/pipeline.js';
import * as F from '../util/format.js';
import { btn, kv, chip, bar, h2, row, list, section, spark, stat, note, empty } from './components.js';
import { alerts } from '../engine/alerts.js';
import { currentGoal } from '../engine/goals.js';
import { weeklyIncome } from '../engine/market.js';
import { weeklyCosts } from '../engine/company.js';
import { pool, flopsPerWeek } from '../engine/hardware.js';
import { pointsPerWeek } from '../engine/research.js';
import { findModel } from '../engine/training.js';
import { totalUsers } from '../engine/products.js';
import { leaderboard } from '../engine/rivals.js';
import { RESEARCH_TREE } from '../../config/research.js';

export function homeView(state, ui) {
  const income = weeklyIncome(state), costs = weeklyCosts(state);
  const tp = pool(state, 'train');
  const g = currentGoal(state);
  const rank = leaderboard(state).findIndex((r) => r.mine) + 1;
  const al = alerts(state);
  const j = state.job, jm = j && findModel(state, j.modelId);
  const cur = state.research.current && RESEARCH_TREE[state.research.current];

  const jobs = [];
  if (j) {
    const p = Math.min(1, j.flopsDone / j.flopsNeeded);
    jobs.push(`<button class="card hl jobmini" data-act="seg" data-tab="lab" data-id="jobs">
      <div class="row"><div class="ico">${TASKS[jm.task].icon}</div><div class="grow"><div class="title">${F.esc(jm.name)}</div>
      <div class="sub">${j.spec.kind === 'post' ? METHODS[j.spec.method].short : j.spec.kind === 'distill' ? 'Distillation' : 'Pretraining'} · Woche ${j.weeksDone}/~${j.estWeeks}${j.paused ? ' · ⏸️' : ''}</div></div>
      <div class="right">${F.pct(p)}</div></div>${bar(p, true)}${j.curve.length > 2 ? spark(j.curve, { h: 36 }) : ''}</button>`);
  }
  if (cur) {
    jobs.push(`<button class="card jobmini" data-act="tab" data-id="research"><div class="row"><div class="ico">🔬</div><div class="grow"><div class="title">${cur.name}</div>
      <div class="sub">${Math.floor(state.research.progress)} / ${cur.cost} P${state.research.queue.length ? ` · +${state.research.queue.length} in Warteschlange` : ''}</div></div></div>${bar(state.research.progress / cur.cost, true)}</button>`);
  }

  const log = state.log.slice(0, 12).map((l) => `<div class="log"><span class="w">Wo ${l.week}</span><span>${F.esc(l.text)}</span></div>`).join('');
  return `
    <div class="stats">
      ${stat('Einnahmen/Wo', `<span class="good">${F.money(income)}</span>`)}
      ${stat('Kosten/Wo', `<span class="bad">${F.money(costs.total)}</span>`)}
      ${stat('Training', F.tflops(tp.tf), tp.machines ? `${tp.gpus} ${tp.cpuOnly ? 'CPU' : 'GPU'} · ${F.flops(flopsPerWeek(state, tp.tf))}/Wo` : 'keine Maschine')}
      ${stat('Forschung', `${pointsPerWeek(state)} P/Wo`, `Ruf ${Math.round(state.rep)} · ${totalUsers(state) ? F.count(Math.round(totalUsers(state))) + ' Nutzer' : rank ? `Rang ${rank}` : 'noch kein Ranking'}`)}
    </div>
    ${g ? `<div class="goal"><span class="ico">🎯</span><span class="grow"><span class="sub">Nächstes Ziel</span><b>${g.text}</b></span>${g.reward ? chip(`+${F.money(g.reward)}`, 'green') : ''}</div>` : ''}
    ${h2('To-do')}
    ${al.length ? list(al.map((a) => row({ icon: a.icon, title: a.text, act: a.act, data: a.data, cls: `al-${a.level}` }))) : note('Alles läuft. Drück auf „Nächste Woche“.', 'blue')}
    ${h2('Läuft gerade')}
    ${jobs.join('') || empty('Weder Training noch Forschung aktiv.')}
    ${section(ui, 'home-log', 'Logbuch', log || empty('Noch nichts passiert.'), { count: state.log.length })}
  `;
}
