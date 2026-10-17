// Produktkategorien. Neue Kategorie = neuer Eintrag hier (+ Features in features.js).
//
// group:      'desktop' (läuft auf Desktop-OS), 'mobile' (läuft auf Mobile-OS), 'web' (im Browser/Server),
//             'os' (ist selbst eine Plattform), 'store' (App-Store, braucht eigenes OS)
// unlock:     Forschung, die nötig ist (null = von Anfang an)
// year:       frühestes Jahr, in dem es den Markt gibt
// market:     potenzielle Nutzer insgesamt [Jahr, Nutzer] – dazwischen wird interpoliert
// audience:   Aufteilung des Markts auf Privat (p), Business (b), Entwickler (d)
// refPrice:   "normaler" Preis je Zielgruppe (Einmalkauf in $, Abo/Lizenz pro Monat)
// work:       Grundaufwand in Personen-Wochen (wird mit den Jahren größer, siehe workIndex)
// lifetime:   nach so vielen Wochen ist ein Produkt deutlich veraltet
// serverCost: $ pro Nutzer und Woche für Online-Modelle
export const PRODUCT_TYPES = [
  {
    id: 'tool', name: 'Tool / Utility', icon: '🛠️', group: 'desktop', unlock: null, year: 1985,
    desc: 'Kleine Helfer: Dateimanager, Packer, Taschenrechner. Schnell gebaut, kleiner Markt.',
    market: [[1985, 1.5e6], [1995, 50e6], [2005, 300e6], [2015, 500e6], [2030, 650e6]],
    audience: { p: 0.5, b: 0.3, d: 0.2 }, refPrice: { p: 29, b: 99, d: 59 },
    models: ['oneTime', 'subscription', 'freemium', 'license', 'openSource'],
    work: 3.5, designIdeal: 0.15, lifetime: 160, serverCost: 0.0005, branches: ['lang', 'ui'],
  },
  {
    id: 'game', name: 'Spiel', icon: '🎮', group: 'desktop', unlock: 'lang_graphics', year: 1985,
    desc: 'Vom Textadventure zum 3D-Shooter. Hit-getrieben, Design zählt viel.',
    market: [[1985, 1.5e6], [1995, 45e6], [2005, 220e6], [2015, 600e6], [2030, 1.1e9]],
    audience: { p: 0.85, b: 0.03, d: 0.12 }, refPrice: { p: 39, b: 39, d: 39 },
    models: ['oneTime', 'subscription', 'freemium', 'ads'],
    work: 14, designIdeal: 0.32, lifetime: 110, serverCost: 0.001, branches: ['lang', 'ui'],
  },
  {
    id: 'office', name: 'Office-Suite', icon: '📄', group: 'desktop', unlock: 'ui_gui', year: 1986,
    desc: 'Textverarbeitung, Tabellen, Präsentationen. Business liebt es – und bleibt treu.',
    market: [[1986, 1e6], [1995, 60e6], [2005, 350e6], [2015, 700e6], [2030, 1e9]],
    audience: { p: 0.35, b: 0.55, d: 0.1 }, refPrice: { p: 79, b: 299, d: 149 },
    models: ['oneTime', 'subscription', 'license', 'freemium', 'openSource'],
    work: 55, designIdeal: 0.2, lifetime: 210, serverCost: 0.002, branches: ['ui', 'lang'],
  },
  {
    id: 'database', name: 'Datenbank / Server', icon: '🗄️', group: 'desktop', unlock: 'net_lan', year: 1985,
    desc: 'Server-Software für Firmen. Wenige Kunden, aber teure Lizenzen.',
    market: [[1985, 0.04e6], [1995, 1.2e6], [2005, 6e6], [2015, 11e6], [2030, 16e6]],
    audience: { p: 0.03, b: 0.77, d: 0.2 }, refPrice: { p: 40, b: 420, d: 120 },
    models: ['license', 'oneTime', 'subscription', 'openSource'],
    work: 60, designIdeal: 0.08, lifetime: 230, serverCost: 0, branches: ['net', 'sec', 'lang'],
  },
  {
    id: 'browser', name: 'Browser', icon: '🧭', group: 'desktop', unlock: 'net_www', year: 1993,
    desc: 'Das Tor zum Internet. Anfangs verkauft, später gratis – Marktanteil ist Macht.',
    market: [[1993, 0.2e6], [1996, 40e6], [2000, 350e6], [2010, 1.8e9], [2030, 4.2e9]],
    audience: { p: 0.7, b: 0.22, d: 0.08 }, refPrice: { p: 25, b: 45, d: 25 },
    models: ['oneTime', 'ads', 'openSource', 'freemium'],
    work: 45, designIdeal: 0.18, lifetime: 120, serverCost: 0.0002, branches: ['net', 'ui', 'sec'],
  },
  {
    id: 'web_service', name: 'Online-Dienst', icon: '🔎', group: 'web', unlock: 'net_webapps', year: 1995,
    desc: 'Suchmaschine, Webmail, Social Network. Gratis für Nutzer, bezahlt durch Werbung.',
    market: [[1995, 10e6], [2000, 300e6], [2010, 2.2e9], [2020, 4.2e9], [2030, 5.5e9]],
    audience: { p: 0.8, b: 0.15, d: 0.05 }, refPrice: { p: 5, b: 15, d: 8 },
    models: ['ads', 'freemium', 'subscription'],
    work: 45, designIdeal: 0.22, lifetime: 150, serverCost: 0.004, branches: ['net', 'cloud', 'ui'],
  },
  {
    id: 'os_desktop', name: 'Betriebssystem (Desktop)', icon: '🪟', group: 'os', unlock: 'lang_kernel', year: 1985,
    desc: 'Die Königsdisziplin. Wer das OS stellt, bestimmt, worauf alle anderen laufen.',
    market: [[1985, 4e6], [1995, 110e6], [2005, 650e6], [2015, 1.25e9], [2030, 1.45e9]],
    audience: { p: 0.6, b: 0.33, d: 0.07 }, refPrice: { p: 99, b: 179, d: 129 },
    models: ['oneTime', 'license', 'openSource', 'subscription'],
    work: 160, designIdeal: 0.18, lifetime: 260, serverCost: 0, branches: ['lang', 'ui', 'sec'],
  },
  {
    id: 'mobile_app', name: 'Mobile App', icon: '📲', group: 'mobile', unlock: 'mob_apps', year: 2008,
    desc: 'Apps für Smartphones. Riesiger Markt, kleine Preise – Freemium regiert.',
    market: [[2008, 15e6], [2012, 1.2e9], [2020, 3.6e9], [2030, 5.2e9]],
    audience: { p: 0.82, b: 0.13, d: 0.05 }, refPrice: { p: 3, b: 8, d: 5 },
    models: ['oneTime', 'freemium', 'ads', 'subscription'],
    work: 22, designIdeal: 0.3, lifetime: 100, serverCost: 0.001, branches: ['mobile', 'ui'],
  },
  {
    id: 'os_mobile', name: 'Betriebssystem (Mobile)', icon: '📱', group: 'os', unlock: 'mob_os', year: 2005,
    desc: 'Das OS in jeder Hosentasche. Ohne Apps wertlos, mit Apps unschlagbar.',
    market: [[2005, 60e6], [2010, 600e6], [2015, 2.6e9], [2030, 5.4e9]],
    audience: { p: 0.85, b: 0.12, d: 0.03 }, refPrice: { p: 25, b: 35, d: 25 },
    models: ['license', 'openSource', 'oneTime'],
    work: 220, designIdeal: 0.24, lifetime: 200, serverCost: 0, branches: ['mobile', 'ui', 'sec'],
  },
  {
    id: 'cloud', name: 'Cloud-Dienst', icon: '☁️', group: 'web', unlock: 'cloud_iaas', year: 2006,
    desc: 'Rechenleistung und Speicher als Abo für Firmen. Hohe Serverkosten, riesige Margen bei Größe.',
    market: [[2006, 0.1e6], [2012, 6e6], [2020, 35e6], [2030, 70e6]],
    audience: { p: 0.15, b: 0.6, d: 0.25 }, refPrice: { p: 10, b: 600, d: 150 },
    models: ['subscription', 'freemium', 'license'],
    work: 150, designIdeal: 0.08, lifetime: 170, serverCost: 0.9, branches: ['cloud', 'net', 'sec'],
  },
  {
    id: 'ai', name: 'KI-Assistent', icon: '🤖', group: 'web', unlock: 'ai_llm', year: 2020,
    desc: 'Chatbots und Copilots. Teuer im Betrieb, aber die Zukunft.',
    market: [[2020, 1e6], [2023, 250e6], [2027, 1.6e9], [2030, 3.2e9]],
    audience: { p: 0.6, b: 0.3, d: 0.1 }, refPrice: { p: 20, b: 60, d: 40 },
    models: ['subscription', 'freemium', 'license', 'openSource'],
    work: 260, designIdeal: 0.12, lifetime: 80, serverCost: 0.012, branches: ['ai', 'cloud'],
  },
  {
    id: 'app_store', name: 'App-Store', icon: '🛍️', group: 'store', unlock: 'mob_store', year: 2005,
    desc: 'Marktplatz auf deinem eigenen OS. Du kassierst Provision auf jede verkaufte App.',
    market: [[2005, 1e6], [2030, 1e6]],
    audience: { p: 0.8, b: 0.1, d: 0.1 }, refPrice: { p: 0, b: 0, d: 0 },
    models: ['store'],
    work: 60, designIdeal: 0.25, lifetime: 520, serverCost: 0, branches: ['mobile', 'cloud'],
  },
];

export const TYPE = Object.fromEntries(PRODUCT_TYPES.map((t) => [t.id, t]));

export const AUDIENCES = [
  { id: 'p', name: 'Privat', icon: '🏠' },
  { id: 'b', name: 'Business', icon: '💼' },
  { id: 'd', name: 'Entwickler', icon: '👩‍💻' },
];
export const AUDIENCE = Object.fromEntries(AUDIENCES.map((a) => [a.id, a]));

// Erwartete Anzahl passender Features, damit ein Produkt "vollständig" wirkt
export const expectedFeatures = (year) => 1.6 + Math.max(0, year - 1985) * 0.09;
