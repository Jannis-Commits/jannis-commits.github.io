// Modell-Typen. Score = 100 / (1 + exp((Loss - l50) * slope)), außer LLM.
// research: Forschung, die den Typ freischaltet. tag: benötigter Dataset-Tag.

export const TASKS = {
  spam: {
    name: 'Spam-Filter', icon: '✉️', tag: 'spam', research: 'logreg',
    l50: 14.3, slope: 0.43, minWeeks: 1,
    contractBase: 600, appBase: 450, rep: 1,
  },
  digits: {
    name: 'Ziffernerkennung', icon: '🔢', tag: 'digits', research: 'neural-nets',
    l50: 9.0, slope: 0.9, minWeeks: 1,
    contractBase: 1500, appBase: 900, rep: 1,
  },
  recommender: {
    name: 'Empfehlungssystem', icon: '🛒', tag: 'ratings', research: 'recsys',
    l50: 8.0, slope: 1.0, minWeeks: 2,
    contractBase: 3500, appBase: 2400, rep: 2,
  },
  chatbot: {
    name: 'Regel-Chatbot', icon: '💬', tag: 'dialog', research: 'dialog',
    l50: 10.0, slope: 0.6, minWeeks: 2,
    contractBase: 4500, appBase: 3000, rep: 2,
  },
  image: {
    name: 'Bilderkennung', icon: '🖼️', tag: 'images', research: 'cnn',
    l50: 4.3, slope: 2.5, minWeeks: 2,
    contractBase: 12000, appBase: 9000, rep: 3,
  },
  llm: {
    name: 'Sprachmodell (LLM)', icon: '🧠', tag: 'text', research: 'transformer',
    minWeeks: 3,
    contractBase: 50000, rep: 5,
    contractScore: 'rival', // Lizenz-Deals: Spanne hängt vom besten Rivalen ab (contracts.js)
  },
};

export const SKILLS = {
  language: 'Language',
  coding: 'Coding',
  math: 'Math',
  reasoning: 'Reasoning',
};
