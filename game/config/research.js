// Forschungsbaum. cost = Forschungspunkte, req = Voraussetzungen, year = frühestens ab, branch = Zweig.
// effects:
//   maxParams      höchste wählbare Parameter-Anzahl
//   util           + Compute-Auslastung (MFU)
//   failRed        − Absturzrisiko pro Woche
//   quality        + Dataset-Qualität (absolut)
//   taskLoss       { task: −Loss } bessere Ergebnisse für einen Modell-Typ
//   skills         { skill: +Multiplikator } für alle LLMs
//   capBoost       globaler Qualitäts-Boost für LLMs (Prompting-Techniken)
//   quantLevel     Quantisierungs-Methode (1 naiv … 4 QAT)
//   cluster        + Cluster-Effizienz
//   features       Freischaltungen (siehe Texte)

export const BRANCHES = {
  basics: 'Grundlagen',
  infra: 'Infrastruktur',
  training: 'Training',
  arch: 'Architektur',
  post: 'Post-Training',
  data: 'Daten',
  inference: 'Inferenz',
};

export const RESEARCH_TREE = {
  // ---------- Grundlagen ----------
  logreg: {
    name: 'ML-Grundlagen', branch: 'basics', cost: 0, req: [],
    desc: 'Logistische Regression & Co. Schaltet Spam-Filter frei.',
    effects: { maxParams: 1e6 },
  },
  'neural-nets': {
    name: 'Neuronale Netze', branch: 'basics', cost: 15, req: ['logreg'],
    desc: 'Schaltet Ziffernerkennung frei. Bis 10 million Parameter.',
    effects: { maxParams: 1e7 },
  },
  recsys: {
    name: 'Collaborative Filtering', branch: 'basics', cost: 25, req: ['logreg'],
    desc: 'Schaltet Empfehlungssysteme frei.',
    effects: {},
  },
  dialog: {
    name: 'Dialog-Systeme', branch: 'basics', cost: 30, req: ['logreg'],
    desc: 'Schaltet Regel-Chatbots frei.',
    effects: {},
  },
  cnn: {
    name: 'CNNs', branch: 'basics', cost: 60, req: ['neural-nets', 'gpu-training'],
    desc: 'Schaltet Bilderkennung frei, bessere Ziffernerkennung.',
    effects: { taskLoss: { digits: 0.5 } },
  },
  rnn: {
    name: 'RNNs & LSTMs', branch: 'basics', cost: 60, req: ['neural-nets'],
    desc: 'Bessere Chatbots durch Sequenzmodelle.',
    effects: { taskLoss: { chatbot: 1 } },
  },
  embeddings: {
    name: 'Word Embeddings', branch: 'basics', cost: 70, req: ['rnn'],
    desc: 'Schaltet Wikipedia frei, bessere Text-Modelle.',
    effects: { taskLoss: { chatbot: 0.5, spam: 1 } },
  },
  attention: {
    name: 'Attention', branch: 'basics', cost: 120, req: ['rnn', 'embeddings'],
    desc: 'Modelle lernen, worauf es ankommt.',
    effects: { taskLoss: { chatbot: 0.5, image: 0.2 } },
  },
  transformer: {
    name: 'Transformer', branch: 'arch', year: 2017.4, cost: 180, req: ['attention'],
    desc: 'Schaltet Sprachmodelle (LLMs) und große Text-Datasets frei.',
    effects: {},
  },

  // ---------- Infrastruktur ----------
  'gpu-training': {
    name: 'GPU-Training (CUDA)', branch: 'infra', cost: 40, req: ['neural-nets'],
    desc: 'GPUs laufen doppelt so schnell. Workstation-Tower & Profi-GPUs. Bis 100 million Parameter.',
    effects: { maxParams: 1e8, features: ['cuda'] },
  },
  'datacenter-hw': {
    name: 'Datacenter-Hardware', branch: 'infra', cost: 90, req: ['gpu-training'],
    desc: 'Rechenzentrums-GPUs, 4U-Server und HGX-Nodes. Bis 1 billion Parameter.',
    effects: { maxParams: 1e9 },
  },
  distributed: {
    name: 'Distributed Training', branch: 'infra', cost: 220, req: ['datacenter-hw', 'mixed-precision'],
    desc: 'InfiniBand, Server-Etage, +5 % Cluster-Effizienz, bis 13 billion Parameter.',
    effects: { maxParams: 1.3e10, failRed: 0.002, cluster: 0.05 },
  },
  rocm: {
    name: 'ROCm-Support', branch: 'infra', year: 2022.5, cost: 300, req: ['datacenter-hw'],
    desc: 'AMD-GPUs laufen fast so gut wie NVIDIA (Malus 30 % → 8 %).',
    effects: { features: ['rocm'] },
  },
  'mega-cluster': {
    name: 'Mega-Cluster', branch: 'infra', year: 2022.5, cost: 500, req: ['distributed', 'scaling-laws'],
    desc: 'Eigenes Rechenzentrum (20 MW), +3 % Cluster-Effizienz, weniger Abstürze.',
    effects: { failRed: 0.002, cluster: 0.03 },
  },
  hyperscale: {
    name: 'Hyperscale-Infrastruktur', branch: 'infra', year: 2024, cost: 1000, req: ['mega-cluster'],
    desc: 'Schaltet den Hyperscale-Campus frei (300 MW).',
    effects: {},
  },
  'rack-scale': {
    name: 'Rack-Scale-Systeme', branch: 'infra', year: 2024.9, cost: 1200, req: ['mega-cluster'],
    desc: 'NVL72-Racks: 72 GPUs in einer NVLink-Domäne.',
    effects: {},
  },
  gigawatt: {
    name: 'Gigawatt-Rechenzentren', branch: 'infra', year: 2026, cost: 2500, req: ['hyperscale'],
    desc: 'Schaltet den Gigawatt-Campus frei (1,5 GW).',
    effects: {},
  },

  // ---------- Training ----------
  'grad-ckpt': {
    name: 'Gradient Checkpointing', branch: 'training', year: 2016.3, cost: 60, req: ['neural-nets'],
    desc: 'Aktivierungen −87 % VRAM, dafür +33 % Rechenzeit.',
    effects: { features: ['grad-ckpt'] },
  },
  'mixed-precision': {
    name: 'Mixed Precision (BF16)', branch: 'training', year: 2017.8, cost: 100, req: ['datacenter-hw'],
    desc: 'Training in 16 Bit: halber Speicher, Tensor Cores voll nutzbar.',
    effects: { features: ['fp16'] },
  },
  megatron: {
    name: 'Tensor-Parallelismus', branch: 'training', year: 2019.7, cost: 200, req: ['transformer', 'mixed-precision'],
    desc: 'Ein Modell über alle GPUs einer Maschine verteilen (Training & Inferenz).',
    effects: { features: ['tensor-parallel'] },
  },
  zero: {
    name: 'ZeRO-Sharding', branch: 'training', year: 2020.1, cost: 250, req: ['distributed'],
    desc: 'Optimizer-States und Gradienten auf alle GPUs verteilen.',
    effects: { features: ['zero'] },
  },
  offload: {
    name: 'CPU-Offload', branch: 'training', year: 2021.1, cost: 200, req: ['zero'],
    desc: 'Optimizer-States in den RAM auslagern. Spart viel VRAM, kostet 45 % Tempo.',
    effects: { features: ['offload'] },
  },
  fsdp: {
    name: 'FSDP (ZeRO-3)', branch: 'training', year: 2021.8, cost: 350, req: ['zero'],
    desc: 'Auch die Gewichte selbst werden über alle GPUs verteilt.',
    effects: { features: ['fsdp'] },
  },
  'flash-attention': {
    name: 'FlashAttention', branch: 'training', year: 2022.4, cost: 300, req: ['transformer', 'mixed-precision'],
    desc: '+10 % Compute-Auslastung.',
    effects: { util: 0.1 },
  },
  'fp8-training': {
    name: 'FP8-Training', branch: 'training', year: 2023.5, cost: 600, req: ['flash-attention'],
    desc: 'Doppelte Geschwindigkeit auf GPUs mit FP8 (RTX 4090, H100 …).',
    effects: { features: ['fp8'] },
  },
  'fp4-training': {
    name: 'FP4-Training', branch: 'training', year: 2025.5, cost: 1500, req: ['fp8-training'],
    desc: 'Nochmal doppelt so schnell auf Blackwell & Co. Kleiner Qualitätsverlust.',
    effects: { features: ['fp4'] },
  },

  // ---------- Architektur ----------
  'scaling-laws': {
    name: 'Scaling Laws', branch: 'arch', year: 2020, cost: 300, req: ['transformer', 'distributed'],
    desc: 'Bis 175 billion Parameter, kuratierte Datasets.',
    effects: { maxParams: 1.75e11 },
  },
  moe: {
    name: 'Mixture of Experts', branch: 'arch', year: 2021, cost: 400, req: ['scaling-laws'],
    desc: 'MoE: 4× weniger Compute pro Parameter. Bis 1 trillion Parameter.',
    effects: { maxParams: 1e12, features: ['moe'] },
  },
  'long-context': {
    name: 'Long Context', branch: 'arch', year: 2023.2, cost: 500, req: ['flash-attention'],
    desc: '+5 % Coding & Language.',
    effects: { skills: { coding: 0.05, language: 0.05 } },
  },
  multimodal: {
    name: 'Multimodal (Bild, Audio, Video)', branch: 'arch', year: 2023.5, cost: 700, req: ['transformer', 'cnn', 'rlhf'],
    desc: 'Modelle sehen und hören. +5 % Language & Reasoning.',
    effects: { skills: { language: 0.05, reasoning: 0.05 } },
  },
  'next-gen-arch': {
    name: 'Next-Gen Architekturen', branch: 'arch', year: 2026.3, cost: 2000, req: ['moe', 'reasoning'],
    desc: 'Bis 10 trillion Parameter, +4 % Qualität.',
    effects: { maxParams: 1e13, capBoost: 0.04 },
  },

  // ---------- Post-Training ----------
  distill: {
    name: 'Distillation', branch: 'post', cost: 50, req: ['neural-nets'],
    desc: 'Großes Modell bringt einem kleinen bei: fast gleich gut, viel billiger zu betreiben.',
    effects: { features: ['distill'] },
  },
  'instruction-tuning': {
    name: 'Instruction Tuning (SFT)', branch: 'post', year: 2021.8, cost: 250, req: ['transformer'],
    desc: 'Post-Training „SFT“: LLMs folgen Anweisungen und werden chatfähig.',
    effects: { features: ['sft'] },
  },
  lora: {
    name: 'LoRA', branch: 'post', year: 2021.5, cost: 200, req: ['transformer'],
    desc: 'Fine-Tuning mit kleinen Adaptern: ~10× weniger VRAM.',
    effects: { features: ['lora'] },
  },
  rlhf: {
    name: 'RLHF', branch: 'post', year: 2022.2, cost: 400, req: ['instruction-tuning'],
    desc: 'Post-Training „RLHF“ mit menschlichem Feedback. Präferenz-Daten im Shop.',
    effects: {},
  },
  cot: {
    name: 'Chain-of-Thought', branch: 'post', year: 2022.8, cost: 600, req: ['rlhf'],
    desc: 'Schritt für Schritt denken. +3 % Qualität, +8 % Math & Reasoning für alle LLMs.',
    effects: { capBoost: 0.03, skills: { math: 0.08, reasoning: 0.08 } },
  },
  qlora: {
    name: 'QLoRA', branch: 'post', year: 2023.4, cost: 300, req: ['lora', 'gptq'],
    desc: 'LoRA auf einer 4-Bit-Basis: 70B-Modelle auf einer 48-GB-GPU fine-tunen.',
    effects: { features: ['qlora'] },
  },
  dpo: {
    name: 'DPO', branch: 'post', year: 2023.5, cost: 400, req: ['rlhf'],
    desc: 'Präferenz-Tuning ohne Reward-Modell: fast so gut wie RLHF, 2,5× billiger.',
    effects: {},
  },
  'tool-use': {
    name: 'Tool Use', branch: 'post', year: 2023.4, cost: 800, req: ['cot'],
    desc: 'Modelle nutzen Rechner, Suche und Code. +3 % Qualität, +8 % Coding & Math.',
    effects: { capBoost: 0.03, skills: { coding: 0.08, math: 0.08 } },
  },
  reasoning: {
    name: 'Reasoning (Test-Time Compute)', branch: 'post', year: 2024.6, cost: 1200, req: ['cot', 'synthetic-data'],
    desc: 'Post-Training „Reasoning-RL“: Modelle denken lange nach.',
    effects: {},
  },
  agents: {
    name: 'Agents', branch: 'post', year: 2025, cost: 1500, req: ['tool-use', 'reasoning'],
    desc: 'Post-Training „Agentic-RL“: Modelle erledigen lange Aufgaben selbstständig.',
    effects: {},
  },

  // ---------- Daten ----------
  'data-cleaning': {
    name: 'Data Cleaning', branch: 'data', cost: 50, req: ['logreg'],
    desc: '+0,05 Qualität auf alle Datasets.',
    effects: { quality: 0.05 },
  },
  'code-models': {
    name: 'Code-Modelle', branch: 'data', cost: 200, req: ['transformer'],
    desc: '+15 % Coding für LLMs.',
    effects: { skills: { coding: 0.15 } },
  },
  'synthetic-data': {
    name: 'Synthetic Data', branch: 'data', year: 2023.8, cost: 600, req: ['scaling-laws', 'rlhf'],
    desc: 'Eigene Modelle erzeugen Trainingsdaten. Neue Datasets.',
    effects: {},
  },

  // ---------- Inferenz ----------
  quantization: {
    name: 'Quantisierung', branch: 'inference', cost: 60, req: ['neural-nets'],
    desc: 'Modelle auf 8/4 Bit verkleinern (naiv): weniger VRAM, schnellere Inferenz.',
    effects: { quantLevel: 1 },
  },
  gptq: {
    name: 'GPTQ', branch: 'inference', year: 2022.9, cost: 300, req: ['quantization', 'transformer'],
    desc: 'Bessere 4-Bit-Quantisierung, 3 Bit möglich.',
    effects: { quantLevel: 2 },
  },
  gqa: {
    name: 'Grouped-Query Attention', branch: 'inference', year: 2023.3, cost: 250, req: ['transformer'],
    desc: 'KV-Cache −50 %: doppelt so viele Anfragen gleichzeitig.',
    effects: { features: ['gqa'] },
  },
  awq: {
    name: 'AWQ', branch: 'inference', year: 2023.4, cost: 400, req: ['gptq'],
    desc: 'Aktivierungs-bewusste Quantisierung: noch weniger Verlust.',
    effects: { quantLevel: 3 },
  },
  'paged-attention': {
    name: 'PagedAttention (vLLM)', branch: 'inference', year: 2023.5, cost: 400, req: ['gqa'],
    desc: 'KV-Cache ohne Verschnitt: doppelte Batch-Größe.',
    effects: { features: ['paged'] },
  },
  'spec-decode': {
    name: 'Speculative Decoding', branch: 'inference', year: 2023.6, cost: 500, req: ['paged-attention', 'distill'],
    desc: 'Kleiner Entwurf, großes Modell prüft: +40 % Tokens pro Sekunde.',
    effects: { features: ['spec'] },
  },
  qat: {
    name: 'Quantization-Aware Training', branch: 'inference', year: 2024.3, cost: 800, req: ['awq'],
    desc: 'Fast verlustfreie 4 Bit, 2 Bit möglich.',
    effects: { quantLevel: 4 },
  },
};
