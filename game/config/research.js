// Forschungsbaum. cost = Forschungspunkte, req = Voraussetzungen.
// effects:
//   maxParams      höchste wählbare Parameter-Anzahl
//   util           + Compute-Auslastung
//   failRed        − Trainingsrisiko
//   quality        + Dataset-Qualität (absolut)
//   taskLoss       { task: −Loss } bessere Ergebnisse für einen Modell-Typ
//   skills         { skill: +Multiplikator } für LLMs
//   features       ['quantize', 'moe']

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
    desc: 'MoE-Architektur: 4× weniger Compute pro Parameter.',
    effects: { maxParams: 1e12, features: ['moe'] },
  },
};
