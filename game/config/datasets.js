// Datasets: einmal kaufen, für immer nutzen.
// tokens = Trainingsbeispiele/Tokens, quality 0–1, mix = Anteile der Fähigkeiten (nur für LLMs).
// year = ab wann verfügbar, research = benötigte Forschung.
// upsample = zählt im Fähigkeiten-Mix so viel stärker (kleine, wertvolle Datasets).

export const DATASETS = {
  'sms-spam': {
    name: 'SMS-Spam (klein)', cost: 0, tokens: 2e6, quality: 0.7, tags: ['spam'],
    desc: 'Ein paar tausend SMS, teils falsch gelabelt.',
  },
  'enron-spam': {
    name: 'E-Mail-Spam-Archiv', cost: 400, tokens: 3e7, quality: 0.8, tags: ['spam'],
    desc: 'Großes E-Mail-Archiv mit sauberen Labels.',
  },
  'mnist': {
    name: 'Handschrift-Ziffern', cost: 0, tokens: 5e7, quality: 0.95, tags: ['digits'],
    desc: 'Klassiker: 70.000 handgeschriebene Ziffern.',
  },
  'movie-ratings': {
    name: 'Film-Bewertungen', cost: 300, tokens: 1e8, quality: 0.8, tags: ['ratings'],
    desc: '20 Mio. Nutzerbewertungen.',
  },
  'shop-logs': {
    name: 'Shop-Klickdaten', cost: 3000, tokens: 2e9, quality: 0.6, tags: ['ratings'],
    desc: 'Viel, aber verrauscht.', research: 'recsys',
  },
  'dialog-scripts': {
    name: 'Support-Dialoge', cost: 800, tokens: 2e7, quality: 0.65, tags: ['dialog'],
    desc: 'Mitschnitte aus Callcentern.', research: 'dialog',
  },
  'movie-subs': {
    name: 'Film-Untertitel', cost: 2500, tokens: 5e8, quality: 0.55, tags: ['dialog', 'text'],
    mix: { language: 0.9, reasoning: 0.1 },
    desc: 'Riesige Menge Alltagsdialog.', research: 'dialog',
  },
  'imagenet': {
    name: 'Bild-Datenbank (1 Mio. Bilder)', cost: 2000, tokens: 1e10, quality: 0.85, tags: ['images'],
    desc: 'Gelabelte Fotos in 1.000 Kategorien.', research: 'cnn',
  },
  'newsgroups': {
    name: 'Newsgroup-Text', cost: 500, tokens: 2e8, quality: 0.6, tags: ['text'],
    mix: { language: 0.8, reasoning: 0.15, coding: 0.05 },
    desc: 'Alte Forenbeiträge.',
  },
  'wikipedia': {
    name: 'Wikipedia-Dump', cost: 1500, tokens: 3e9, quality: 0.85, tags: ['text'],
    mix: { language: 0.65, reasoning: 0.25, math: 0.1 },
    desc: 'Sauber, aber begrenzt.', research: 'embeddings',
  },
  'github-code': {
    name: 'Open-Source-Code', cost: 8000, tokens: 2e10, quality: 0.6, tags: ['text'],
    mix: { coding: 0.8, language: 0.1, reasoning: 0.1 },
    desc: 'Code aus öffentlichen Repos.', research: 'transformer', year: 2018,
  },
  'arxiv-math': {
    name: 'Mathe-Paper', cost: 20000, tokens: 1e10, quality: 0.8, tags: ['text'],
    mix: { math: 0.6, reasoning: 0.3, language: 0.1 },
    desc: 'Wissenschaftliche Paper mit viel Mathe.', research: 'transformer', year: 2018.5,
  },
  'books': {
    name: 'Kuratierte Bücher', cost: 50000, tokens: 2e10, quality: 0.9, tags: ['text'],
    mix: { language: 0.6, reasoning: 0.4 },
    desc: 'Hochwertig und lang.', research: 'transformer', year: 2018,
  },
  'web-crawl': {
    name: 'Web-Crawl (schmutzig)', cost: 5000, tokens: 3e11, quality: 0.35, tags: ['text'],
    mix: { language: 0.6, reasoning: 0.15, coding: 0.15, math: 0.1 },
    desc: 'Riesig, aber voller Müll.', research: 'transformer', year: 2019,
  },
  'curated-web': {
    name: 'Kuratierter Web-Crawl', cost: 150000, tokens: 1e12, quality: 0.75, tags: ['text'],
    mix: { language: 0.45, reasoning: 0.2, coding: 0.2, math: 0.15 },
    desc: 'Gefiltert und dedupliziert.', research: 'scaling-laws', year: 2020.5,
  },
  'code-instruct': {
    name: 'Code-Instruct', cost: 400000, tokens: 2e11, quality: 0.9, tags: ['text'], upsample: 15,
    mix: { coding: 0.8, reasoning: 0.15, language: 0.05 },
    desc: 'Aufgaben mit geprüften Lösungen.', research: 'code-models', year: 2021.5,
  },
  'mega-mix': {
    name: 'Mega-Mix (15 trillion Tokens)', cost: 5000000, tokens: 1.5e13, quality: 0.8, tags: ['text'],
    mix: { language: 0.45, reasoning: 0.2, coding: 0.2, math: 0.15 },
    desc: 'Das halbe Internet, sauber gefiltert.', research: 'mega-cluster', year: 2023,
  },
  'reasoning-traces': {
    name: 'Reasoning-Traces', cost: 1000000, tokens: 1e11, quality: 0.95, tags: ['text'], upsample: 40,
    mix: { math: 0.4, reasoning: 0.5, coding: 0.1 },
    desc: 'Lange, geprüfte Lösungswege.', research: 'cot', year: 2024,
  },
  synthetic: {
    name: 'Synthetische Daten (generiert)', cost: 20000000, tokens: 3e13, quality: 0.88, tags: ['text'], upsample: 2,
    mix: { reasoning: 0.35, math: 0.25, coding: 0.25, language: 0.15 },
    desc: 'Von deinen eigenen Modellen erzeugt und gefiltert.', research: 'synthetic-data', year: 2024.3,
  },
  'agent-trajectories': {
    name: 'Agent-Trajektorien', cost: 8000000, tokens: 3e11, quality: 0.95, tags: ['text'], upsample: 30,
    mix: { coding: 0.45, reasoning: 0.45, math: 0.1 },
    desc: 'Mitschnitte von Agents, die echte Aufgaben lösen.', research: 'agents', year: 2025.3,
  },
};
