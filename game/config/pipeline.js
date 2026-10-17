// Post-Training, Quantisierung, Distillation, Evals.

// Post-Training-Methoden (nur LLMs). boost schrumpft den Abstand zum Optimum (wie früher capBoost),
// aber pro Modell statt global. data = welche Datasets passen (Feld "use" in datasets.js).
// tokPerParam = so viele Tokens pro Parameter braucht die Methode für die volle Wirkung.
export const METHODS = {
  sft: {
    name: 'SFT (Instruction-Tuning)', short: 'SFT', research: 'instruction-tuning', data: 'sft',
    boost: 0.05, chat: true, flopMult: 1, tokPerParam: 0.03,
    desc: 'Lernt Anweisungen zu folgen → chatfähig. Mit Domänen-Daten wird es Experte.',
  },
  rlhf: {
    name: 'RLHF', short: 'RLHF', research: 'rlhf', data: 'pref', group: 'pref', needs: 'sft',
    boost: 0.07, flopMult: 3, tokPerParam: 0.01,
    desc: 'Reward-Modell + PPO. Teuer, aber stark.',
  },
  dpo: {
    name: 'DPO', short: 'DPO', research: 'dpo', data: 'pref', group: 'pref', needs: 'sft',
    boost: 0.06, flopMult: 1.2, tokPerParam: 0.01,
    desc: 'Präferenz-Tuning ohne Reward-Modell. Fast so gut, viel billiger.',
  },
  reasoning: {
    name: 'Reasoning-RL', short: 'Reasoning', research: 'reasoning', data: 'reasoning', needs: 'sft',
    boost: 0.1, skills: { math: 0.1, reasoning: 0.1 }, flopMult: 8, tokPerParam: 0.05,
    desc: 'RL auf überprüfbaren Aufgaben: das Modell lernt lange nachzudenken.',
  },
  agentic: {
    name: 'Agentic-RL', short: 'Agent', research: 'agents', data: 'agent', needs: 'sft',
    boost: 0.06, skills: { coding: 0.08, reasoning: 0.04 }, flopMult: 10, tokPerParam: 0.05,
    desc: 'RL in echten Umgebungen: Tools, Code, lange Aufgaben.',
  },
};

// Wie Gewichte beim Post-Training angepasst werden
export const ADAPTERS = {
  full: { name: 'Full', eff: 1, flop: 1, desc: 'Alle Gewichte. Beste Wirkung, braucht am meisten VRAM.' },
  lora: { name: 'LoRA', eff: 0.85, flop: 0.7, feature: 'lora', desc: 'Nur kleine Adapter (~1 %). Viel weniger VRAM.' },
  qlora: { name: 'QLoRA', eff: 0.8, flop: 0.8, feature: 'qlora', desc: 'LoRA auf 4-Bit-Basis. Riesige Modelle auf kleinen GPUs.' },
};

// Quantisierung: Loss-Faktor je Bits und Methoden-Stufe (1 naiv, 2 GPTQ, 3 AWQ, 4 QAT). null = nicht möglich.
export const QUANT = {
  methods: ['', 'Naiv (RTN)', 'GPTQ', 'AWQ', 'QAT'],
  bits: {
    8: [1.01, 1.005, 1.003, 1.002],
    4: [1.06, 1.03, 1.02, 1.012],
    3: [null, 1.07, 1.05, 1.03],
    2: [null, null, null, 1.07],
  },
  weeks: 1,
};

export const DISTILL = {
  tokenMults: [1, 2, 4],  // × Chinchilla-Tokens (20 pro Parameter)
  dataBoost: 3,           // Lehrer-Daten zählen 3× so viel wie normale
  teacherGap: 1.005,      // Schüler-Loss mindestens Lehrer-Loss × 1,005
  domainKeep: 0.95,
  maxRatio: 0.5,          // Schüler höchstens halb so groß
};

export const EVAL = {
  noise: 5,               // ungetestete LLMs: Anzeige ±5 Punkte daneben
  weeks: 1,
};

export const DOMAINS = {
  medical: { name: 'Medizin', icon: '🩺' },
  legal: { name: 'Recht', icon: '⚖️' },
  code: { name: 'Software', icon: '💻' },
  support: { name: 'Support', icon: '🎧' },
};
