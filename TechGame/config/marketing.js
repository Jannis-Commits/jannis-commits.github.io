// Marketing-Kampagnen. cost wird mit salaryIndex skaliert.
// hype: für Projekte vor Release (geht 1:1 in den Release-Hype)
// boost: für veröffentlichte Produkte (+Anteil Attraktivität, solange die Kampagne läuft)
export const CAMPAIGNS = [
  { id: 'flyer', name: 'Flyer & Kleinanzeigen', icon: '📰', year: 1985, until: 2005, cost: 300, weeks: 4, hype: 6, boost: 0.08 },
  { id: 'magazine', name: 'Anzeige in Computer-Magazin', icon: '📖', year: 1985, until: 2012, cost: 2500, weeks: 6, hype: 15, boost: 0.15 },
  { id: 'fair', name: 'Messestand (CeBIT)', icon: '🎪', year: 1986, until: 2018, cost: 12000, weeks: 3, hype: 35, boost: 0.15 },
  { id: 'tv', name: 'TV-Spot', icon: '📺', year: 1988, cost: 80000, weeks: 6, hype: 50, boost: 0.35 },
  { id: 'online', name: 'Online-Banner', icon: '🖱️', year: 1996, cost: 10000, weeks: 6, hype: 18, boost: 0.2, tech: 'net_www' },
  { id: 'social', name: 'Social-Media-Kampagne', icon: '💬', year: 2006, cost: 40000, weeks: 6, hype: 30, boost: 0.3 },
  { id: 'influencer', name: 'Influencer-Deal', icon: '🤳', year: 2012, cost: 150000, weeks: 4, hype: 60, boost: 0.4 },
  { id: 'keynote', name: 'Große Keynote', icon: '🎤', year: 1995, cost: 500000, weeks: 3, hype: 110, boost: 0.5, minRep: 40 },
  { id: 'superbowl', name: 'Super-Bowl-Werbung', icon: '🏈', year: 1990, cost: 3e6, weeks: 4, hype: 150, boost: 0.8, minRep: 55 },
];
export const CAMPAIGN = Object.fromEntries(CAMPAIGNS.map((c) => [c.id, c]));
