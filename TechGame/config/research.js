// Tech Tree. Neue Forschung = neuer Eintrag.
// pts:    Forschungspunkte (Research-MA erzeugen sie)
// cost:   einmalige Kosten in $ beim Start
// year:   frühestes Jahr
// req:    Voraussetzungen
// fx:     Effekte (werden aufsummiert):
//         devSpeed, designSpeed, researchSpeed (+Anteil), quality (+Punkte), bugs (−Anteil),
//         serverCost (−Anteil), supportFix (+Anteil), adRevenue (+Anteil), maxPlatforms (+n),
//         security (−Anteil Sicherheits-Events), devs (+Anteil Drittentwickler)
// Kategorien, Features und Plattformen verweisen selbst auf ihre Forschung (unlock/tech).
export const BRANCHES = [
  { id: 'lang', name: 'Sprachen & Engines', icon: '⌨️' },
  { id: 'ui', name: 'UI / UX', icon: '🎨' },
  { id: 'net', name: 'Netzwerk & Internet', icon: '🌐' },
  { id: 'sec', name: 'Sicherheit', icon: '🔒' },
  { id: 'cloud', name: 'Cloud', icon: '☁️' },
  { id: 'mobile', name: 'Mobile', icon: '📱' },
  { id: 'ai', name: 'KI', icon: '🧠' },
];

export const RESEARCH = [
  // Sprachen & Engines
  { id: 'lang_c', branch: 'lang', name: 'C-Programmierung', year: 1985, pts: 4, cost: 400, req: [], fx: { devSpeed: 0.06 } },
  { id: 'lang_graphics', branch: 'lang', name: 'Grafik-Routinen', year: 1985, pts: 4, cost: 600, req: [], fx: {} },
  { id: 'lang_portable', branch: 'lang', name: 'Portabler Code', year: 1987, pts: 8, cost: 1500, req: ['lang_c'], fx: { maxPlatforms: 1 } },
  { id: 'lang_kernel', branch: 'lang', name: 'Kernel-Entwicklung', year: 1986, pts: 14, cost: 4000, req: ['lang_c'], fx: {} },
  { id: 'lang_oop', branch: 'lang', name: 'Objektorientierung (C++)', year: 1988, pts: 14, cost: 5000, req: ['lang_c'], fx: { devSpeed: 0.08, bugs: 0.05 } },
  { id: 'lang_3d', branch: 'lang', name: '3D-Engine', year: 1992, pts: 26, cost: 20000, req: ['lang_graphics', 'lang_oop'], fx: {} },
  { id: 'lang_java', branch: 'lang', name: 'Java & virtuelle Maschinen', year: 1996, pts: 40, cost: 60000, req: ['lang_oop'], fx: { maxPlatforms: 1, devSpeed: 0.05 } },
  { id: 'lang_scripting', branch: 'lang', name: 'Skriptsprachen (Python/JS)', year: 1999, pts: 55, cost: 120000, req: ['lang_java'], fx: { devSpeed: 0.08 } },
  { id: 'lang_engine', branch: 'lang', name: 'Eigene Game-Engine', year: 2003, pts: 80, cost: 400000, req: ['lang_3d'], fx: { quality: 2 } },
  { id: 'lang_modern', branch: 'lang', name: 'Moderne Sprachen (Rust/Go/Swift)', year: 2014, pts: 200, cost: 3e6, req: ['lang_scripting'], fx: { bugs: 0.12, devSpeed: 0.06 } },

  // UI / UX
  { id: 'ui_gui', branch: 'ui', name: 'Grafische Oberfläche', year: 1985, pts: 6, cost: 800, req: [], fx: { quality: 1 } },
  { id: 'ui_mouse', branch: 'ui', name: 'Maus & Fenster', year: 1986, pts: 10, cost: 2500, req: ['ui_gui'], fx: { quality: 2 } },
  { id: 'ui_wysiwyg', branch: 'ui', name: 'WYSIWYG', year: 1988, pts: 14, cost: 6000, req: ['ui_gui'], fx: { designSpeed: 0.08 } },
  { id: 'ui_design', branch: 'ui', name: 'Design-System', year: 1995, pts: 35, cost: 50000, req: ['ui_mouse'], fx: { designSpeed: 0.15 } },
  { id: 'ui_usability', branch: 'ui', name: 'Usability-Labs', year: 2000, pts: 60, cost: 150000, req: ['ui_design'], fx: { quality: 3 } },
  { id: 'ui_flat', branch: 'ui', name: 'Responsive & Flat Design', year: 2010, pts: 120, cost: 1e6, req: ['ui_usability'], fx: { quality: 2, designSpeed: 0.1 } },
  { id: 'ui_voice', branch: 'ui', name: 'Sprachsteuerung', year: 2014, pts: 180, cost: 2.5e6, req: ['ui_flat'], fx: {} },

  // Netzwerk & Internet
  { id: 'net_modem', branch: 'net', name: 'Modem & Mailboxen', year: 1985, pts: 5, cost: 600, req: [], fx: {} },
  { id: 'net_lan', branch: 'net', name: 'Netzwerke (LAN)', year: 1986, pts: 10, cost: 2500, req: ['net_modem'], fx: {} },
  { id: 'net_tcp', branch: 'net', name: 'TCP/IP', year: 1989, pts: 18, cost: 10000, req: ['net_lan'], fx: {} },
  { id: 'net_www', branch: 'net', name: 'World Wide Web', year: 1993, pts: 26, cost: 25000, req: ['net_tcp'], fx: {} },
  { id: 'net_webapps', branch: 'net', name: 'Web-Anwendungen', year: 1995, pts: 34, cost: 50000, req: ['net_www'], fx: {} },
  { id: 'net_ajax', branch: 'net', name: 'Ajax & Web 2.0', year: 2004, pts: 80, cost: 400000, req: ['net_webapps'], fx: { quality: 1 } },
  { id: 'net_realtime', branch: 'net', name: 'Echtzeit-Sync', year: 2009, pts: 120, cost: 1e6, req: ['net_ajax'], fx: {} },
  { id: 'net_5g', branch: 'net', name: 'Edge & 5G', year: 2018, pts: 220, cost: 5e6, req: ['net_realtime'], fx: { serverCost: 0.1 } },

  // Sicherheit
  { id: 'sec_crypto', branch: 'sec', name: 'Verschlüsselung', year: 1987, pts: 10, cost: 3000, req: [], fx: { security: 0.1 } },
  { id: 'sec_antivirus', branch: 'sec', name: 'Virenschutz', year: 1990, pts: 18, cost: 10000, req: ['sec_crypto'], fx: { security: 0.1, bugs: 0.03 } },
  { id: 'sec_firewall', branch: 'sec', name: 'Firewalls', year: 1994, pts: 28, cost: 30000, req: ['sec_antivirus'], fx: { security: 0.1 } },
  { id: 'sec_ssl', branch: 'sec', name: 'SSL / HTTPS', year: 1995, pts: 30, cost: 40000, req: ['sec_firewall'], fx: { security: 0.1 } },
  { id: 'sec_audit', branch: 'sec', name: 'Code-Audits', year: 2001, pts: 60, cost: 200000, req: ['sec_ssl'], fx: { bugs: 0.12, security: 0.1 } },
  { id: 'sec_bounty', branch: 'sec', name: 'Bug-Bounty-Programm', year: 2010, pts: 100, cost: 800000, req: ['sec_audit'], fx: { supportFix: 0.3, security: 0.1 } },
  { id: 'sec_zero', branch: 'sec', name: 'Zero Trust', year: 2015, pts: 160, cost: 2e6, req: ['sec_audit'], fx: { security: 0.15 } },

  // Cloud
  { id: 'cloud_virt', branch: 'cloud', name: 'Virtualisierung', year: 1999, pts: 50, cost: 120000, req: ['net_tcp'], fx: { serverCost: 0.1 } },
  { id: 'cloud_dc', branch: 'cloud', name: 'Eigene Rechenzentren', year: 2002, pts: 70, cost: 500000, req: ['cloud_virt'], fx: { serverCost: 0.15 } },
  { id: 'cloud_iaas', branch: 'cloud', name: 'Cloud-Infrastruktur', year: 2006, pts: 100, cost: 1.2e6, req: ['cloud_dc'], fx: {} },
  { id: 'cloud_saas', branch: 'cloud', name: 'SaaS-Plattform', year: 2008, pts: 110, cost: 1.5e6, req: ['cloud_iaas'], fx: {} },
  { id: 'cloud_containers', branch: 'cloud', name: 'Container & Kubernetes', year: 2014, pts: 170, cost: 3e6, req: ['cloud_saas'], fx: { serverCost: 0.15, devSpeed: 0.05 } },
  { id: 'cloud_serverless', branch: 'cloud', name: 'Serverless', year: 2016, pts: 200, cost: 4e6, req: ['cloud_containers'], fx: { serverCost: 0.12 } },

  // Mobile
  { id: 'mob_pda', branch: 'mobile', name: 'PDA-Software', year: 1996, pts: 40, cost: 80000, req: ['ui_mouse'], fx: {} },
  { id: 'mob_os', branch: 'mobile', name: 'Mobile-OS-Kernel', year: 2004, pts: 110, cost: 1.5e6, req: ['mob_pda', 'lang_kernel'], fx: {} },
  { id: 'mob_touch', branch: 'mobile', name: 'Touch-Interfaces', year: 2006, pts: 100, cost: 1e6, req: ['mob_pda'], fx: { quality: 1 } },
  { id: 'mob_apps', branch: 'mobile', name: 'App-Entwicklung', year: 2007, pts: 90, cost: 800000, req: ['mob_touch'], fx: {} },
  { id: 'mob_store', branch: 'mobile', name: 'App-Store-Plattform', year: 2007, pts: 110, cost: 1.5e6, req: ['mob_apps'], fx: { devs: 0.2 } },
  { id: 'mob_cross', branch: 'mobile', name: 'Cross-Platform-Frameworks', year: 2012, pts: 140, cost: 2e6, req: ['mob_apps'], fx: { maxPlatforms: 1, devSpeed: 0.04 } },
  { id: 'mob_wear', branch: 'mobile', name: 'Wearables', year: 2014, pts: 150, cost: 2.5e6, req: ['mob_cross'], fx: {} },

  // KI
  { id: 'ai_expert', branch: 'ai', name: 'Expertensysteme', year: 1985, pts: 8, cost: 2000, req: [], fx: { researchSpeed: 0.05 } },
  { id: 'ai_ml', branch: 'ai', name: 'Machine Learning', year: 2003, pts: 90, cost: 600000, req: ['ai_expert'], fx: { quality: 1, researchSpeed: 0.05 } },
  { id: 'ai_recsys', branch: 'ai', name: 'Empfehlungssysteme', year: 2007, pts: 110, cost: 1e6, req: ['ai_ml'], fx: { adRevenue: 0.25 } },
  { id: 'ai_deep', branch: 'ai', name: 'Deep Learning', year: 2012, pts: 170, cost: 3e6, req: ['ai_ml'], fx: { quality: 1 } },
  { id: 'ai_llm', branch: 'ai', name: 'Large Language Models', year: 2019, pts: 280, cost: 1.5e7, req: ['ai_deep', 'cloud_iaas'], fx: {} },
  { id: 'ai_copilot', branch: 'ai', name: 'KI-Copilot fürs Team', year: 2021, pts: 300, cost: 2e7, req: ['ai_llm'], fx: { devSpeed: 0.2, bugs: 0.1 } },
  { id: 'ai_agents', branch: 'ai', name: 'KI-Agenten', year: 2024, pts: 400, cost: 5e7, req: ['ai_copilot'], fx: { quality: 4, researchSpeed: 0.15 } },
  { id: 'ai_agi', branch: 'ai', name: 'AGI-Forschung', year: 2027, pts: 600, cost: 2e8, req: ['ai_agents'], fx: { devSpeed: 0.25, quality: 5, researchSpeed: 0.25 } },
];

export const NODE = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));

export const FX_LABELS = {
  devSpeed: (v) => `+${Math.round(v * 100)} % Entwicklungstempo`,
  designSpeed: (v) => `+${Math.round(v * 100)} % Design-Tempo`,
  researchSpeed: (v) => `+${Math.round(v * 100)} % Forschungstempo`,
  quality: (v) => `+${v} Qualität`,
  bugs: (v) => `−${Math.round(v * 100)} % Bugs`,
  serverCost: (v) => `−${Math.round(v * 100)} % Serverkosten`,
  supportFix: (v) => `+${Math.round(v * 100)} % Bugfix-Tempo`,
  adRevenue: (v) => `+${Math.round(v * 100)} % Werbeumsatz`,
  maxPlatforms: (v) => `+${v} Plattform pro Projekt`,
  security: (v) => `−${Math.round(v * 100)} % Sicherheitsvorfälle`,
  devs: (v) => `+${Math.round(v * 100)} % Drittentwickler`,
};
