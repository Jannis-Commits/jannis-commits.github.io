// LLM-Produkte: Chat-Website, API, Open Source. Alle Werte frei anpassbar.

// Gesamtmarkt Chat-Nutzer (alle Anbieter): marketMax / (1 + exp(-(Jahr - mid) * k)) + base
export const CHAT = {
  marketMax: 1e9,
  mid: 2025.5,
  k: 1.2,
  base: 3e5,
  prices: [0, 5, 10, 20, 30, 50, 100, 200],   // $ pro Monat
  baseConversion: 0.06,       // Anteil zahlender Nutzer bei 20 $
  refPrice: 20,
  priceElasticity: 1.3,       // Conversion ∝ (20 / Preis)^1.3
  maxConversion: 0.35,
  growth: 0.15,               // Nutzer nähern sich dem Ziel um 15 % pro Woche
  tokensFree: 15000,          // Tokens pro Nutzer pro Woche
  tokensPaid: 60000,
  repFactor: 200,             // Ziel-Nutzer * (1 + Ruf/200)
};

// API-Markt in Tokens pro Woche (alle Anbieter)
export const API = {
  marketMax: 5e13,
  mid: 2026,
  k: 1.3,
  base: 1e9,
  prices: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100],  // $ pro 1M Tokens
  refPriceStart: 60,          // Marktpreis 2019, fällt jedes Jahr um refPriceDrop
  refPriceDrop: 0.6,
  refPriceMin: 0.5,
  priceElasticity: 1.4,
  maxPriceFactor: 4,
  codingWeight: 0.5,          // API-Kunden achten zur Hälfte auf Coding
  growth: 0.2,
};

// Nachfrage hängt auch davon ab, wie nützlich ein Modell absolut ist: (Score / 50)^1.5, max. 1,6
export const USEFULNESS = {
  ref: 50,
  exp: 1.5,
  max: 1.6,
};

export const OPEN_SOURCE = {
  repPerScore: 0.25,          // Ruf + Score * 0.25 (einmalig, max. 100)
};

export const INFERENCE = {
  shares: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
  defaultShare: 0.3,
  churnPerOverload: 0.15,     // bei 200 % Last verlierst du 15 % der Nutzer pro Woche
  repLossOverload: 0.5,
};
