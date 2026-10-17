// Büros: Platz begrenzt die Teamgröße. rent = Miete pro Woche (1985-Preise, steigt mit salaryIndex)
// morale: Wohlfühl-Bonus fürs Team; cost: einmalige Umzugskosten
export const OFFICES = [
  { id: 'room', name: 'Kinderzimmer', icon: '🛏️', seats: 1, rent: 0, cost: 0, morale: 0 },
  { id: 'garage', name: 'Garage', icon: '🚗', seats: 4, rent: 120, cost: 2500, morale: 2 },
  { id: 'small', name: 'Kleines Büro', icon: '🏠', seats: 10, rent: 600, cost: 15000, morale: 5 },
  { id: 'floor', name: 'Büroetage', icon: '🏢', seats: 30, rent: 2200, cost: 80000, morale: 7 },
  { id: 'building', name: 'Bürogebäude', icon: '🏬', seats: 80, rent: 7000, cost: 400000, morale: 9 },
  { id: 'campus', name: 'Campus', icon: '🏙️', seats: 200, rent: 22000, cost: 2.5e6, morale: 12 },
  { id: 'hq', name: 'Global HQ', icon: '🌍', seats: 500, rent: 70000, cost: 2e7, morale: 15 },
];

// Team-Hardware. bonus = Tempo-Multiplikator; cost = pro Arbeitsplatz; year = verfügbar ab
// Ältere Hardware verliert langsam ihren Bonus (Generationswechsel).
export const HARDWARE = [
  { id: 'laptop', name: 'Alter Laptop', icon: '💻', bonus: 1.0, cost: 0, year: 1985 },
  { id: 'pc', name: 'Eigener PC', icon: '🖥️', bonus: 1.12, cost: 1500, year: 1985 },
  { id: 'workstation', name: 'Workstation', icon: '🧮', bonus: 1.25, cost: 4000, year: 1990 },
  { id: 'highend', name: 'High-End-Rechner', icon: '⚡', bonus: 1.4, cost: 6000, year: 2000 },
  { id: 'clouddev', name: 'Cloud-Dev-Umgebung', icon: '☁️', bonus: 1.6, cost: 9000, year: 2012 },
  { id: 'aidev', name: 'KI-Workstations', icon: '🧠', bonus: 1.85, cost: 15000, year: 2022 },
];
export const HW_AGING = { graceYears: 6, perYear: 0.03, floor: 0.82 };
