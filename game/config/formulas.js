// Globale Balancing-Werte. Alles hier ist frei anpassbar.

export const START = {
  money: 3000,
  location: 'room',
  year: 2015,
};

// Zeit: 1 Runde = 1 Woche, aber ein Spieljahr hat nur so viele Runden.
// So läuft die Geschichte (Rivalen, Hardware-Generationen) gestaucht ab.
export const WEEKS_PER_YEAR = 26;

// Scaling Law (Chinchilla-Stil): Loss = E + A/N^alpha + B/D^beta
export const SCALING = {
  E: 1.69,
  A: 406.4,
  B: 410.7,
  alpha: 0.34,
  beta: 0.28,
  qualityExp: 2,          // D_eff = Tokens * Qualität^qualityExp
  epochGain: 0.6,         // jede weitere Epoche bringt 60 % neuer Daten (effektiv)
  maxEpochs: 4,
  tokensPerParam: 20,     // Chinchilla-Optimum (nur Hinweis im UI)
  overfitRatio: 4,        // Overfitting, wenn Parameter · 4 · √Epochen > einzigartige Tokens
  overfitLoss: 0.5,       // Loss-Strafe * overfit^2
  noise: 0.03,            // ±3 % Zufall auf den Loss beim Trainingsende
};

// LLM-Fähigkeiten: cap = 100 / (1 + ((L - E) / capScale)^capExp)
export const LLM = {
  capScale: 0.25,
  capExp: 2,
  skillFloor: 0.35,       // Fähigkeit = cap * clamp(floor + gain * sqrt(Anteil im Dataset))
  skillGain: 1.1,
  domainBase: 0.6,        // ohne Fine-Tuning: Domänen-Score = 60 % vom Gesamt-Score
};

export const COMPUTE = {
  baseUtilization: 0.3,   // Anteil der Peak-FLOP/s, der real im Training ankommt (MFU)
  maxUtilization: 0.7,
  secondsPerWeek: 604800,
  noCuda: 0.5,            // ohne "GPU-Training (CUDA)" laufen GPUs nur halb so gut
  amd: 0.7,               // AMD ohne ROCm-Forschung
  amdRocm: 0.92,
  intraPcie: 0.85,        // Effizienz mehrerer GPUs in einer Maschine
  intraBridge: 0.93,
  intraSxm: 0.97,
  softExp: 0.5,           // Engpass-Strafe: (Feed / Bedarf)^0.5
  idlePower: 0.3,         // Maschinen ohne Rolle ziehen 30 % Strom
};

// Training: Absturz-, Spike- und Checkpoint-Mechanik
export const TRAINING = {
  crashPerWeek: 0.004,    // Basis-Absturzrisiko pro Woche
  crashPerLog10Gpu: 0.006, // + pro Zehnerpotenz GPUs
  crashPerLog10Size: 0.002, // + pro Zehnerpotenz Parameter über 100 million
  crashOverfit: 0.03,
  crashThrottle: 0.03,    // + wenn Maschinen überhitzen
  minCrash: 0.002,
  lr: {
    low: { name: 'Niedrig', loss: 1.012, spike: 0.004 },
    mid: { name: 'Mittel', loss: 1, spike: 0.02 },
    high: { name: 'Hoch', loss: 0.99, spike: 0.06 },
  },
  spikeRecover: 0.6,      // "Weiter trainieren": 60 % Chance, dass sich der Loss erholt
  spikePenalty: 1.01,
  ckptOptions: [0, 4, 2, 1], // Checkpoint alle N Wochen (0 = nie)
  ckptCopies: 2,
  ckptBytesPerParam: 14,
  curveStart: 2.2,        // Loss-Kurve startet bei Endwert × 2,2
};

export const ECONOMY = {
  powerPrice: 0.15,             // $ pro kWh
  hostingPerBillionParams: 300, // $ pro Woche pro billion Parameter (fp16) für kleine Apps
  bankruptWeeks: 4,             // so viele Wochen im Minus = Game Over
  sellRefund: 0.5,              // Hardware-Verkauf bringt 50 % vom aktuellen Preis
  moveDepositWeeks: 4,          // Umzug kostet 4 Wochenmieten Kaution
  eraGrowth: 104,               // Auftragswerte steigen um +100 % alle 104 Wochen
  priceDrop: 0.88,              // Hardware-Preise fallen jedes Jahr nach Release auf 88 %
  priceFloor: 0.4,
  usedPrice: 0.45,              // Gebraucht: 45 % vom Neupreis
  usedMinAge: 1.5,              // erst 1,5 Jahre nach Release gebraucht zu haben
  defectPerGpu: 0.0015,         // GPU-Defekt pro GPU und Woche
  defectUsed: 4,                // gebrauchte GPUs fallen 4× so oft aus
  defectHot: 2,                 // überhitzte Maschinen 2× so oft
  repairCost: 0.4,              // Reparatur = 40 % vom Preis
  salaryGrowth: 0.12,           // Gehälter +12 % (linear) pro Jahr seit Start
};

export const RESEARCH = {
  founderPoints: 2,
  researcherPoints: 4,
  queueMax: 3,
};

export const PARAM_STEPS = [
  1e5, 3e5, 1e6, 3e6, 1e7, 3e7, 1e8, 3e8, 1e9, 3e9, 7e9, 1.3e10, 3e10, 7e10, 1.75e11, 4e11, 1e12, 3e12, 1e13,
];

export const MOE = {
  activeShare: 0.25,      // nur 25 % der Parameter sind pro Token aktiv (Compute)
  qualityExp: 0.9,        // Qualität rechnet mit N^0.9 statt N
};

// Präzision fürs Training
export const PRECISION = {
  fp32: { name: 'FP32', bytes: 4, loss: 1 },
  fp16: { name: 'BF16', bytes: 2, loss: 1, feature: 'fp16' },
  fp8: { name: 'FP8', bytes: 1, loss: 1.004, feature: 'fp8' },
  fp4: { name: 'FP4', bytes: 0.5, loss: 1.015, feature: 'fp4' },
};

// VRAM-Rechner (Bytes pro Parameter)
export const MEMORY = {
  optim: 12,              // FP32-Master-Gewichte (4) + Adam m & v (8)
  actGb: 2.2,             // Aktivierungen: 2,2 GB × (aktive Parameter in Mrd.)^0,7 × Präzision/BF16
  actExp: 0.7,
  ckptAct: 0.125,         // Gradient Checkpointing: Aktivierungen −87,5 %
  ckptSpeed: 0.75,        // … kostet +33 % Compute
  loraShare: 0.004,       // LoRA trainiert ~0,4 % der Parameter
  qloraBytes: 0.52,       // QLoRA: Basis-Gewichte in 4 Bit (NF4 + Skalen)
  offloadSpeed: 0.55,     // CPU-Offload: Optimizer im RAM, Durchsatz −45 %
  overheadGb: 0.4,        // CUDA-Kontext, Puffer
  kvPerB: 0.02,           // KV-Cache: GB pro Anfrage pro billion aktiver Parameter (4k Kontext)
  gqaKv: 0.5,
  batchMax: 128,
  pagedBatch: 2,
  specDecode: 1.4,
  inferUtil: 0.4,
  cpuBw: 40,              // GB/s, wenn ohne GPU auf der CPU gerechnet wird
};
