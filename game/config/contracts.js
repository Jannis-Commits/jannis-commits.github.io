// Auftrags-Board

export const CONTRACTS = {
  maxOpen: 5,
  newChance: 0.7,          // Chance pro Woche auf einen neuen Auftrag (wenn Platz)
  minScore: [55, 92],       // Spanne der geforderten Mindestqualität
  expires: [3, 8],          // Wochen, bis der Auftrag verfällt
  difficultyExp: 2.5,       // Belohnung * (Position in der Score-Spanne + 0.6)^exp
  repBonus: 200,            // +1 % Belohnung pro 2 Ruf
  llmRange: [0.2, 0.8],     // LLM-Lizenz-Deals fordern 20–80 % des besten Rivalen-Scores
  llmMinBest: 10,
  clients: [
    'Stadtwerke Kiel', 'Mode-Shop Berlin', 'Logistik GmbH', 'Startup aus München', 'Versicherung AG',
    'Online-Buchhandel', 'Uni-Lehrstuhl', 'Bank-Filiale', 'Streaming-Dienst', 'Krankenhaus-IT',
    'Autozulieferer', 'Telko-Konzern', 'Reiseportal', 'Spiele-Studio', 'Lieferdienst',
  ],
};

// App-Einnahmen kleiner Modelle: appBase * (Score/100)^2 * (1 + Ruf/100). LLMs verdienen über Produkte.
export const APPS = {
  scoreExp: 2,
  repFactor: 100,
};
