// Auftrags-Board

export const CONTRACTS = {
  maxOpen: 5,
  newChance: 0.7,          // Chance pro Woche auf einen neuen Auftrag (wenn Platz)
  minScore: [55, 92],       // Spanne der geforderten Mindestqualität
  expires: [4, 9],          // Wochen, bis der Auftrag verfällt
  difficultyExp: 2.5,       // Belohnung * (Position in der Score-Spanne + 0.6)^exp
  repBonus: 200,            // +1 % Belohnung pro 2 Ruf
  llmRange: [0.2, 0.8],     // LLM-Deals fordern 20–80 % des besten Rivalen-Scores
  llmMinBest: 10,
  // Zusatz-Anforderungen (Chance, Belohnungs-Faktor)
  edge: { chance: 0.3, mult: 1.6 },   // "muss auf Gerät X laufen" (VRAM bzw. Parameter-Limit)
  domain: { chance: 0.45, mult: 1.8 }, // LLM: Fach-Score ≥ X
  skill: { chance: 0.25, mult: 1.3 },  // LLM: z. B. Coding ≥ X
  // Ziel-Geräte für Edge-Aufträge (VRAM in GB). Kleine Modelle: maximale Parameter.
  devices: [
    { name: 'Smartphone', vram: 4, year: 2015 },
    { name: 'Laptop mit RTX-GPU', vram: 8, year: 2018 },
    { name: 'RTX 4090 (24 GB)', vram: 24, year: 2022.8 },
    { name: 'eine L40S (48 GB)', vram: 48, year: 2023.6 },
    { name: 'eine H100 (80 GB)', vram: 80, year: 2023 },
  ],
  smallEdge: [1e5, 3e5, 1e6, 3e6, 1e7],
  clients: [
    'Stadtwerke Kiel', 'Mode-Shop Berlin', 'Logistik GmbH', 'Startup aus München', 'Versicherung AG',
    'Online-Buchhandel', 'Uni-Lehrstuhl', 'Bank-Filiale', 'Streaming-Dienst', 'Krankenhaus-IT',
    'Autozulieferer', 'Telko-Konzern', 'Reiseportal', 'Spiele-Studio', 'Lieferdienst',
    'Kanzlei Weber & Partner', 'Uniklinik Hamburg', 'Callcenter-Dienstleister', 'Smartphone-Hersteller',
  ],
};

// Stammkunden: gelieferte Aufträge werden mit dieser Chance zum wöchentlichen Abo
export const SUBS = {
  chance: 0.4,
  share: 0.06,     // 6 % des Auftragswerts pro Woche
  weeks: [16, 30],
  max: 12,
};

// App-Einnahmen kleiner Modelle: appBase * (Score/100)^2 * (1 + Ruf/100). LLMs verdienen über Produkte.
export const APPS = {
  scoreExp: 2,
  repFactor: 100,
};
