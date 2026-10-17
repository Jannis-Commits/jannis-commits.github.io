// Prestige-Boosts: Nach einem Sieg wählst du 1 aus 3 zufälligen. Sie gelten in allen folgenden Runs.
// fx wird beim Spielstart bzw. in den Formeln ausgewertet (siehe engine/effects.js → boost()).
export const BOOSTS = [
  { id: 'money', name: 'Erspartes', icon: '💰', desc: 'Startkapital ×3', fx: { startMoney: 3 } },
  { id: 'founder', name: 'Wunderkind', icon: '🧒', desc: 'Gründer startet mit +20 Skill', fx: { founderSkill: 20 } },
  { id: 'research', name: 'Nerd-Gene', icon: '🔬', desc: '+20 % Forschungstempo', fx: { researchSpeed: 0.2 } },
  { id: 'speed', name: 'Flow-State', icon: '⚡', desc: '+12 % Entwicklungstempo', fx: { devSpeed: 0.12 } },
  { id: 'rep', name: 'Bekannter Name', icon: '⭐', desc: 'Start mit 20 Ruf', fx: { startRep: 20 } },
  { id: 'salary', name: 'Verhandlungsprofi', icon: '🤝', desc: 'Gehälter −10 %', fx: { salary: -0.1 } },
  { id: 'bugs', name: 'Sauberer Code', icon: '🧹', desc: '−20 % Bugs', fx: { bugs: 0.2 } },
  { id: 'marketing', name: 'Hype-Maschine', icon: '📣', desc: '+30 % Marketing-Wirkung', fx: { marketing: 0.3 } },
  { id: 'garage', name: 'Startplatz Garage', icon: '🚗', desc: 'Start direkt in der Garage', fx: { startOffice: 1 } },
  { id: 'morale', name: 'Gute Vibes', icon: '😊', desc: '+10 Moral fürs ganze Team', fx: { morale: 10 } },
  { id: 'loans', name: 'Bank-Kontakte', icon: '🏦', desc: 'Kreditzinsen −50 %, Limit ×2', fx: { loans: 0.5 } },
  { id: 'quality', name: 'Perfektionist', icon: '💎', desc: '+4 Qualität auf alles', fx: { quality: 4 } },
];
export const BOOST = Object.fromEntries(BOOSTS.map((b) => [b.id, b]));
