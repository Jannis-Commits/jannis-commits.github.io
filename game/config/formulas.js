// Globale Balancing-Werte. Alles hier ist frei anpassbar.

export const START = {
  money: 2000,
  location: 'room',
  hardware: { laptop: 1 },
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
  // Post-Training (capBoost aus der Forschung) schrumpft den Abstand (L - E): excess * Π(1 - boost)
};

export const COMPUTE = {
  baseUtilization: 0.3,   // Anteil der Peak-FLOP/s, der real im Training ankommt
  secondsPerWeek: 604800,
  engineerUtil: 0.02,     // +2 % Auslastung pro Engineer
  engineerUtilCap: 0.2,
};

export const TRAINING = {
  baseFail: 0.15,
  failPerEngineer: 0.02,
  minFail: 0.03,
  overfitFail: 0.1,       // + pro Overfit-Stufe
};

export const ECONOMY = {
  powerPrice: 0.15,             // $ pro kWh
  hostingPerBillionParams: 300, // $ pro Woche pro billion Parameter (fp16) für Apps
  bankruptWeeks: 4,             // so viele Wochen im Minus = Game Over
  sellRefund: 0.5,              // Hardware-Verkauf bringt 50 %
  moveDepositWeeks: 4,          // Umzug kostet 4 Wochenmieten Kaution
  eraGrowth: 104,               // Auftragswerte steigen um +100 % alle 104 Wochen
};

export const RESEARCH = {
  founderPoints: 2,
  researcherPoints: 4,
};

export const PARAM_STEPS = [
  1e5, 3e5, 1e6, 3e6, 1e7, 3e7, 1e8, 3e8, 1e9, 3e9, 1e10, 3e10, 1e11, 3e11, 1e12, 3e12, 1e13,
];

export const QUANT = {
  8: { lossMult: 1.01, hosting: 0.5 },
  4: { lossMult: 1.04, hosting: 0.25 },
};

export const MOE = {
  activeShare: 0.25,      // nur 25 % der Parameter sind pro Token aktiv (Compute)
  qualityExp: 0.9,        // Qualität rechnet mit N^0.9 statt N
};
