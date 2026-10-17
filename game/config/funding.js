// Finanzierungsrunden. Bedingungen: minYear, minIncome ($/Woche), minModels, minLlm (bester LLM-Score),
// minRep, minUsers. money = frisches Geld, equity = Anteil, den du abgibst.

export const ROUNDS = [
  { id: 'angel', name: 'Angel-Investment', money: 40000, equity: 0.08, req: { minModels: 1, minIncome: 300 } },
  { id: 'seed', name: 'Seed', money: 400000, equity: 0.12, req: { minIncome: 3000, minRep: 8 } },
  { id: 'a', name: 'Series A', money: 4000000, equity: 0.15, req: { minIncome: 25000, minRep: 15, minYear: 2017.5 } },
  { id: 'b', name: 'Series B', money: 40000000, equity: 0.15, req: { minIncome: 200000, minLlm: 15, minYear: 2019 } },
  { id: 'c', name: 'Series C', money: 400000000, equity: 0.12, req: { minIncome: 1500000, minLlm: 45, minYear: 2021.5 } },
  { id: 'd', name: 'Series D', money: 4000000000, equity: 0.1, req: { minIncome: 10000000, minLlm: 70, minUsers: 5e6 } },
  { id: 'ipo', name: 'Börsengang (IPO)', money: 25000000000, equity: 0.15, req: { minIncome: 60000000, minLlm: 85, minUsers: 5e7 } },
];
