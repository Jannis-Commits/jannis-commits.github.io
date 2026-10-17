// Onboarding. Ein Schritt ist erledigt, sobald done(s) true ist – dann kommt der nächste.
// tab: Tab, in dem der Hinweis erscheint (und der in der Navigation pulsiert)
export const TUTORIAL = [
  {
    id: 'welcome', tab: 'home', title: 'Willkommen, Gründer:in! 👋',
    text: '1985, Kinderzimmer, ein alter Laptop und 6.000 $. Ziel: das größte Software-Unternehmen der Welt – mit eigenem Betriebssystem.',
    done: (s) => s.tutorial.ack?.welcome,
    ack: true,
  },
  {
    id: 'project', tab: 'projects', title: 'Dein erstes Projekt',
    text: 'Tippe auf „Neues Projekt“ und bau ein kleines Tool. Wenige Features = schnell fertig.',
    done: (s) => s.projects.length > 0 || s.products.some((p) => p.owner === 'player'),
  },
  {
    id: 'week', tab: 'projects', title: 'Woche für Woche',
    text: 'Du arbeitest selbst am Projekt. Drück „Nächste Woche“ – oder ⏩, um bis zum nächsten Meilenstein vorzuspulen.',
    done: (s) => s.products.some((p) => p.owner === 'player'),
  },
  {
    id: 'product', tab: 'products', title: 'Release! 🎉',
    text: 'Dein Produkt ist draußen. Hier siehst du Nutzer, Bewertung und Umsatz. Bugs drücken die Sterne – setz jemanden auf Support.',
    done: (s) => s.tutorial.ack?.product,
    ack: true,
  },
  {
    id: 'research', tab: 'research', title: 'Forschung',
    text: 'Forschung schaltet neue Produkttypen und Features frei. Starte z. B. „Grafik-Routinen“ für Spiele. Wer forscht, entwickelt nicht – plane klug.',
    done: (s) => s.research.done.length > 0 || !!s.research.current,
  },
  {
    id: 'hire', tab: 'team', title: 'Verstärkung',
    text: 'Zieh in die Garage, sobald du etwas Geld hast, und stell deine ersten Leute ein. Platz im Büro begrenzt dein Team.',
    done: (s) => s.staff.length > 1,
  },
  {
    id: 'market', tab: 'market', title: 'Die Konkurrenz',
    text: 'Hier siehst du die Rangliste, Marktanteile und deine Finanzen (Kredite, Investoren, später der Börsengang).',
    done: (s) => s.tutorial.ack?.market,
    ack: true,
  },
];
