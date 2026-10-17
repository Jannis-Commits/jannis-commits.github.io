// Datasets: einmal kaufen, für immer nutzen.
// tokens = Trainingsbeispiele/Tokens, quality 0–1, mix = Anteile der Fähigkeiten (nur für LLMs).
// year = ab wann verfügbar, research = benötigte Forschung.
// upsample = zählt im Fähigkeiten-Mix so viel stärker (kleine, wertvolle Datasets).
// use = wofür es taugt: 'pretrain' (Standard), 'sft', 'pref', 'reasoning', 'agent' (Post-Training, siehe pipeline.js)
// domain = Fachgebiet beim SFT. bpt = Bytes pro Token auf der Platte (Standard 2).

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
    name: 'Handschrift-Ziffern', cost: 0, tokens: 5e7, quality: 0.95, tags: ['digits'], bpt: 0.2,
    desc: 'Klassiker: 70.000 handgeschriebene Ziffern.',
  },
  'movie-ratings': {
    name: 'Film-Bewertungen', cost: 300, tokens: 1e8, quality: 0.8, tags: ['ratings'],
    desc: '20 Mio. Nutzerbewertungen.', research: 'recsys',
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
    name: 'ImageNet (1 Mio. Bilder)', cost: 2000, tokens: 1e10, quality: 0.85, tags: ['images'], bpt: 0.015,
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
    name: 'Mathe-Paper (arXiv)', cost: 20000, tokens: 1e10, quality: 0.8, tags: ['text'],
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
  'mega-mix': {
    name: 'Mega-Mix (15 trillion Tokens)', cost: 5000000, tokens: 1.5e13, quality: 0.8, tags: ['text'],
    mix: { language: 0.45, reasoning: 0.2, coding: 0.2, math: 0.15 },
    desc: 'Das halbe Internet, sauber gefiltert. Braucht ~30 TB Speicher.', research: 'mega-cluster', year: 2023,
  },
  synthetic: {
    name: 'Synthetische Daten (generiert)', cost: 20000000, tokens: 3e13, quality: 0.88, tags: ['text'], upsample: 2,
    mix: { reasoning: 0.35, math: 0.25, coding: 0.25, language: 0.15 },
    desc: 'Von deinen eigenen Modellen erzeugt und gefiltert.', research: 'synthetic-data', year: 2024.3,
  },

  // ---------- Post-Training-Daten ----------
  'support-tickets': {
    name: 'Support-Tickets (Fach-Daten)', cost: 20000, tokens: 3e9, quality: 0.7, tags: [], use: ['sft'], domain: 'support',
    desc: 'Echte Kundenanfragen mit Antworten. Für Support-Spezialisten.', research: 'transformer', year: 2019,
  },
  'legal-docs': {
    name: 'Gesetze & Urteile (Fach-Daten)', cost: 60000, tokens: 2e10, quality: 0.8, tags: [], use: ['sft'], domain: 'legal',
    desc: 'Für Rechts-Spezialisten.', research: 'transformer', year: 2020,
  },
  'medical-qa': {
    name: 'Medizin-Q&A (Fach-Daten)', cost: 80000, tokens: 5e9, quality: 0.85, tags: [], use: ['sft'], domain: 'medical',
    desc: 'Leitlinien und geprüfte Fragen. Für Medizin-Spezialisten.', research: 'transformer', year: 2021,
  },
  'code-instruct': {
    name: 'Code-Instruct', cost: 400000, tokens: 2e11, quality: 0.9, tags: ['text'], upsample: 15, use: ['pretrain', 'sft'], domain: 'code',
    mix: { coding: 0.8, reasoning: 0.15, language: 0.05 },
    desc: 'Aufgaben mit geprüften Lösungen. Pretraining oder SFT.', research: 'code-models', year: 2021.5,
  },
  'instruct-mix': {
    name: 'Instruct-Mix', cost: 60000, tokens: 2e9, quality: 0.9, tags: [], use: ['sft'],
    mix: { language: 0.5, reasoning: 0.3, coding: 0.1, math: 0.1 },
    desc: 'Frage-Antwort-Paare von Menschen geschrieben. Macht Modelle chatfähig.', research: 'instruction-tuning', year: 2021.8,
  },
  'pref-data': {
    name: 'Präferenz-Daten (Menschen)', cost: 300000, tokens: 5e8, quality: 0.9, tags: [], use: ['pref'],
    desc: 'Welche von zwei Antworten ist besser? Für RLHF und DPO.', research: 'rlhf', year: 2022.2,
  },
  'pref-ai': {
    name: 'AI-Feedback (RLAIF)', cost: 2000000, tokens: 1e10, quality: 0.85, tags: [], use: ['pref'],
    desc: 'Präferenzen von einem starken Modell bewertet. Viel mehr Daten.', research: 'dpo', year: 2023.6,
  },
  'reasoning-traces': {
    name: 'Reasoning-Traces', cost: 1000000, tokens: 1e11, quality: 0.95, tags: ['text'], upsample: 40, use: ['pretrain', 'sft', 'reasoning'],
    mix: { math: 0.4, reasoning: 0.5, coding: 0.1 },
    desc: 'Lange, geprüfte Lösungswege.', research: 'cot', year: 2024,
  },
  'verifiable-tasks': {
    name: 'Verifizierbare Aufgaben', cost: 5000000, tokens: 5e11, quality: 0.95, tags: [], use: ['reasoning'],
    desc: 'Mathe & Code mit automatischer Prüfung – Futter für Reasoning-RL.', research: 'reasoning', year: 2024.6,
  },
  'agent-trajectories': {
    name: 'Agent-Trajektorien', cost: 8000000, tokens: 3e11, quality: 0.95, tags: ['text'], upsample: 30, use: ['pretrain', 'sft', 'agent'],
    mix: { coding: 0.45, reasoning: 0.45, math: 0.1 },
    desc: 'Mitschnitte von Agents, die echte Aufgaben lösen.', research: 'agents', year: 2025.1,
  },
};
