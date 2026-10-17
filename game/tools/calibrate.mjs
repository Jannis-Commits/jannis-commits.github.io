// Zeigt Scores für typische Setups (Balancing-Hilfe): node tools/calibrate.mjs
import { newGame } from '../js/state.js';
import { analyze } from '../js/engine/training.js';
import { RESEARCH_TREE } from '../config/research.js';

const s = newGame(1);
s.research.done = Object.keys(RESEARCH_TREE).filter((k) => !['moe'].includes(k));
s.hardware = { 'dc-a': 100 };
const cases = [
  ['spam', ['sms-spam'], [1e5, 3e5, 1e6]], ['spam', ['enron-spam'], [1e6, 3e6, 1e7]],
  ['digits', ['mnist'], [1e5, 1e6, 1e7, 1e8]],
  ['recommender', ['movie-ratings'], [1e6, 1e7, 1e8]], ['recommender', ['movie-ratings', 'shop-logs'], [1e7, 1e8, 1e9]],
  ['chatbot', ['dialog-scripts'], [1e6, 1e7]], ['chatbot', ['dialog-scripts', 'movie-subs'], [1e7, 1e8]],
  ['image', ['imagenet'], [1e7, 1e8, 1e9]],
  ['llm', ['newsgroups', 'wikipedia'], [1e8, 1e9]], ['llm', ['web-crawl', 'books', 'github-code'], [1e9, 1e10, 1e11]],
  ['llm', ['curated-web'], [1e10, 1e11]],
];
const noRes = newGame(1); noRes.hardware = { 'dc-a': 100 };
for (const [task, ds, ps] of cases) for (const p of ps) for (const ep of [1, 3]) {
  const a = analyze(s, { task, datasets: ds, params: p, epochs: ep, arch: 'dense' });
  console.log(task.padEnd(12), ds.join('+').padEnd(30), p.toExponential(0), 'ep' + ep, 'L', a.loss.toFixed(2), 'score', a.score.toFixed(0), 'of', a.overfit.toFixed(2), 'fail', a.fail.toFixed(2), 'flops', a.flopsNeeded.toExponential(1));
}
