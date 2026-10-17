// Geschäftsmodelle.
// demand:     wie viele Leute zugreifen im Vergleich zu Einmalkauf (gratis = mehr Nutzer)
// audMult:    Nachfrage-Multiplikator je Zielgruppe
// priceUnit:  Anzeige des Preises; hasPrice=false → kein Preis einstellbar
// payFrac:    Anteil zahlender Nutzer (Freemium)
export const BUSINESS_MODELS = [
  {
    id: 'oneTime', name: 'Einmalkauf', icon: '💿', hasPrice: true, priceUnit: '', elasticity: 'oneTime',
    demand: 1, audMult: { p: 1, b: 1, d: 1 }, defaultPriceMult: 1,
    desc: 'Klassisch: einmal zahlen, für immer nutzen. Viel Umsatz zum Release, danach flacht es ab.',
  },
  {
    id: 'subscription', name: 'Abo', icon: '🔁', hasPrice: true, priceUnit: '/Monat', elasticity: 'subscription',
    demand: 0.7, audMult: { p: 0.9, b: 1.1, d: 1 }, defaultPriceMult: 0.045, techBoost: { cloud_saas: 0.35 },
    desc: 'Monatliche Einnahmen, solange Nutzer bleiben. Stabiler Cashflow, aber weniger Nutzer.',
  },
  {
    id: 'freemium', name: 'Freemium', icon: '🎁', hasPrice: true, priceUnit: '/Monat (Premium)', elasticity: 'subscription',
    demand: 1.8, payFrac: 0.05, audMult: { p: 1.1, b: 0.8, d: 1 }, defaultPriceMult: 0.06,
    desc: 'Gratis-Version für alle, ein kleiner Teil zahlt fürs Premium-Abo.',
  },
  {
    id: 'ads', name: 'Werbung', icon: '📢', hasPrice: false, priceUnit: '', elasticity: null,
    demand: 2.1, audMult: { p: 1.2, b: 0.5, d: 0.7 }, ratingMalus: 0.2,
    desc: 'Komplett gratis, finanziert durch Werbung. Lohnt sich erst bei sehr vielen Nutzern.',
  },
  {
    id: 'license', name: 'Firmen-Lizenz', icon: '🏢', hasPrice: true, priceUnit: '/Monat je Platz', elasticity: 'license',
    demand: 0.85, audMult: { p: 0.15, b: 1.35, d: 0.8 }, defaultPriceMult: 0.045,
    desc: 'Lizenzen pro Arbeitsplatz für Firmen. Sales-Team bringt hier richtig viel.',
  },
  {
    id: 'openSource', name: 'Open Source', icon: '🐧', hasPrice: false, priceUnit: '', elasticity: null,
    demand: 2.4, audMult: { p: 0.9, b: 0.9, d: 1.5 }, supportRevenue: 0.04,
    desc: 'Kostenlos & offen. Bringt Ruf, Fans und Entwickler – Geld nur über Support-Verträge.',
  },
  {
    id: 'store', name: 'Provision', icon: '🛍️', hasPrice: false, priceUnit: '', elasticity: null,
    demand: 1, audMult: { p: 1, b: 1, d: 1 },
    desc: 'Du verdienst an jeder App, die über deinen Store verkauft wird.',
  },
];

export const MODEL = Object.fromEntries(BUSINESS_MODELS.map((m) => [m.id, m]));

// Werbeumsatz pro Nutzer und Jahr (in $)
export const AD_RPU = [[1995, 0.4], [2000, 2], [2005, 5], [2010, 9], [2015, 15], [2020, 22], [2030, 30]];
