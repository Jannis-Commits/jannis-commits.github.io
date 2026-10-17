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
};

export const LOCATION_ORDER = ['room', 'wg-office', 'office', 'serverroom'];
