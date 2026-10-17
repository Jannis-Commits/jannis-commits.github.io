// Zielplattformen. Die Reichweite einer Desktop/Mobile-Plattform ergibt sich live aus den
// Marktanteilen der Betriebssysteme (wer das OS hat, besitzt die Plattform).
// os: welcher OS-Kategorie die Plattform gehört; names: Name ab Jahr
export const PLATFORMS = [
  { id: 'home', icon: '🕹️', group: 'desktop', os: 'os_desktop', names: [[1985, 'Heimcomputer (C64/Amiga)']], until: 1997, others: true },
  { id: 'pc', icon: '💾', group: 'desktop', os: 'os_desktop', names: [[1985, 'MS-DOS'], [1990, 'Windows']] },
  { id: 'mac', icon: '🍏', group: 'desktop', os: 'os_desktop', names: [[1985, 'Mac']] },
  { id: 'linux', icon: '🐧', group: 'desktop', os: 'os_desktop', names: [[1985, 'Linux']] },
  { id: 'own', icon: '⭐', group: 'desktop', os: 'os_desktop', names: [[1985, 'Eigenes OS']], own: true },
  { id: 'ios', icon: '📱', group: 'mobile', os: 'os_mobile', names: [[1985, 'iOS']] },
  { id: 'android', icon: '🤖', group: 'mobile', os: 'os_mobile', names: [[1985, 'Android']] },
  { id: 'own_mobile', icon: '⭐', group: 'mobile', os: 'os_mobile', names: [[1985, 'Eigenes Mobile-OS']], own: true },
  { id: 'web', icon: '🌐', group: 'web', names: [[1985, 'Web']], tech: 'net_webapps' },
];

export const PLATFORM = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));

// Anteil der Desktop-Nutzer, die Web-Apps nutzen (für Desktop-Kategorien auf "Web")
export const WEB_REACH = [[1995, 0.04], [1998, 0.22], [2003, 0.45], [2010, 0.65], [2020, 0.8], [2030, 0.85]];

// Heimcomputer verschwinden in den 90ern
export const homeFade = (year) => (year < 1990 ? 1 : Math.max(0, 1 - (year - 1990) / 7));
