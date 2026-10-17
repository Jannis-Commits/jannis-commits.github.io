// Zufalls-Events. Neues Event = neuer Eintrag.
//
// weight:   relative Häufigkeit        once: kommt nur einmal pro Run
// year/until: Zeitraum                  cond(s, h): zusätzliche Bedingung (h = Helfer aus engine/events.js)
// target:   'product' | 'onlineProduct' | 'staff' | 'rival' | 'bizProduct' – wird zufällig gewählt und im Text als
//           {product} / {staff} / {rival} eingesetzt
// options:  { label, desc, fx, chance, fail, failText }
//   fx-Schlüssel (siehe engine/effects.js):
//     cost/gain (× Firmengröße), moneyPct, rep, fans, morale, hype, users (Anteil), rating, bugs, quality,
//     antitrust, researchPts, crunchOff, preinstallOff, staffLeave, staffRaise, salaryAll, hireStar,
//     hwUpgrade, flag: { id, weeks }, gameOver, investorShare
export const EVENTS = [
  {
    id: 'security_hole', icon: '🛡️', title: 'Sicherheitslücke entdeckt', target: 'product', weight: 3, year: 1988,
    text: 'Ein Forscher hat eine kritische Lücke in {product} gefunden und gibt dir 2 Wochen, bevor er sie veröffentlicht.',
    options: [
      { label: 'Sofort patchen', desc: 'Kostet etwas, Ruf bleibt sauber', fx: { cost: 1.5, rep: 1 } },
      { label: 'Bug-Bounty zahlen', desc: 'Großzügig belohnen, gute Presse', fx: { cost: 2.5, rep: 4, fans: 0.05 } },
      { label: 'Ignorieren', desc: 'Riskant …', chance: 0.4, fx: {}, fail: { rep: -10, rating: -0.6, users: -0.1 }, failText: 'Die Lücke wurde ausgenutzt. Die Presse zerreißt dich.' },
    ],
  },
  {
    id: 'data_leak', icon: '💧', title: 'Datenleck!', target: 'onlineProduct', weight: 2, year: 1998,
    cond: (s, h) => h.totalUsers(s) > 1e6,
    text: 'Bei {product} sind Nutzerdaten abgeflossen. Noch weiß es niemand außer deinem Security-Team.',
    options: [
      { label: 'Offen kommunizieren', desc: 'Ehrlich, aber teuer', fx: { cost: 3, rep: -3, users: -0.04 } },
      { label: 'Vertuschen', desc: 'Klappt vielleicht', chance: 0.55, fx: {}, fail: { rep: -18, cost: 8, users: -0.15 }, failText: 'Ein Journalist deckt die Vertuschung auf. Desaster.' },
    ],
  },
  {
    id: 'viral', icon: '🚀', title: 'Viraler Erfolg!', target: 'product', weight: 3,
    text: '{product} geht gerade viral – alle reden darüber!',
    options: [{ label: 'Genießen', desc: 'Mehr Nutzer und Hype', fx: { users: 0.3, hype: 40, fans: 0.15, rep: 2 } }],
  },
  {
    id: 'shitstorm', icon: '🌪️', title: 'Shitstorm', weight: 2, year: 2004,
    text: 'Ein Tweet aus deiner Firma wird aus dem Kontext gerissen. Das Internet ist wütend.',
    options: [
      { label: 'Entschuldigen', desc: 'Kleiner Imageschaden', fx: { rep: -2 } },
      { label: 'Ignorieren', desc: 'Sitzt es aus', fx: { rep: -6, fans: -0.05 } },
      { label: 'Gegenangriff', desc: 'Alles oder nichts', chance: 0.45, fx: { rep: 4, fans: 0.1 }, fail: { rep: -12 }, failText: 'Das ging nach hinten los.' },
    ],
  },
  {
    id: 'recession', icon: '📉', title: 'Wirtschaftskrise', weight: 1,
    cond: (s) => !s.flags.recession,
    text: 'Die Wirtschaft bricht ein. Kunden geben ein halbes Jahr lang deutlich weniger aus.',
    options: [
      { label: 'Sparkurs', desc: 'Gehälter −10 %, Moral leidet', fx: { flag: { id: 'recession', weeks: 26 }, salaryAll: -0.1, morale: -15 } },
      { label: 'Durchhalten', desc: 'Nichts ändern', fx: { flag: { id: 'recession', weeks: 26 } } },
      { label: 'Antizyklisch investieren', desc: 'Kostet, bringt Ruf & Hype', fx: { flag: { id: 'recession', weeks: 26 }, cost: 4, rep: 4, hype: 20 } },
    ],
  },
  {
    id: 'antitrust', icon: '⚖️', title: 'Kartellklage', weight: 6,
    cond: (s) => s.antitrust >= 60,
    text: 'Die Kartellbehörde wirft dir Marktmissbrauch vor – vor allem wegen vorinstallierter Software.',
    options: [
      { label: 'Vergleich zahlen', desc: '8 % deines Geldes', fx: { moneyPct: -0.08, antitrust: -45 } },
      { label: 'Vor Gericht ziehen', desc: '50/50', chance: 0.5, fx: { antitrust: -30, rep: 2 }, fail: { moneyPct: -0.2, preinstallOff: true, antitrust: -60, rep: -6 }, failText: 'Verloren: hohe Strafe und Entbündelung.' },
      { label: 'Freiwillig entbündeln', desc: 'Vorinstallation aus', fx: { preinstallOff: true, antitrust: -55 } },
    ],
  },
  {
    id: 'poach', icon: '🎣', title: 'Abwerbe-Versuch', target: 'staff', weight: 3, needRival: true,
    cond: (s, h) => h.bestStaff(s) != null,
    text: '{rival} will {staff} mit einem dicken Angebot abwerben.',
    options: [
      { label: 'Gegenangebot (+30 %)', desc: 'Bleibt sicher, Moral steigt', fx: { staffRaise: 0.3 } },
      { label: 'Einmal-Bonus', desc: 'Günstiger, 60 % Chance', chance: 0.6, fx: { cost: 0.5 }, fail: { cost: 0.5, staffLeave: true }, failText: 'Hat trotzdem gekündigt.' },
      { label: 'Gehen lassen', desc: 'Spart Geld', fx: { staffLeave: true, morale: -4 } },
    ],
  },
  {
    id: 'hw_gen', icon: '🔌', title: 'Neue Hardware-Generation', weight: 2,
    cond: (s, h) => h.canUpgradeHw(s),
    text: 'Eine neue Rechner-Generation ist da. Deine Team-Hardware wirkt plötzlich alt.',
    options: [
      { label: 'Alle aufrüsten', desc: 'Nächste Hardware-Stufe für alle', fx: { hwUpgrade: true } },
      { label: 'Später', desc: 'Weiter mit alter Hardware', fx: { morale: -3 } },
    ],
  },
  {
    id: 'award', icon: '🏆', title: 'Auszeichnung!', target: 'product', weight: 2,
    cond: (s, h) => h.bestRating(s) >= 4,
    text: '{product} gewinnt einen Branchenpreis.',
    options: [{ label: 'Pokal ins Regal', desc: 'Ruf & Fans', fx: { rep: 5, fans: 0.1, hype: 15 } }],
  },
  {
    id: 'star_dev', icon: '🌟', title: 'Star-Entwicklerin will zu dir', weight: 2,
    cond: (s, h) => h.freeSeats(s) > 0 && s.staff.length >= 3,
    text: 'Eine bekannte Entwicklerin hat genug von ihrem Konzern und will bei dir anfangen – für das doppelte Gehalt.',
    options: [
      { label: 'Einstellen', desc: 'Skill 90, teuer', fx: { hireStar: true } },
      { label: 'Ablehnen', desc: '', fx: {} },
    ],
  },
  {
    id: 'party', icon: '🎉', title: 'Firmenfeier?', weight: 2,
    cond: (s) => s.staff.length >= 4,
    text: 'Das Team fragt nach einer Feier nach dem letzten Meilenstein.',
    options: [
      { label: 'Große Party', desc: 'Moral +12', fx: { cost: 0.4, morale: 12 } },
      { label: 'Pizza im Büro', desc: 'Moral +4', fx: { cost: 0.05, morale: 4 } },
      { label: 'Keine Zeit', desc: 'Moral −5', fx: { morale: -5 } },
    ],
  },
  {
    id: 'burnout', icon: '🥵', title: 'Burnout-Welle', weight: 5,
    cond: (s) => s.crunch && s.staff.length >= 3,
    text: 'Der Dauer-Crunch fordert Opfer. Mehrere Leute sind am Limit.',
    options: [
      { label: 'Crunch beenden', desc: 'Moral erholt sich', fx: { crunchOff: true, morale: 5 } },
      { label: 'Weitermachen', desc: 'Moral −15', fx: { morale: -15 } },
    ],
  },
  {
    id: 'press_love', icon: '📰', title: 'Begeisterte Presse', target: 'product', weight: 2,
    cond: (s, h) => h.bestRating(s) >= 4,
    text: 'Ein großes Magazin feiert {product} als "Must-have".',
    options: [{ label: 'Super!', desc: 'Hype & Nutzer', fx: { hype: 30, users: 0.1 } }],
  },
  {
    id: 'bad_press', icon: '👎', title: 'Verriss', target: 'product', weight: 2,
    cond: (s, h) => h.worstRating(s) <= 2.5,
    text: 'Ein bekannter Tester zerlegt {product} öffentlich.',
    options: [
      { label: 'Patch versprechen', desc: 'Weniger Schaden', fx: { users: -0.05, rep: -1 } },
      { label: 'Kontern', desc: 'Riskant', chance: 0.35, fx: { hype: 10 }, fail: { users: -0.15, rep: -5 }, failText: 'Die Community steht auf seiner Seite.' },
    ],
  },
  {
    id: 'conference', icon: '🎤', title: 'Tech-Konferenz', weight: 2,
    cond: (s) => !!s.research.current,
    text: 'Eine große Konferenz steht an. Schickst du dein Team hin?',
    options: [
      { label: 'Team hinschicken', desc: 'Forschung macht einen Sprung', fx: { cost: 0.6, researchPts: 0.35, morale: 3 } },
      { label: 'Nö', desc: '', fx: {} },
    ],
  },
  {
    id: 'patent_troll', icon: '🧌', title: 'Patent-Troll', weight: 2, year: 1992,
    cond: (s) => s.products.some((p) => p.owner === 'player'),
    text: 'Eine Briefkastenfirma behauptet, du verletzt ihr Patent auf "Fortschrittsbalken".',
    options: [
      { label: 'Zahlen', desc: 'Schnell erledigt', fx: { cost: 2 } },
      { label: 'Kämpfen', desc: '50/50, Ruf-Bonus', chance: 0.5, fx: { cost: 0.5, rep: 3 }, fail: { cost: 5 }, failText: 'Verloren – teuer.' },
    ],
  },
  {
    id: 'oss_community', icon: '🐧', title: 'Community hilft mit', weight: 3,
    cond: (s) => s.products.some((p) => p.owner === 'player' && p.model === 'openSource'),
    target: 'ossProduct',
    text: 'Freiwillige haben massenhaft Bugfixes und ein neues Feature für {product} beigesteuert.',
    options: [{ label: 'Danke, Internet!', desc: 'Bugs weg, Qualität +', fx: { bugs: -20, quality: 3, rep: 2 } }],
  },
  {
    id: 'interview', icon: '🎙️', title: 'Interview-Anfrage', weight: 2,
    text: 'Ein großes Wirtschaftsmagazin will ein Interview mit dir.',
    options: [
      { label: 'Bescheiden bleiben', desc: 'Sicher', fx: { rep: 2 } },
      { label: 'Große Töne spucken', desc: 'Hype oder Häme', chance: 0.5, fx: { hype: 30, rep: 3, fans: 0.08 }, fail: { rep: -5 }, failText: 'Deine Prognosen werden zum Meme.' },
      { label: 'Absagen', desc: '', fx: {} },
    ],
  },
  {
    id: 'outage', icon: '🔥', title: 'Server-Ausfall', target: 'onlineProduct', weight: 3, year: 1996,
    text: '{product} ist seit Stunden offline. Nutzer toben.',
    options: [
      { label: 'Nutzer entschädigen', desc: 'Kostet, Rating bleibt', fx: { cost: 1.5 } },
      { label: 'Aussitzen', desc: 'Rating & Nutzer sinken', fx: { rating: -0.4, users: -0.05 } },
    ],
  },
  {
    id: 'y2k', icon: '⏰', title: 'Y2K-Panik', once: true, year: 1999, until: 1999,
    text: 'Das Jahr-2000-Problem! Firmen wollen Garantien, dass deine Software nicht abstürzt.',
    options: [
      { label: 'Großes Audit', desc: 'Teuer, aber sicher', fx: { cost: 4, rep: 3 } },
      { label: 'Wird schon gutgehen', desc: '50/50', chance: 0.5, fx: {}, fail: { rep: -8, bugs: 25 }, failText: 'Am 1.1.2000 stürzt einiges ab …' },
    ],
  },
  {
    id: 'dotcom', icon: '🫧', title: 'Dotcom-Blase platzt', once: true, year: 2000, until: 2001, weight: 8,
    text: 'Die Tech-Aktien crashen. Investoren sind ein Jahr lang vorsichtig, Werbebudgets schrumpfen.',
    options: [{ label: 'Gürtel enger schnallen', desc: 'Firmenwert & Werbung leiden 1 Jahr', fx: { flag: { id: 'dotcom', weeks: 52 } } }],
  },
  {
    id: 'crisis2008', icon: '🏦', title: 'Finanzkrise', once: true, year: 2008, until: 2009, weight: 8,
    text: 'Banken wanken, die Welt steckt in der Rezession.',
    options: [
      { label: 'Durchhalten', desc: 'Nachfrage sinkt ein halbes Jahr', fx: { flag: { id: 'recession', weeks: 26 } } },
      { label: 'Jetzt erst recht', desc: 'Investieren in Marketing', fx: { flag: { id: 'recession', weeks: 26 }, cost: 3, hype: 25, rep: 2 } },
    ],
  },
  {
    id: 'pandemic', icon: '🦠', title: 'Pandemie', once: true, year: 2020, until: 2020, weight: 10,
    text: 'Alle arbeiten von zuhause. Online-Dienste, Cloud und Apps boomen.',
    options: [
      { label: 'Home-Office für alle', desc: 'Moral +, Online-Boom', fx: { flag: { id: 'pandemic', weeks: 60 }, morale: 6 } },
      { label: 'Zurück ins Büro', desc: 'Moral −', fx: { flag: { id: 'pandemic', weeks: 60 }, morale: -10 } },
    ],
  },
  {
    id: 'gdpr', icon: '🇪🇺', title: 'DSGVO kommt', once: true, year: 2018, until: 2018, weight: 6,
    cond: (s, h) => h.totalUsers(s) > 1e5,
    text: 'Neue Datenschutzregeln in Europa. Anpassen kostet – Ignorieren kann teuer werden.',
    options: [
      { label: 'Sauber umsetzen', desc: 'Kostet, Ruf +', fx: { cost: 3, rep: 3 } },
      { label: 'Minimal-Lösung', desc: 'Risiko Bußgeld', chance: 0.5, fx: {}, fail: { moneyPct: -0.04, rep: -5 }, failText: 'Bußgeld!' },
    ],
  },
  {
    id: 'ai_hype', icon: '✨', title: 'KI-Hype', once: true, year: 2023, until: 2024, weight: 8,
    text: 'Alle wollen KI. Investoren werfen mit Geld um sich – wer KI-Produkte hat, wird höher bewertet.',
    options: [{ label: 'Auf den Zug aufspringen', desc: 'KI-Produkte bekommen Hype', fx: { flag: { id: 'aiHype', weeks: 78 }, hype: 20 } }],
  },
  {
    id: 'side_project', icon: '💡', title: 'Geniale Idee', target: 'staff', weight: 2,
    cond: (s) => s.staff.length >= 3,
    text: '{staff} hat am Wochenende einen Prototypen gebaut, der eure Forschung voranbringen könnte.',
    options: [
      { label: 'Zeit dafür geben', desc: 'Forschung +, Moral +', fx: { researchPts: 0.25, morale: 3 } },
      { label: 'Fokus aufs Tagesgeschäft', desc: '', fx: { morale: -2 } },
    ],
  },
  {
    id: 'copycat', icon: '🦜', title: 'Dreiste Kopie', target: 'product', weight: 2, needRival: 'byteforge',
    cond: (s, h) => h.rivalAlive(s, 'byteforge'),
    text: 'Byteforge hat {product} fast 1:1 nachgebaut und verkauft es billiger.',
    options: [
      { label: 'Verklagen', desc: '50/50', chance: 0.5, fx: { cost: 1, rep: 2, gain: 3 }, fail: { cost: 2 }, failText: 'Verloren – Kopien sind legal.' },
      { label: 'Mit Qualität kontern', desc: 'Nichts tun', fx: {} },
    ],
  },
  {
    id: 'acq_offer', icon: '🤝', title: 'Übernahmeangebot', weight: 1, needRival: 'big',
    cond: (s, h) => h.playerRank(s) > 3 && s.week > 300,
    text: '{rival} will deine Firma kaufen – für das Doppelte des aktuellen Firmenwerts. Dann ist dein Run vorbei.',
    options: [
      { label: 'Ablehnen', desc: 'Weiter zur Weltherrschaft', fx: { rep: 2 } },
      { label: 'Verkaufen (Run endet)', desc: 'Exit als Millionär', fx: { gameOver: 'exit' } },
    ],
  },
  {
    id: 'hostile', icon: '🦈', title: 'Feindliche Übernahme droht', weight: 4, needRival: 'big',
    cond: (s) => s.finance.ownedShare < 0.5 && !s.finance.ipo,
    text: 'Deine Investoren halten die Mehrheit – und {rival} bietet ihnen viel Geld für ihre Anteile.',
    options: [
      { label: 'Anteile zurückkaufen', desc: '15 % deines Geldes, +6 % Anteile', fx: { moneyPct: -0.15, investorShare: 0.06 } },
      { label: 'Investoren überzeugen', desc: '50/50', chance: 0.5, fx: { rep: 1 }, fail: { gameOver: 'takeover' }, failText: 'Die Investoren verkaufen. Du bist raus.' },
    ],
  },
  {
    id: 'gov_contract', icon: '🏛️', title: 'Behörden-Auftrag', target: 'bizProduct', weight: 2,
    text: 'Eine Behörde will {product} landesweit einführen – mit Sonderwünschen.',
    options: [
      { label: 'Annehmen', desc: 'Viel Geld, Team gestresst', fx: { gain: 6, morale: -6 } },
      { label: 'Ablehnen', desc: '', fx: {} },
    ],
  },
  {
    id: 'charity', icon: '💚', title: 'Spendenanfrage', weight: 1,
    text: 'Eine Bildungsinitiative bittet um eine Spende für Computer an Schulen.',
    options: [
      { label: 'Großzügig spenden', desc: 'Ruf +5', fx: { cost: 1.2, rep: 5 } },
      { label: 'Software spenden', desc: 'Fans +', fx: { fans: 0.05, rep: 2 } },
      { label: 'Nein', desc: '', fx: {} },
    ],
  },
  {
    id: 'bug_feature', icon: '🦋', title: 'Bug wird Kult', target: 'product', weight: 1,
    text: 'Ein Bug in {product} ist zum Internet-Meme geworden. Die Leute lieben ihn.',
    options: [
      { label: 'Zum Feature erklären', desc: 'Fans +', fx: { fans: 0.12, hype: 15 } },
      { label: 'Trotzdem fixen', desc: 'Professionell', fx: { rep: 1 } },
    ],
  },
  {
    id: 'union', icon: '✊', title: 'Team fordert mehr Gehalt', weight: 4,
    cond: (s, h) => s.staff.length >= 8 && h.avgMorale(s) < 48,
    text: 'Die Stimmung ist mies. Das Team fordert 8 % mehr Gehalt für alle.',
    options: [
      { label: 'Zustimmen', desc: 'Moral +15', fx: { salaryAll: 0.08, morale: 15 } },
      { label: 'Ablehnen', desc: 'Moral −10', fx: { morale: -10 } },
    ],
  },
  {
    id: 'talent_war', icon: '💸', title: 'Kampf um Talente', weight: 1, year: 1998,
    cond: (s) => s.staff.length >= 10,
    text: 'Die Gehälter in der Branche explodieren. Deine Leute vergleichen.',
    options: [
      { label: 'Gehälter +6 %', desc: 'Moral +', fx: { salaryAll: 0.06, morale: 8 } },
      { label: 'Benefits statt Geld', desc: 'Kostet einmalig', fx: { cost: 1, morale: 4 } },
      { label: 'Nichts tun', desc: 'Moral −8', fx: { morale: -8 } },
    ],
  },
];

export const EVENT = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
