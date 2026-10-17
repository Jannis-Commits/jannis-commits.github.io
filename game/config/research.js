// Forschungsbaum. cost = Forschungspunkte, req = Voraussetzungen.
// effects:
//   maxParams      höchste wählbare Parameter-Anzahl
//   util           + Compute-Auslastung
//   failRed        − Trainingsrisiko
//   quality        + Dataset-Qualität (absolut)
//   taskLoss       { task: −Loss } bessere Ergebnisse für einen Modell-Typ
//   skills         { skill: +Multiplikator } für LLMs
//   features       ['quantize', 'moe', 'chat']
//   (year)         frühestens ab diesem Jahr erforschbar
//   capBoost       Post-Training: schrumpft den LLM-Abstand zum Optimum (0.1 = −10 %)

export const RESEARCH_TREE = {
  logreg: {
    name: 'ML-Grundlagen', cost: 0, req: [],
    desc: 'Logistische Regression & Co. Schaltet Spam-Filter frei.',
    effects: { maxParams: 1e6 },
  },
  'neural-nets': {
    name: 'Neuronale Netze', cost: 15, req: ['logreg'],
    desc: 'Schaltet Ziffernerkennung frei. Größere Modelle.',
    effects: { maxParams: 1e7 },
  },
  recsys: {
    name: 'Collaborative Filtering', cost: 25, req: ['logreg'],
    desc: 'Schaltet Empfehlungssysteme frei.',
    effects: {},
  },
  dialog: {
    name: 'Dialog-Systeme', cost: 30, req: ['logreg'],
    desc: 'Schaltet Regel-Chatbots frei.',
    effects: {},
  },
  'gpu-training': {
    name: 'GPU-Training (CUDA)', cost: 40, req: ['neural-nets'],
    desc: 'Workstations, +10 % Auslastung, bis 100 million Parameter.',
    effects: { maxParams: 1e8, util: 0.1 },
  },
  'data-cleaning': {
    name: 'Data Cleaning', cost: 50, req: ['logreg'],
    desc: '+0,05 Qualität auf alle Datasets.',
    effects: { quality: 0.05 },
  },
  quantization: {
    name: 'Quantisierung', cost: 60, req: ['neural-nets'],
    desc: 'Modelle auf 8/4 Bit verkleinern: billigeres Hosting.',
    effects: { features: ['quantize'] },
  },
  cnn: {
    name: 'CNNs', cost: 60, req: ['neural-nets', 'gpu-training'],
    desc: 'Schaltet Bilderkennung frei, bessere Ziffernerkennung.',
    effects: { taskLoss: { digits: 0.5 } },
  },
  rnn: {
    name: 'RNNs & LSTMs', cost: 60, req: ['neural-nets'],
    desc: 'Bessere Chatbots durch Sequenzmodelle.',
    effects: { taskLoss: { chatbot: 1 } },
  },
  embeddings: {
    name: 'Word Embeddings', cost: 70, req: ['rnn'],
    desc: 'Schaltet Wikipedia-Dataset frei, bessere Text-Modelle.',
    effects: { taskLoss: { chatbot: 0.5, spam: 1 } },
  },
  'datacenter-hw': {
    name: 'Datacenter-Hardware', cost: 90, req: ['gpu-training'],
    desc: 'Datacenter-GPUs, bis 1 billion Parameter.',
    effects: { maxParams: 1e9 },
  },
  'mixed-precision': {
    name: 'Mixed Precision', cost: 100, req: ['datacenter-hw'],
    desc: '+15 % Compute-Auslastung.',
    effects: { util: 0.15 },
  },
  attention: {
    name: 'Attention', cost: 120, req: ['rnn', 'embeddings'],
    desc: 'Modelle lernen, worauf es ankommt.',
    effects: { taskLoss: { chatbot: 0.5, image: 0.2 } },
  },
  transformer: {
    name: 'Transformer', cost: 180, req: ['attention'],
    desc: 'Schaltet Sprachmodelle (LLMs) und große Text-Datasets frei.',
    effects: {},
  },
  distributed: {
    name: 'Distributed Training', cost: 220, req: ['datacenter-hw', 'mixed-precision'],
    desc: 'Server-Etage, bis 10 billion Parameter, −3 % Risiko.',
    effects: { maxParams: 1e10, failRed: 0.03 },
  },
  'scaling-laws': {
    name: 'Scaling Laws', cost: 300, req: ['transformer', 'distributed'],
    desc: 'Bis 100 billion Parameter, kuratierte Datasets.',
    effects: { maxParams: 1e11 },
  },
  'code-models': {
    name: 'Code-Modelle', cost: 200, req: ['transformer'],
    desc: '+15 % Coding für LLMs.',
    effects: { skills: { coding: 0.15 } },
  },
  moe: {
    name: 'Mixture of Experts', cost: 400, req: ['scaling-laws'],
    desc: 'MoE-Architektur: 4× weniger Compute pro Parameter. Bis 1 trillion Parameter.',
    effects: { maxParams: 1e12, features: ['moe'] },
  },

  // ---------- Late Game: Post-Training, Reasoning, Mega-Cluster ----------
  'instruction-tuning': {
    name: 'Instruction Tuning', year: 2021.8, cost: 250, req: ['transformer'],
    desc: 'LLMs folgen Anweisungen. Schaltet die Chat-Website frei. +5 % LLM-Qualität.',
    effects: { capBoost: 0.05, features: ['chat'] },
  },
  rlhf: {
    name: 'RLHF', year: 2022.3, cost: 400, req: ['instruction-tuning'],
    desc: 'Feedback von Menschen macht Antworten hilfreicher. +6 % LLM-Qualität.',
    effects: { capBoost: 0.06 },
  },
  'flash-attention': {
    name: 'FlashAttention', year: 2022.2, cost: 300, req: ['transformer', 'mixed-precision'],
    desc: '+10 % Compute-Auslastung, Gen-4-GPUs.',
    effects: { util: 0.1 },
  },
  'mega-cluster': {
    name: 'Mega-Cluster', year: 2022.5, cost: 500, req: ['distributed', 'scaling-laws'],
    desc: 'Eigener Server-Standort mit tausenden GPUs, Gen-5-GPUs.',
    effects: { failRed: 0.02 },
  },
  'long-context': {
    name: 'Long Context', year: 2023.2, cost: 500, req: ['flash-attention'],
    desc: '+5 % Coding & Language.',
    effects: { skills: { coding: 0.05, language: 0.05 } },
  },
  cot: {
    name: 'Chain-of-Thought', year: 2022.8, cost: 600, req: ['rlhf'],
    desc: 'Schritt für Schritt denken. +5 % LLM-Qualität, +8 % Math & Reasoning.',
    effects: { capBoost: 0.05, skills: { math: 0.08, reasoning: 0.08 } },
  },
  'synthetic-data': {
    name: 'Synthetic Data', year: 2023.8, cost: 600, req: ['scaling-laws', 'rlhf'],
    desc: 'Eigene Modelle erzeugen Trainingsdaten. Neue Datasets.',
    effects: {},
  },
  multimodal: {
    name: 'Multimodal (Bild, Audio, Video)', year: 2023.5, cost: 700, req: ['transformer', 'cnn', 'rlhf'],
    desc: 'Modelle sehen und hören. +5 % Language & Reasoning.',
    effects: { skills: { language: 0.05, reasoning: 0.05 } },
  },
  'tool-use': {
    name: 'Tool Use', year: 2023.4, cost: 800, req: ['cot'],
    desc: 'Modelle nutzen Rechner, Suche und Code. +3 % Qualität, +8 % Coding & Math.',
    effects: { capBoost: 0.03, skills: { coding: 0.08, math: 0.08 } },
  },
  hyperscale: {
    name: 'Hyperscale-Infrastruktur', year: 2024, cost: 1000, req: ['mega-cluster'],
    desc: 'Schaltet den Hyperscale-Campus frei (100 MW).',
    effects: {},
  },
  reasoning: {
    name: 'Reasoning (Test-Time Compute)', year: 2024.3, cost: 1200, req: ['cot', 'synthetic-data'],
    desc: 'Modelle denken vor der Antwort lange nach. +8 % Qualität, +10 % Math & Reasoning.',
    effects: { capBoost: 0.08, skills: { math: 0.1, reasoning: 0.1 } },
  },
  agents: {
    name: 'Agents', year: 2025, cost: 1500, req: ['tool-use', 'reasoning'],
    desc: 'Modelle erledigen lange Aufgaben selbstständig. +5 % Qualität, +8 % Coding.',
    effects: { capBoost: 0.05, skills: { coding: 0.08, reasoning: 0.05 } },
  },
  'next-gen-arch': {
    name: 'Next-Gen Architekturen', year: 2026.3, cost: 2000, req: ['moe', 'reasoning'],
    desc: 'Bis 10 trillion Parameter, Gen-6-GPUs, +4 % Qualität.',
    effects: { maxParams: 1e13, capBoost: 0.04 },
  },
  gigawatt: {
    name: 'Gigawatt-Rechenzentren', year: 2026, cost: 2500, req: ['hyperscale'],
    desc: 'Schaltet den Gigawatt-Campus frei (1 GW).',
    effects: {},
  },
};
