// Ziele: werden der Reihe nach angezeigt (gleichzeitig ein kleines Tutorial). reward in $.
// Die Bedingungen stehen in js/engine/goals.js (gleiche id).

export const GOALS = [
  { id: 'buy-pc', text: 'Kauf einen PC (Infra → Shop → Maschinen)', reward: 300 },
  { id: 'install-gpu', text: 'Bau eine GPU in deinen PC ein', reward: 200 },
  { id: 'buy-data', text: 'Kauf ein Dataset (Labor → Daten)', reward: 200 },
  { id: 'train', text: 'Trainiere dein erstes Modell', reward: 300 },
  { id: 'deliver', text: 'Liefere einen Auftrag (Business)', reward: 500 },
  { id: 'app', text: 'Starte ein Modell als App', reward: 500 },
  { id: 'hire', text: 'Stell jemanden ein', reward: 1000 },
  { id: 'upgrade', text: 'Rüste eine Komponente auf (CPU, RAM, Kühlung …)', reward: 500 },
  { id: 'two-gpus', text: 'Bau eine Maschine mit 2 GPUs', reward: 1000 },
  { id: 'funding', text: 'Hol dir eine Finanzierung (Business → Firma)', reward: 0 },
  { id: 'transformer', text: 'Erforsche Transformer', reward: 5000 },
  { id: 'llm', text: 'Trainiere ein Sprachmodell (LLM)', reward: 10000 },
  { id: 'quantize', text: 'Quantisiere ein Modell', reward: 10000 },
  { id: 'server', text: 'Kauf einen GPU-Server', reward: 20000 },
  { id: 'sft', text: 'Mach ein LLM per SFT chatfähig', reward: 50000 },
  { id: 'chat', text: 'Starte deine Chat-Website', reward: 50000 },
  { id: 'users', text: 'Erreiche 100.000 Chat-Nutzer', reward: 200000 },
  { id: 'top10', text: 'Komm in die Top 10 des LLM-Rankings', reward: 1000000 },
  { id: 'top3', text: 'Komm in die Top 3', reward: 10000000 },
  { id: 'top1', text: 'Werde Nummer 1', reward: 100000000 },
];
