// Zentrale Balancing-Werte. Alles, was sich "nach Gefühl" anpassen lässt, steht hier.

export const START = {
  year: 1985,
  money: 6000,
  reputation: 0,
  founderName: 'Du',
  founderSkill: 42,
  founderSpeed: 1.0,
  office: 0,
  hardware: 0,
};

export const TIME = {
  weeksPerYear: 52,
  skipMaxWeeks: 26,       // ⏩ spult höchstens so weit vor
};

// Inflation/Wachstum: Gehälter & Kosten steigen über die Jahre
export const salaryIndex = (year) => 1 + Math.max(0, year - 1985) * 0.045;
// Projekte werden über die Jahrzehnte aufwendiger
export const workIndex = (year) => {
  const t = Math.max(0, year - 1985);
  return 1 + t * 0.11 + t * t * 0.0022;
};

export const WORK = {
  pointsPerWeek: 1.0,         // Basis-Leistung eines MA (speed 1, skill 50)
  phaseShare: { concept: 0.15, dev: 0.85 }, // Anteil am Gesamtaufwand
  roleWeight: {               // wie stark eine Rolle in der Phase zählt
    concept: { dev: 0.5, design: 1.6, qa: 0.3, founder: 1 },
    dev: { dev: 1.0, design: 0.6, qa: 0.4, founder: 1 },
    test: { dev: 0.4, design: 0.2, qa: 1.5, founder: 0.6 },
  },
  extraPlatform: 0.35,        // Mehraufwand pro zusätzlicher Plattform
  updateWorkFactor: 0.65,     // Update (v2, v3 …) braucht weniger Arbeit
  crunchSpeed: 1.4,
  crunchBugs: 1.9,
  crunchMorale: -32,
  budgetLevels: [             // Budget pro Woche (× salaryIndex × Kategorie-Faktor)
    { name: 'Sparsam', cost: 0, quality: 0, speed: 0 },
    { name: 'Normal', cost: 150, quality: 4, speed: 0.06 },
    { name: 'Großzügig', cost: 450, quality: 8, speed: 0.12 },
    { name: 'All-in', cost: 1200, quality: 12, speed: 0.18 },
  ],
};

export const QUALITY = {
  wSkill: 0.42, wDesign: 0.16, wFeatures: 0.24, wTech: 0.18,
  bugPenaltyPerBug: 0.35,     // Qualitätspunkte pro Bug bei Release
  maxBugPenalty: 30,
};

export const BUGS = {
  perPoint: 1.1,              // Bugs pro Entwicklungspunkt (vor Skill-Abzug)
  skillReduce: 0.7,           // hoher Skill → weniger Bugs
  qaFixPerPoint: 2.6,         // im Testing behobene Bugs pro QA-Punkt
  supportFixPerPoint: 3.0,    // nach Release behobene Bugs pro Support-Punkt
  ratingPenaltyPerBug: 0.03,
  maxRatingPenalty: 2.2,
  userBugsPerMillion: 0.4,    // neue Bugs, die Nutzer pro Woche finden (je Mio. Nutzer)
  patchEvery: 6,              // so viele behobene Bugs ergeben einen Patch
};

export const MARKET = {
  shareExponent: 1.6,
  adoption: 0.06,             // Nutzer bewegen sich pro Woche so weit Richtung Ziel
  decline: 0.06,
  othersScore: 2.2,           // fragmentierter Rest-Markt (viele kleine Anbieter)
  othersScoreLate: 0.5,      // … wird mit der Zeit konsolidiert
  visibilityBase: 0.05,       // unbekannte Firma: nur so sichtbar
  turnoverOneTime: 0.003,     // Wiederkäufe/Neukäufe pro Woche bei Einmalkauf
  retailCut: 0.5,             // Anteil, der bei Einmalkauf ankommt
  priceElasticity: { oneTime: 1.25, subscription: 1.5, license: 1.0 },
  priceDemandClamp: [0.04, 2.6],
  ratingMid: 3,
  eraPenalty: 0.75,           // Ära verschlafen
  eraGraceWeeks: 104,
};

export const STAFF = {
  applicants: 4,
  refreshWeeks: 4,
  searchCost: 300,            // × salaryIndex
  hireFeeWeeks: 2,            // Einstellung kostet x Wochengehälter (Recruiting)
  xpPerLevel: 22,
  maxLevel: 20,
  skillPerLevel: [1, 4],
  salaryRaisePerLevel: 0.04,
  moraleBase: 68,
  quitMorale: 28,
  quitChance: 0.05,
  raiseMorale: 18,
  raiseFactor: 0.12,
  freelanceRate: 1.15,        // Auftragsarbeit: verdient x × eigenes Gehalt (Gründer: fester Satz)
  founderFreelance: 260,      // $/Woche im Jahr 1985
};

export const RESEARCH = {
  roleFactor: { research: 1.6, dev: 0.75, design: 0.5, qa: 0.4, founder: 0.8, marketing: 0.2, sales: 0.2 },
};

export const MARKETING = {
  hypeDecay: 0.05,
  staffBoostPerSkill: 0.004,  // jeder Marketing-Skillpunkt +0,4 % Wirkung
  passiveHypePerStaff: 0.6,
};

export const SALES = {
  businessBoostPerSkill: 0.003,
};

export const REPUTATION = {
  fromRating: { 5: 3, 4: 1.5, 3: 0, 2: -2, 1: -4 },
  openSourcePerWeek: 0.04,
  decayTo: 20,
};

export const FINANCE = {
  bankruptWeeks: 8,
  loanRate: 0.085,            // Jahreszins
  loanTerms: [52, 104, 208],
  loanBaseLimit: 15000,
  loanRevenueFactor: 0.6,     // Limit = Jahresumsatz × Faktor
  valueBaseMultiple: 3,
  valueGrowthMultiple: 4,
  valueRepMultiple: 2,
  ipoMultiple: 1.6,
  ipoMinValue: 2e9,
  ipoMinRevenueYear: 200e6,
  ipoFloat: 0.2,
  quarterWeeks: 13,
};

export const ECOSYSTEM = {
  devBase: 120,               // Drittentwickler je (Mio. Nutzer)^0.8
  devAdjust: 0.05,
  appsPerDev: 0.03,
  appDecay: 0.003,
  storeBonus: 1.6,
  firstPartyApps: 60,
  appRevenuePerWeek: (year) => 6 + Math.max(0, year - 2008) * 4,  // Umsatz je App/Woche
  storeCutDefault: 0.3,
  appsFactorClamp: [0.35, 1.35],
  preinstallBoost: 0.6,
  antitrustPerWeek: 0.9,
  antitrustDecay: 0.4,
  antitrustThreshold: 60,
};

export const EVENTS = {
  startWeek: 10,
  chancePerWeek: 0.11,
  cooldownWeeks: 40,
};

export const VICTORY = {
  osShare: 0.4,
  needRank: 1,
};

export const RIVALS = {
  releaseFreshness: 0.55,     // unter dieser Aktualität kommt ein Nachfolger
  devWeeks: [16, 34],
  salaryOverhead: 1.4,
  staffGrowth: 0.025,
  priceWarDrop: 0.88,
  buyChance: 0.0008,
  buyMinAgeYears: 6,
  poachChance: 0.03,
};
