// Zeigt Scores für typische Setups (Balancing-Hilfe): node tools/calibrate.mjs
import { newGame } from '../js/state.js';
import { analyze } from '../js/engine/training.js';
import { RESEARCH_TREE } from '../config/research.js';

const ALL = Object.keys(RESEARCH_TREE);
const upTo = (ids) => ALL.slice(0, ALL.indexOf(ids) + 1);
const cases = [
  // [Forschung bis, task, datasets, params, arch]
  ['moe', 'spam', ['enron-spam'], 1e6],
  ['moe', 'image', ['imagenet'], 1e8],
  ['transformer', 'llm', ['newsgroups', 'wikipedia'], 1e9],
  ['transformer', 'llm', ['web-crawl', 'books', 'github-code'], 1e10],
  ['moe', 'llm', ['web-crawl', 'books', 'github-code'], 1.75e11],       // ~GPT-3
  ['rlhf', 'llm', ['curated-web', 'books', 'github-code', 'code-instruct'], 1e11],
  ['cot', 'llm', ['mega-mix', 'reasoning-traces', 'code-instruct'], 3e11],   // ~GPT-4
  ['reasoning', 'llm', ['mega-mix', 'synthetic', 'reasoning-traces', 'code-instruct'], 1e12, 'moe'],
  ['gigawatt', 'llm', ['mega-mix', 'synthetic', 'reasoning-traces', 'code-instruct', 'agent-trajectories'], 3e12, 'moe'],
  ['gigawatt', 'llm', ['mega-mix', 'synthetic', 'reasoning-traces', 'code-instruct', 'agent-trajectories'], 1e13, 'moe'],
];
for (const [res, task, ds, p, arch = 'dense'] of cases) {
  const s = newGame(1);
  s.research.done = upTo(res);
  s.hardware = { 'dc-h': 10000 };
  const a = analyze(s, { task, datasets: ds, params: p, epochs: 1, arch });
  const sk = a.skills ? Object.values(a.skills).map((v) => v.toFixed(0)).join('/') : '';
  console.log(res.padEnd(12), task.padEnd(5), ds.join('+').slice(0, 52).padEnd(52), p.toExponential(1), arch.padEnd(5),
    'score', a.score.toFixed(1).padStart(5), sk.padEnd(12), 'flops', a.flopsNeeded.toExponential(1), 'wo', a.weeks);
}
