import { EVENTS, MARKET_PHASES } from '../../config/events.js';
import { GPUS } from '../../config/gpus.js';
import { LOCATION_ORDER } from '../../config/locations.js';
import { ECONOMY, START, WEEKS_PER_YEAR } from '../../config/formulas.js';
import { rand, pick } from '../util/rng.js';
import { gpuPrice, defectChance } from './hardware.js';
import { salary } from './company.js';
import { resolveSpike } from './training.js';
import { generateContract, maxContracts } from './market.js';
import { llmModels } from './products.js';
import { money } from '../util/format.js';

// Ereignisse mit Entscheidung landen in state.pending und müssen vor der nächsten Woche geklärt werden.

const phaseWeek = (p) => Math.round((p.year - START.year) * WEEKS_PER_YEAR);

function tickMarket(state, events) {
  const next = MARKET_PHASES[state.phasesSeen];
  if (next && state.week >= phaseWeek(next)) {
    state.phasesSeen++;
    state.market = { consumer: next.consumer, pro: next.pro, dc: next.dc, until: state.week + next.weeks };
    events.push({ type: 'market', text: next.text, important: true });
  }
  if (state.market.until && state.week >= state.market.until) {
    state.market = { consumer: 1, pro: 1, dc: 1, until: 0 };
    events.push({ type: 'market', text: 'GPU-Preise haben sich normalisiert.', important: false });
  }
}

function tickDefects(state, events) {
  let auto = 0, autoCost = 0;
  for (const m of state.machines) {
    for (let i = m.gpus.length - 1; i >= 0; i--) {
      const g = m.gpus[i];
      const p = 1 - Math.pow(1 - defectChance(state, m, g), m.count);
      if (rand(state) >= p) continue;
      const cost = Math.round(gpuPrice(state, g.id, g.used) * ECONOMY.repairCost);
      if (m.count > 1) { auto++; autoCost += cost; continue; }
      if (state.pending.some((e) => e.type === 'defect' && e.groupId === m.id)) continue;
      state.pending.push({ type: 'defect', id: state.nextId++, groupId: m.id, idx: i, gpu: g.id, cost });
      events.push({ type: 'warn', text: `${GPUS[g.id].name} in ${m.name} ist ausgefallen!`, important: true });
    }
  }
  if (auto) {
    state.money -= autoCost;
    events.push({ type: 'warn', text: `${auto} GPU(s) in deinen Server-Gruppen ausgefallen – Reparatur ${money(autoCost)}.`, important: false });
  }
}

function tickRandom(state, events) {
  const E = EVENTS;
  const r = () => rand(state);
  if (state.staff.researcher > 0 && r() < E.poach.chance) {
    state.pending.push({ type: 'poach', id: state.nextId++, cost: Math.round(salary(state, 'researcher') * E.poach.counterWeeks) });
  }
  const risky = state.datasets.filter((d) => ['web-crawl', 'books', 'github-code', 'movie-subs', 'curated-web', 'mega-mix'].includes(d));
  if (risky.length && r() < E.lawsuit.chance) {
    const cost = Math.round(Math.max(E.lawsuit.minCost, Math.max(0, state.money) * E.lawsuit.moneyShare));
    state.pending.push({ type: 'lawsuit', id: state.nextId++, cost, dataset: pick(state, risky) });
  }
  if (state.staff.researcher >= 2 && r() < E.conference.chance) {
    state.pending.push({ type: 'conference', id: state.nextId++ });
  }
  if (llmModels(state).length && r() < E.press.chance) {
    state.rep = Math.min(100, state.rep + E.press.rep);
    events.push({ type: 'press', text: `Ein Tech-Blog feiert dein neuestes Modell: +${E.press.rep} Ruf.`, important: false });
  }
  if (state.job && LOCATION_ORDER.indexOf(state.location) <= LOCATION_ORDER.indexOf(E.outage.maxLocation) && r() < E.outage.chance) {
    const j = state.job;
    j.flopsDone = j.spec.ckptEvery ? Math.max(j.ckptFlops, j.flopsDone * 0.5) : j.flopsDone * 0.5;
    events.push({ type: 'warn', text: `Stromausfall! Das Training hat Fortschritt verloren${j.spec.ckptEvery ? ' (zurück zum Checkpoint)' : ''}.`, important: true });
  }
  if (state.staff.sales > 0 && state.contracts.length < maxContracts(state) && r() < E.bigClient.chance) {
    const c = generateContract(state, E.bigClient.rewardMult);
    c.big = true;
    state.contracts.push(c);
    events.push({ type: 'contract', text: `Großkunde: ${c.client} bietet ${money(c.reward)}!`, important: true });
  }
}

export function tickEvents(state, events) {
  tickMarket(state, events);
  tickDefects(state, events);
  tickRandom(state, events);
}

// ---------- Anzeige & Entscheidungen ----------

export function eventView(state, e) {
  switch (e.type) {
    case 'spike': {
      const j = state.job, ck = j?.spec.ckptEvery && j.ckptFlops > 0;
      return {
        icon: '📈', title: 'Loss-Spike!',
        text: `Der Loss von ${state.models.find((m) => m.id === j?.modelId)?.name || 'deinem Modell'} ist plötzlich hochgeschossen. Weiter trainieren und hoffen – oder ${ck ? 'zum letzten Checkpoint zurück' : 'neu starten'} und die Lernrate senken?`,
        choices: [
          { id: 'rollback', label: ck ? 'Rollback zum Checkpoint' : 'Neustart (alles verloren)' },
          { id: 'continue', label: 'Weiter (60 % Chance)', cls: 'ghost' },
        ],
      };
    }
    case 'defect': return {
      icon: '🔥', title: 'GPU ausgefallen',
      text: `Eine ${GPUS[e.gpu].name} ist durchgebrannt. Reparieren kostet ${money(e.cost)}, sonst wird sie ausgebaut.`,
      choices: [{ id: 'repair', label: `Reparieren (${money(e.cost)})`, disabled: state.money < e.cost }, { id: 'remove', label: 'Ausbauen', cls: 'ghost' }],
    };
    case 'poach': return {
      icon: '🕵️', title: 'Abwerbe-Versuch',
      text: `Ein Rivale will eine:n deiner Researcher abwerben. Gegenangebot: ${money(e.cost)} Bonus.`,
      choices: [{ id: 'counter', label: `Gegenangebot (${money(e.cost)})`, disabled: state.money < e.cost }, { id: 'let', label: 'Gehen lassen', cls: 'ghost' }],
    };
    case 'lawsuit': return {
      icon: '⚖️', title: 'Klage wegen Trainingsdaten',
      text: `Rechteinhaber verklagen dich wegen eines deiner Datasets. Vergleich: ${money(e.cost)}. Vor Gericht: 50 % Sieg (+Ruf), sonst ${money(e.cost * EVENTS.lawsuit.courtMult)} und −${EVENTS.lawsuit.rep} Ruf.`,
      choices: [{ id: 'settle', label: `Vergleich (${money(e.cost)})` }, { id: 'court', label: 'Vor Gericht', cls: 'ghost' }],
    };
    case 'conference': return {
      icon: '🎤', title: 'Paper angenommen',
      text: 'Dein Team hat ein Paper bei einer großen Konferenz untergebracht. Veröffentlichen bringt Ruf, geheim halten bringt einen Forschungs-Vorsprung.',
      choices: [{ id: 'publish', label: `Veröffentlichen (+${EVENTS.conference.rep} Ruf)` }, { id: 'secret', label: `Geheim (+${EVENTS.conference.points} Punkte)`, cls: 'ghost' }],
    };
    default: return { icon: '❔', title: 'Ereignis', text: '', choices: [{ id: 'ok', label: 'OK' }] };
  }
}

// Gibt einen Text für den Toast zurück
export function resolveEvent(state, id, choice) {
  const e = state.pending.find((x) => x.id === id);
  if (!e) return null;
  if (e.type === 'spike') {
    const r = resolveSpike(state, choice);
    return r === 'rollback' ? 'Zurückgesetzt, Lernrate gesenkt.' : r === 'recovered' ? 'Puh – der Loss hat sich erholt.' : 'Der Loss ist explodiert. Training gescheitert.';
  }
  state.pending = state.pending.filter((x) => x !== e);
  const m = state.machines.find((x) => x.id === e.groupId);
  switch (`${e.type}:${choice}`) {
    case 'defect:repair': state.money -= e.cost; return 'GPU repariert.';
    case 'defect:remove': if (m) m.gpus.splice(Math.min(e.idx, m.gpus.length - 1), 1); return 'GPU ausgebaut.';
    case 'poach:counter': state.money -= e.cost; return 'Dein Team bleibt.';
    case 'poach:let': state.staff.researcher = Math.max(0, state.staff.researcher - 1); return 'Eine:r ist gegangen.';
    case 'lawsuit:settle': state.money -= e.cost; return 'Vergleich bezahlt.';
    case 'lawsuit:court':
      if (rand(state) < EVENTS.lawsuit.courtWin) { state.rep = Math.min(100, state.rep + 3); return 'Gewonnen! +3 Ruf.'; }
      state.money -= e.cost * EVENTS.lawsuit.courtMult;
      state.rep = Math.max(0, state.rep - EVENTS.lawsuit.rep);
      return 'Verloren. Teuer.';
    case 'conference:publish': state.rep = Math.min(100, state.rep + EVENTS.conference.rep); return 'Veröffentlicht!';
    case 'conference:secret': state.research.bonus = (state.research.bonus || 0) + EVENTS.conference.points; return 'Vorsprung gesichert.';
    default: return null;
  }
}

// Für die Sim: Standard-Entscheidung
export function autoResolve(state) {
  const pick = { spike: 'rollback', defect: 'repair', poach: 'let', lawsuit: 'settle', conference: 'publish' };
  while (state.pending.length) {
    const e = state.pending[0];
    const c = e.type === 'defect' && state.money < e.cost ? 'remove' : pick[e.type] || 'ok';
    if (resolveEvent(state, e.id, c) == null) state.pending.shift();
  }
}
