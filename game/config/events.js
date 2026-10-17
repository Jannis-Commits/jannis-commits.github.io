// Zufalls-Ereignisse. chance = pro Woche (wenn die Bedingung erfüllt ist).

export const EVENTS = {
  poach: { chance: 0.012, counterWeeks: 8 },
  lawsuit: { chance: 0.008, minCost: 20000, moneyShare: 0.03, courtWin: 0.5, courtMult: 3, rep: 5 },
  press: { chance: 0.012, rep: 3 },
  conference: { chance: 0.015, rep: 4, points: 30 },
  outage: { chance: 0.006, maxLocation: 'serverroom' },
  bigClient: { chance: 0.012, rewardMult: 3 },
};

// Marktphasen: GPU-Preise steigen zeitweise (year, Dauer in Wochen, Faktoren je GPU-Klasse)
export const MARKET_PHASES = [
  { year: 2017.9, weeks: 20, consumer: 1.6, pro: 1.2, dc: 1, text: 'Krypto-Boom: Gaming-GPUs sind ausverkauft, Preise +60 %.' },
  { year: 2020.9, weeks: 36, consumer: 2.0, pro: 1.5, dc: 1.3, text: 'Chipkrise + Krypto: GPU-Preise explodieren.' },
  { year: 2023.2, weeks: 40, consumer: 1.1, pro: 1.3, dc: 1.6, text: 'AI-Boom: Rechenzentrums-GPUs haben Wartelisten, Preise +60 %.' },
  { year: 2025.3, weeks: 20, consumer: 1.3, pro: 1.2, dc: 1.2, text: 'Speicher-Knappheit: HBM und GDDR7 werden teurer.' },
];
