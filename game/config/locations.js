// Orte. rent pro Woche, space = Platz für Hardware, power in kW, staff = Plätze für Mitarbeiter.

export const LOCATIONS = {
  room: {
    name: 'Kleines Zimmer', rent: 0, space: 2, power: 0.5, staff: 0, cooling: 1,
    desc: 'Dein WG-Zimmer. Nur du.',
  },
  'wg-office': {
    name: 'WG-Büro', rent: 300, space: 4, power: 3, staff: 3, cooling: 1,
    desc: 'Ein Raum für ein kleines Team.',
  },
  office: {
    name: 'Büro', rent: 2000, space: 20, power: 30, staff: 15, cooling: 1.3,
    desc: 'Mit eigenem Serverschrank. Kühlung +30 % Stromkosten.',
  },
  serverroom: {
    name: 'Büro + Server', rent: 15000, space: 100, power: 500, staff: 40, cooling: 1.3,
    research: 'distributed', desc: 'Eigene Server-Etage mit Industriekühlung.',
  },
  datacenter: {
    name: 'Eigener Server-Standort', rent: 150000, space: 2000, power: 5000, staff: 150, cooling: 1.25,
    research: 'mega-cluster', desc: 'Eine ganze Halle voller Racks. 5 MW Strom.',
  },
  hyperscale: {
    name: 'Hyperscale-Campus', rent: 1500000, space: 20000, power: 100000, staff: 600, cooling: 1.2,
    research: 'hyperscale', desc: 'Mehrere Server-Hallen, eigenes Umspannwerk. 100 MW.',
  },
  gigawatt: {
    name: 'Gigawatt-Campus', rent: 10000000, space: 200000, power: 1000000, staff: 2000, cooling: 1.15,
    research: 'gigawatt', desc: 'Ein eigenes Kraftwerk für deine AI. 1 GW.',
  },
};

export const LOCATION_ORDER = ['room', 'wg-office', 'office', 'serverroom', 'datacenter', 'hyperscale', 'gigawatt'];
