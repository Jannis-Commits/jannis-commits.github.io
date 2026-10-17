// Rollen im Team. salary = Wochengehalt 1985 bei Skill 50 (steigt mit salaryIndex)
// work: arbeitet an Projekten mit; global: wirkt automatisch auf die ganze Firma
export const ROLES = [
  { id: 'dev', name: 'Developer', short: 'Dev', icon: '👩‍💻', salary: 640, work: true, desc: 'Schreibt den Code. Rückgrat jedes Projekts.' },
  { id: 'design', name: 'Designer', short: 'Design', icon: '🎨', salary: 560, work: true, desc: 'Konzept & UI. Wichtig für Qualität, vor allem bei Spielen und Apps.' },
  { id: 'qa', name: 'QA / Tester', short: 'QA', icon: '🐞', salary: 470, work: true, desc: 'Findet und fixt Bugs im Testing und im Support.' },
  { id: 'marketing', name: 'Marketing', short: 'Mkt', icon: '📣', salary: 520, global: true, desc: 'Erzeugt Hype und verstärkt Kampagnen.' },
  { id: 'sales', name: 'Sales', short: 'Sales', icon: '🤝', salary: 560, global: true, desc: 'Verkauft an Firmen – mehr Business-Kunden und Lizenzen.' },
  { id: 'research', name: 'Research', short: 'R&D', icon: '🔬', salary: 700, work: true, desc: 'Erforscht neue Technologien (am besten im Forschungs-Team).' },
];
export const ROLE = Object.fromEntries(ROLES.map((r) => [r.id, r]));

// Wie häufig welche Rolle im Bewerberpool auftaucht
export const ROLE_WEIGHTS = { dev: 4, design: 2, qa: 2, marketing: 1.2, sales: 1, research: 1.4 };

export const FIRST_NAMES = [
  'Anna', 'Ben', 'Clara', 'David', 'Elif', 'Finn', 'Greta', 'Hannes', 'Ida', 'Jonas', 'Kira', 'Lukas', 'Mia', 'Noah',
  'Olga', 'Paul', 'Quentin', 'Rosa', 'Sven', 'Tara', 'Ugo', 'Vera', 'Wanda', 'Yusuf', 'Zoe', 'Aiko', 'Bruno', 'Chen',
  'Dana', 'Emil', 'Fatma', 'Gabriel', 'Hiro', 'Irina', 'Jakob', 'Lea', 'Marta', 'Nils', 'Omar', 'Priya', 'Raj',
  'Sara', 'Tim', 'Uma', 'Valentin', 'Wei', 'Xenia', 'Yara', 'Linus', 'Ada', 'Grace', 'Alan', 'Ken', 'Margaret',
];
export const LAST_NAMES = [
  'Müller', 'Schmidt', 'Weber', 'Fischer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter', 'Klein',
  'Wolf', 'Neumann', 'Schwarz', 'Braun', 'Zimmermann', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Lehmann', 'Kaya',
  'Yilmaz', 'Nguyen', 'Tanaka', 'Kowalski', 'Novak', 'Rossi', 'Garcia', 'Silva', 'Smith', 'Jensen', 'Larsen',
  'Okafor', 'Patel', 'Kim', 'Ivanova', 'Dubois', 'Berg', 'Vogel', 'Frank', 'Sommer', 'Winter', 'Brandt',
];
