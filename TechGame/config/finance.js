// Investoren-Runden. Werden angeboten, sobald der Firmenwert die Schwelle erreicht.
// share:   Anteil, den Investoren bekommen     premium: Aufschlag auf den Firmenwert
// growth:  Ziel – Umsatz/Woche muss bis zur Deadline auf das x-fache steigen
// weeks:   Zeit bis zur Deadline              penaltyShare: zusätzliche Anteile bei verfehltem Ziel
// minRev:  nötiger Jahresumsatz                 Zwischen zwei Runden liegen mindestens ROUND_GAP Wochen
export const ROUNDS = [
  { id: 'seed', name: 'Seed-Runde', investor: 'Business Angel', minValue: 60000, minRev: 40000, minAmount: 25000, share: 0.15, premium: 1.3, growth: 2.5, weeks: 78, penaltyShare: 0.05 },
  { id: 'a', name: 'Series A', investor: 'Venture Capital', minValue: 2e6, minRev: 1e6, minAmount: 400000, share: 0.15, premium: 1.25, growth: 2.2, weeks: 78, penaltyShare: 0.05 },
  { id: 'b', name: 'Series B', investor: 'Growth Fund', minValue: 2.5e7, minRev: 1e7, minAmount: 4e6, share: 0.12, premium: 1.2, growth: 1.9, weeks: 104, penaltyShare: 0.04 },
  { id: 'c', name: 'Series C', investor: 'Staatsfonds', minValue: 2.5e8, minRev: 8e7, minAmount: 3e7, share: 0.1, premium: 1.15, growth: 1.6, weeks: 104, penaltyShare: 0.04 },
  { id: 'preipo', name: 'Pre-IPO', investor: 'Investmentbank', minValue: 1.5e9, minRev: 3e8, minAmount: 1.5e8, share: 0.08, premium: 1.1, growth: 1.4, weeks: 104, penaltyShare: 0.03 },
];

export const ROUND_GAP = 52;
