// Schwierigkeitsstufen. Rivalen folgen immer der echten Timeline – die Stufe bestimmt, wie leicht du aufholst.
// trainEff = Trainings-Effizienz (benötigte FLOPs ÷ trainEff), research = Forschungstempo,
// marketExp = wie stark der Marktanteil am Score hängt (niedriger = auch schwächere Modelle verdienen),
// funding = Faktor auf das Geld aus Finanzierungsrunden.

export const DIFFICULTY = {
  easy: {
    name: 'Leicht', icon: '🌱', money: 25000, trainEff: 40, research: 2.5, marketExp: 1.3, funding: 1.5,
    desc: 'Viel Startgeld, sehr effizientes Training. Top 5 um 2022 möglich.',
  },
  normal: {
    name: 'Normal', icon: '⚖️', money: 10000, trainEff: 8, research: 1.8, marketExp: 1.6, funding: 1,
    desc: 'Ausgewogen. Bei solidem Spiel Top 5 um 2024.',
  },
  hard: {
    name: 'Schwer', icon: '🔥', money: 3000, trainEff: 2.5, research: 1.2, marketExp: 2.2, funding: 0.5,
    desc: 'Wenig Geld, harte Konkurrenz. Top 5 erst um 2026.',
  },
};

export const DEFAULT_DIFFICULTY = 'normal';
