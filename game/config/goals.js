// Meilensteine mit Belohnung (der Reihe nach). why = warum das wichtig ist.
// Die Bedingungen stehen in js/engine/goals.js (gleiche id).

export const GOALS = [
  { id: 'install-gpu', text: 'Kauf einen Rechner mit GPU', why: 'GPUs rechnen hundertmal schneller als dein Laptop.', reward: 500 },
  { id: 'train', text: 'Trainiere dein erstes Modell', why: 'Modelle sind dein Produkt.', reward: 1000 },
  { id: 'deliver', text: 'Liefere einen Auftrag', why: 'Schnelles Geld – und oft ein Stammkunde.', reward: 1500 },
  { id: 'app', text: 'Starte ein Modell als App', why: 'Passives Einkommen jede Woche.', reward: 2000 },
  { id: 'hire', text: 'Stell jemanden ein', why: 'Researcher beschleunigen die Forschung enorm.', reward: 3000 },
  { id: 'funding', text: 'Hol dir eine Finanzierung', why: 'Investoren-Geld = mehr GPUs.', reward: 0 },
  { id: 'transformer', text: 'Erforsche Transformer', why: 'Der Schlüssel zu Sprachmodellen.', reward: 10000 },
  { id: 'llm', text: 'Trainiere ein Sprachmodell (LLM)', why: 'LLMs sind das große Geschäft.', reward: 25000 },
  { id: 'sft', text: 'Mach ein LLM per SFT chatfähig', why: 'Nur chatfähige Modelle können in die Chat-Website.', reward: 100000 },
  { id: 'chat', text: 'Starte deine Chat-Website', why: 'Abos + Fach-Märkte = richtig Umsatz.', reward: 100000 },
  { id: 'users', text: 'Erreiche 100.000 Chat-Nutzer', why: 'Wachstum zieht die nächsten Investoren an.', reward: 500000 },
  { id: 'top10', text: 'Komm in die Top 10 des LLM-Rankings', why: 'Ab hier spielst du in der ersten Liga.', reward: 2000000 },
  { id: 'top3', text: 'Komm in die Top 3', why: 'Mehr Nutzer, mehr Marktanteil.', reward: 20000000 },
  { id: 'top1', text: 'Werde Nummer 1', why: 'Die AGI-Krone.', reward: 200000000 },
];
