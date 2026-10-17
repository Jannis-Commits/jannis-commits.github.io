// Konkurrenz. Echte Firmen (grob historisch) + ein paar fiktive.
// founded:   ab diesem Jahr am Markt (vorher unsichtbar)
// protected: Großkonzern – geht nicht pleite (entlässt stattdessen) und wird nicht von anderen Rivalen gekauft
// strategy:  siehe STRATEGIES
// cash/staff/rep: Startwerte beim Markteintritt
// focus:     Kategorien, in die die Firma ab Jahr `from` einsteigt.
//            names: Produktname ab Jahr; aud: Zielgruppe; model: Geschäftsmodell (oder [[Jahr, Modell], …])
//            provides: für Betriebssysteme – welche Plattform das OS stellt
//            q: Qualitäts-Bonus für diese Kategorie; until: steigt danach aus
export const STRATEGIES = {
  aggressive: { name: 'Marktmacht', desc: 'Bündelt Produkte, wirbt Leute ab, kauft Firmen.', q: 2, price: 1.0, speed: 1.0, poach: 2, buy: 2 },
  quality: { name: 'Qualität', desc: 'Weniger, dafür sehr gute und teure Produkte.', q: 9, price: 1.25, speed: 1.25, poach: 1, buy: 0.5 },
  price: { name: 'Preiskampf', desc: 'Billig, schnell, laut. Senkt Preise, wenn du Anteile holst.', q: -6, price: 0.65, speed: 0.85, poach: 0.5, buy: 0.5 },
  openSource: { name: 'Open Source', desc: 'Gratis und offen, lebt von Community und Support.', q: 0, price: 1, speed: 1.1, poach: 0.3, buy: 0, cost: 0.25 },
  copycat: { name: 'Kopierer', desc: 'Kopiert deine erfolgreichsten Produkte – schnell und billiger.', q: -4, price: 0.75, speed: 0.6, poach: 1, buy: 0.3 },
  balanced: { name: 'Ausgewogen', desc: 'Solide Produkte zu fairen Preisen.', q: 4, price: 1.0, speed: 1.0, poach: 1, buy: 1 },
};

export const RIVALS = [
  {
    id: 'microsoft', name: 'Microsoft', color: '#0ea5e9', founded: 1975, strategy: 'aggressive', cash: 4e6, staff: 120, rep: 55,
    protected: true,
    focus: [
      { cat: 'os_desktop', from: 1985, names: [[1985, 'MS-DOS'], [1990, 'Windows']], aud: 'p', model: 'oneTime', provides: 'pc', q: 3 },
      { cat: 'tool', from: 1985, names: [[1985, 'MS Utilities']], aud: 'b', model: 'oneTime' },
      { cat: 'office', from: 1989, names: [[1989, 'Office']], aud: 'b', model: [[1989, 'oneTime'], [2011, 'subscription']], q: 4 },
      { cat: 'database', from: 1989, names: [[1989, 'SQL Server']], aud: 'b', model: 'license' },
      { cat: 'game', from: 1992, names: [[1992, 'Flight Simulator'], [2001, 'Halo']], aud: 'p', model: 'oneTime' },
      { cat: 'browser', from: 1995, names: [[1995, 'Internet Explorer'], [2015, 'Edge']], aud: 'p', model: 'ads' },
      { cat: 'web_service', from: 1998, names: [[1998, 'MSN'], [2009, 'Bing']], aud: 'p', model: 'ads', q: -5 },
      { cat: 'os_mobile', from: 2010, until: 2017, names: [[2010, 'Windows Phone']], aud: 'p', model: 'license', provides: null, q: -8 },
      { cat: 'cloud', from: 2010, names: [[2010, 'Azure']], aud: 'b', model: 'subscription', q: 3 },
      { cat: 'ai', from: 2023, names: [[2023, 'Copilot']], aud: 'b', model: 'subscription' },
    ],
  },
  {
    id: 'apple', name: 'Apple', color: '#64748b', founded: 1976, strategy: 'quality', cash: 6e6, staff: 90, rep: 60,
    protected: true,
    focus: [
      { cat: 'os_desktop', from: 1985, names: [[1985, 'Mac System'], [2001, 'macOS']], aud: 'p', model: 'oneTime', provides: 'mac' },
      { cat: 'tool', from: 1985, names: [[1985, 'MacPaint'], [2003, 'iLife']], aud: 'p', model: 'oneTime' },
      { cat: 'office', from: 2005, names: [[2005, 'iWork']], aud: 'p', model: 'oneTime', q: -4 },
      { cat: 'browser', from: 2003, names: [[2003, 'Safari']], aud: 'p', model: 'ads' },
      { cat: 'os_mobile', from: 2007, names: [[2007, 'iOS']], aud: 'p', model: 'license', provides: 'ios', q: 8 },
      { cat: 'mobile_app', from: 2008, names: [[2008, 'Apple Music']], aud: 'p', model: 'subscription' },
      { cat: 'web_service', from: 2011, names: [[2011, 'iCloud']], aud: 'p', model: 'freemium', q: -3 },
      { cat: 'ai', from: 2024, names: [[2024, 'Apple Intelligence']], aud: 'p', model: 'freemium', q: -6 },
    ],
  },
  {
    id: 'ibm', name: 'IBM', color: '#1d4ed8', founded: 1911, strategy: 'balanced', cash: 3e7, staff: 300, rep: 70,
    protected: true,
    focus: [
      { cat: 'database', from: 1985, names: [[1985, 'DB2']], aud: 'b', model: 'license', q: 4 },
      { cat: 'office', from: 1985, until: 2000, names: [[1985, 'DisplayWrite'], [1995, 'Lotus SmartSuite']], aud: 'b', model: 'license' },
      { cat: 'tool', from: 1985, names: [[1985, 'IBM Tools'], [2002, 'Rational']], aud: 'd', model: 'license' },
      { cat: 'cloud', from: 2011, names: [[2011, 'IBM Cloud']], aud: 'b', model: 'subscription', q: -4 },
      { cat: 'ai', from: 2015, names: [[2015, 'Watson']], aud: 'b', model: 'license', q: -6 },
    ],
  },
  {
    id: 'oracle', name: 'Oracle', color: '#dc2626', founded: 1977, strategy: 'aggressive', cash: 2e6, staff: 60, rep: 50,
    protected: true,
    focus: [
      { cat: 'database', from: 1985, names: [[1985, 'Oracle Database']], aud: 'b', model: 'license', q: 6 },
      { cat: 'tool', from: 1995, names: [[1995, 'Oracle Tools']], aud: 'd', model: 'license' },
      { cat: 'cloud', from: 2016, names: [[2016, 'Oracle Cloud']], aud: 'b', model: 'subscription', q: -3 },
    ],
  },
  {
    id: 'adobe', name: 'Adobe', color: '#ef4444', founded: 1982, strategy: 'quality', cash: 1e6, staff: 25, rep: 45,
    focus: [
      { cat: 'tool', from: 1985, names: [[1985, 'PostScript'], [1990, 'Photoshop'], [2013, 'Creative Cloud']], aud: 'b', model: [[1985, 'oneTime'], [2013, 'subscription']], q: 5 },
      { cat: 'office', from: 1993, names: [[1993, 'Acrobat']], aud: 'b', model: 'oneTime', q: -4 },
    ],
  },
  {
    id: 'ea', name: 'Electronic Arts', color: '#f97316', founded: 1982, strategy: 'balanced', cash: 1.5e6, staff: 40, rep: 45,
    focus: [
      { cat: 'game', from: 1985, names: [[1985, 'EA Games'], [1993, 'FIFA']], aud: 'p', model: [[1985, 'oneTime'], [2012, 'freemium']], q: 4 },
      { cat: 'mobile_app', from: 2009, names: [[2009, 'EA Mobile']], aud: 'p', model: 'freemium' },
    ],
  },
  {
    id: 'netscape', name: 'Netscape', color: '#0d9488', founded: 1994, strategy: 'balanced', cash: 4e6, staff: 40, rep: 40,
    focus: [
      { cat: 'browser', from: 1994, until: 2003, names: [[1994, 'Navigator']], aud: 'p', model: 'oneTime', q: 8 },
      { cat: 'web_service', from: 1996, until: 2003, names: [[1996, 'Netcenter']], aud: 'p', model: 'ads', q: -5 },
    ],
  },
  {
    id: 'amazon', name: 'Amazon', color: '#f59e0b', founded: 1995, strategy: 'price', cash: 8e6, staff: 60, rep: 40,
    protected: true,
    focus: [
      { cat: 'web_service', from: 1995, names: [[1995, 'Amazon.com']], aud: 'p', model: 'subscription', q: 6 },
      { cat: 'cloud', from: 2006, names: [[2006, 'AWS']], aud: 'b', model: 'subscription', q: 14 },
      { cat: 'ai', from: 2023, names: [[2023, 'Alexa+']], aud: 'p', model: 'freemium', q: -6 },
    ],
  },
  {
    id: 'google', name: 'Google', color: '#22c55e', founded: 1998, strategy: 'quality', cash: 1e7, staff: 50, rep: 50,
    protected: true,
    focus: [
      { cat: 'web_service', from: 1998, names: [[1998, 'Google Search']], aud: 'p', model: 'ads', q: 12 },
      { cat: 'office', from: 2006, names: [[2006, 'Google Docs']], aud: 'p', model: 'freemium' },
      { cat: 'browser', from: 2008, names: [[2008, 'Chrome']], aud: 'p', model: 'openSource', q: 10 },
      { cat: 'os_mobile', from: 2008, names: [[2008, 'Android']], aud: 'p', model: 'openSource', provides: 'android', q: 4 },
      { cat: 'mobile_app', from: 2009, names: [[2009, 'YouTube']], aud: 'p', model: 'ads' },
      { cat: 'cloud', from: 2008, names: [[2008, 'Google Cloud']], aud: 'b', model: 'subscription' },
      { cat: 'ai', from: 2017, names: [[2017, 'Google AI'], [2023, 'Gemini']], aud: 'p', model: 'freemium', q: 4 },
    ],
  },
  {
    id: 'meta', name: 'Meta', color: '#3b82f6', founded: 2004, strategy: 'aggressive', cash: 2e7, staff: 40, rep: 40,
    protected: true,
    focus: [
      { cat: 'web_service', from: 2004, names: [[2004, 'Facebook']], aud: 'p', model: 'ads', q: 10 },
      { cat: 'mobile_app', from: 2010, names: [[2010, 'Instagram']], aud: 'p', model: 'ads', q: 8 },
      { cat: 'ai', from: 2023, names: [[2023, 'Llama']], aud: 'd', model: 'openSource' },
    ],
  },
  // --- fiktiv ---
  {
    id: 'nexora', name: 'Nexora Soft', color: '#a855f7', founded: 1986, strategy: 'price', cash: 60000, staff: 5, rep: 15, fictional: true,
    focus: [
      { cat: 'tool', from: 1986, names: [[1986, 'NexTools']], aud: 'p', model: 'oneTime' },
      { cat: 'game', from: 1988, names: [[1988, 'NexPlay']], aud: 'p', model: 'oneTime' },
      { cat: 'office', from: 1993, names: [[1993, 'NexOffice']], aud: 'p', model: 'oneTime' },
      { cat: 'mobile_app', from: 2010, names: [[2010, 'NexApps']], aud: 'p', model: 'ads' },
    ],
  },
  {
    id: 'byteforge', name: 'Byteforge', color: '#78716c', founded: 1988, strategy: 'copycat', cash: 40000, staff: 4, rep: 10, fictional: true,
    focus: [
      { cat: 'tool', from: 1988, names: [[1988, 'ByteTools']], aud: 'p', model: 'oneTime' },
    ],
  },
  {
    id: 'openloop', name: 'OpenLoop Foundation', color: '#eab308', founded: 1991, strategy: 'openSource', cash: 30000, staff: 6, rep: 35, fictional: true,
    focus: [
      { cat: 'os_desktop', from: 1991, names: [[1991, 'Linux']], aud: 'd', model: 'openSource', provides: 'linux', q: -2 },
      { cat: 'database', from: 1995, names: [[1995, 'LoopSQL']], aud: 'd', model: 'openSource' },
      { cat: 'browser', from: 2004, names: [[2004, 'Firelynx']], aud: 'p', model: 'openSource' },
      { cat: 'office', from: 2002, names: [[2002, 'LoopOffice']], aud: 'p', model: 'openSource', q: -6 },
    ],
  },
  {
    id: 'pixelhaus', name: 'Pixelhaus', color: '#ec4899', founded: 1990, strategy: 'quality', cash: 80000, staff: 6, rep: 25, fictional: true,
    focus: [
      { cat: 'game', from: 1990, names: [[1990, 'Pixelhaus Games']], aud: 'p', model: [[1990, 'oneTime'], [2014, 'freemium']], q: 4 },
      { cat: 'mobile_app', from: 2009, names: [[2009, 'Pixel Pocket']], aud: 'p', model: 'freemium' },
    ],
  },
  {
    id: 'synthetica', name: 'Synthetica AI', color: '#14b8a6', founded: 2016, strategy: 'quality', cash: 5e7, staff: 30, rep: 35, fictional: true,
    focus: [
      { cat: 'ai', from: 2020, names: [[2020, 'Synth']], aud: 'p', model: 'freemium', q: 10 },
      { cat: 'cloud', from: 2024, names: [[2024, 'Synth API']], aud: 'd', model: 'subscription' },
    ],
  },
];

export const RIVAL = Object.fromEntries(RIVALS.map((r) => [r.id, r]));
