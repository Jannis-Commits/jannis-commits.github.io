// Rivalen-Releases. year = echtes Jahr (wird über WEEKS_PER_YEAR auf Runden gestaucht).
// scores auf derselben Skala wie deine LLMs (0–100, AGI ≈ 100).

export const COMPANIES = {
  google: { name: 'Google', color: '#4285f4' },
  openai: { name: 'OpenAI', color: '#10a37f' },
  meta: { name: 'Meta', color: '#0866ff' },
  deepmind: { name: 'DeepMind', color: '#5f6bd6' },
  anthropic: { name: 'Anthropic', color: '#d97757' },
  xai: { name: 'xAI', color: '#111111' },
  deepseek: { name: 'DeepSeek', color: '#4d6bfe' },
};

const s = (language, coding, math, reasoning) => ({ language, coding, math, reasoning });

export const RIVAL_RELEASES = [
  { company: 'google', name: 'Neural MT', year: 2016.7, scores: s(3, 0, 0, 1) },
  { company: 'openai', name: 'GPT-1', year: 2018.45, scores: s(3, 0, 0, 1) },
  { company: 'google', name: 'BERT', year: 2018.8, scores: s(8, 1, 1, 3) },
  { company: 'openai', name: 'GPT-2', year: 2019.1, scores: s(14, 3, 2, 6) },
  { company: 'meta', name: 'RoBERTa', year: 2019.55, scores: s(10, 1, 1, 4) },
  { company: 'google', name: 'T5', year: 2019.8, scores: s(15, 3, 3, 8) },
  { company: 'openai', name: 'GPT-3', year: 2020.4, scores: s(28, 14, 9, 18) },
  { company: 'deepmind', name: 'Gopher', year: 2021.95, scores: s(36, 16, 14, 26) },
  { company: 'google', name: 'PaLM', year: 2022.3, scores: s(58, 40, 30, 45) },
  { company: 'openai', name: 'ChatGPT', year: 2022.9, scores: s(62, 45, 30, 45) },
  { company: 'meta', name: 'Llama', year: 2023.15, scores: s(52, 30, 22, 38) },
  { company: 'openai', name: 'GPT-4', year: 2023.2, scores: s(78, 68, 55, 70) },
  { company: 'anthropic', name: 'Claude 2', year: 2023.55, scores: s(76, 60, 48, 64) },
  { company: 'meta', name: 'Llama 2', year: 2023.55, scores: s(58, 35, 28, 44) },
  { company: 'xai', name: 'Grok-1', year: 2023.85, scores: s(62, 50, 40, 52) },
  { company: 'google', name: 'Gemini 1.0', year: 2023.95, scores: s(77, 66, 55, 68) },
  { company: 'anthropic', name: 'Claude 3 Opus', year: 2024.2, scores: s(82, 74, 62, 76) },
  { company: 'openai', name: 'GPT-4o', year: 2024.37, scores: s(83, 76, 64, 76) },
  { company: 'anthropic', name: 'Claude 3.5 Sonnet', year: 2024.47, scores: s(84, 82, 66, 78) },
  { company: 'meta', name: 'Llama 3.1 405B', year: 2024.56, scores: s(80, 72, 62, 72) },
  { company: 'openai', name: 'o1', year: 2024.7, scores: s(82, 84, 85, 86) },
  { company: 'deepseek', name: 'DeepSeek-V3', year: 2024.99, scores: s(82, 80, 75, 78) },
  { company: 'deepseek', name: 'DeepSeek-R1', year: 2025.05, scores: s(82, 82, 86, 86) },
  { company: 'xai', name: 'Grok 3', year: 2025.13, scores: s(84, 82, 84, 84) },
  { company: 'anthropic', name: 'Claude 3.7 Sonnet', year: 2025.15, scores: s(86, 88, 82, 85) },
  { company: 'google', name: 'Gemini 2.5 Pro', year: 2025.23, scores: s(88, 86, 88, 88) },
];

// Nach den echten Releases geht es fiktiv weiter: jede Firma bringt im Takt neue Modelle.
// score(y) = ceiling − (ceiling − startScore) · exp(−(y − start) / tau) + offset
export const FUTURE = {
  start: 2025.5,
  end: 2036,
  ceiling: 98,
  startScore: 88,
  tau: 2.2,
  series: {
    openai: { prefix: 'GPT-', version: 5, step: 0.5, every: 0.5, phase: 0.1, offset: 0 },
    anthropic: { prefix: 'Claude ', version: 4, step: 0.5, every: 0.5, phase: 0.0, offset: 0.5 },
    google: { prefix: 'Gemini ', version: 3, step: 0.5, every: 0.5, phase: 0.35, offset: 0 },
    xai: { prefix: 'Grok ', version: 4, step: 1, every: 0.75, phase: 0.2, offset: -1.5 },
    deepseek: { prefix: 'DeepSeek-V', version: 4, step: 1, every: 0.75, phase: 0.45, offset: -2.5 },
    meta: { prefix: 'Llama ', version: 4, step: 1, every: 1, phase: 0.3, offset: -5 },
  },
  // Stärken je Firma (wird auf den Gesamt-Score addiert)
  bias: {
    openai: s(0, 1, 1, 1), anthropic: s(1, 2, -1, 0), google: s(1, 0, 1, 0),
    xai: s(-1, 0, 1, 1), deepseek: s(-2, 1, 2, 1), meta: s(0, -1, -1, -1),
  },
};
