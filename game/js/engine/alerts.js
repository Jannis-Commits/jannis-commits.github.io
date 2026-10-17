import { TASKS } from '../../config/tasks.js';
import { allMachines, machineStats, pool } from './hardware.js';
import { candidate, meets } from './market.js';
import { canRaise } from './funding.js';
import { load, chatModel, apiModel, llmModels } from './products.js';
import { readyModels } from './training.js';
import { isAvailable } from './research.js';
import { RESEARCH_TREE } from '../../config/research.js';

// To-do-Liste für die Zentrale: was gerade Aufmerksamkeit braucht.
// { icon, text, level: 'red'|'amber'|'blue', act, data }
export function alerts(state) {
  const a = [];
  const add = (icon, text, level, act, data = {}) => a.push({ icon, text, level, act, data });

  if (state.pending.length) add('❗', `${state.pending.length} Entscheidung(en) offen`, 'red', 'openEvent');
  if (state.money < 0) add('💸', 'Konto im Minus – Kosten senken oder Geld verdienen!', 'red', 'tab', { id: 'biz', seg: 'firma' });
  if (state.job?.paused && state.job.paused !== 'spike') add('⏸️', `Training pausiert: ${state.job.paused}`, 'red', 'tab', { id: 'lab', seg: 'jobs' });

  for (const kind of ['chat', 'api']) {
    const m = kind === 'chat' ? chatModel(state) : apiModel(state);
    if (!m) continue;
    const l = load(state, kind);
    if (l > 1) add('🔥', `${kind === 'chat' ? 'Chat' : 'API'} überlastet (${l === Infinity ? 'keine Maschinen' : Math.round(l * 100) + ' %'})`, 'red', 'tab', { id: 'infra', seg: 'machines' });
  }

  const ready = state.contracts.filter((c) => { const m = candidate(state, c); return m && meets(state, c, m); });
  if (ready.length) add('📦', `${ready.length} Auftrag/Aufträge lieferbar`, 'blue', 'tab', { id: 'biz', seg: 'contracts' });
  if (canRaise(state)) add('💰', 'Finanzierungsrunde verfügbar', 'blue', 'tab', { id: 'biz', seg: 'firma' });

  const trainPool = pool(state, 'train');
  if (!state.job && trainPool.machines) add('🧪', 'Kein Training läuft – Hardware langweilt sich', 'amber', 'openWizard', { kind: 'pretrain' });
  if (!state.research.current) {
    const any = Object.keys(RESEARCH_TREE).some((id) => isAvailable(state, id));
    if (any) add('🔬', 'Keine Forschung aktiv', 'amber', 'tab', { id: 'research' });
  }

  for (const m of allMachines(state)) {
    if (m.cloud) continue;
    const s = machineStats(state, m);
    if (s.hot) add('🌡️', `${m.name}: überhitzt (−${Math.round((1 - s.coolF) * 100)} %)`, 'amber', 'openMachine', { id: m.id });
    else if (s.bottleneck && s.eff < 0.85) add('🐢', `${m.name}: Engpass ${s.bottleneck} (${Math.round(s.eff * 100)} %)`, 'amber', 'openMachine', { id: m.id });
    if (m.role === 'idle' && s.gpus) add('💤', `${m.name} ist aus`, 'amber', 'openMachine', { id: m.id });
  }

  const chatable = llmModels(state).filter((m) => m.chat);
  if (chatable.length && !state.chat.modelId) add('💬', 'Chatfähiges LLM da – Chat-Website starten?', 'blue', 'tab', { id: 'biz', seg: 'products' });
  const apps = readyModels(state).filter((m) => m.task !== 'llm' && !state.apps[m.task] && TASKS[m.task]);
  if (apps.length) add('📱', `${apps[0].name} könnte als App Geld verdienen`, 'blue', 'openModel', { id: apps[0].id });

  return a;
}
