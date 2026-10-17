// Standorte. rent pro Woche, space = Stellplätze (PC 1, Workstation 1, 4U-Server 2, HGX-Node 4, NVL72-Rack 20),
// power in kW, staff = Plätze fürs Team, cooling = Faktor auf die Stromkosten, classes = erlaubte Maschinen.

const PCS = ['laptop', 'desktop', 'hedt'];

export const LOCATIONS = {
  room: {
    name: 'Kleines Zimmer', rent: 0, space: 2, power: 1.5, staff: 0, cooling: 1, classes: PCS,
    desc: 'Dein WG-Zimmer. Eine Haushalts-Steckdose, nur du.',
  },
  'wg-office': {
    name: 'WG-Büro', rent: 300, space: 5, power: 6, staff: 3, cooling: 1, classes: PCS,
    desc: 'Ein Raum für ein kleines Team und ein paar Rechner.',
  },
  office: {
    name: 'Büro mit Serverschrank', rent: 2000, space: 20, power: 40, staff: 15, cooling: 1.3, classes: [...PCS, 'server'],
    desc: 'Eigener Serverschrank für 4U-Server. Kühlung +30 % Stromkosten.',
  },
  serverroom: {
    name: 'Büro + Server-Etage', rent: 15000, space: 120, power: 700, staff: 40, cooling: 1.3, classes: [...PCS, 'server', 'node'],
    research: 'distributed', desc: 'Eigene Etage mit Industriekühlung. Platz für HGX-Nodes.',
  },
  datacenter: {
    name: 'Eigenes Rechenzentrum', rent: 150000, space: 2500, power: 20000, staff: 150, cooling: 1.25, classes: [...PCS, 'server', 'node', 'rack'],
    research: 'mega-cluster', desc: 'Eine Halle voller Racks. 20 MW.',
  },
  hyperscale: {
    name: 'Hyperscale-Campus', rent: 1500000, space: 25000, power: 300000, staff: 600, cooling: 1.2, classes: [...PCS, 'server', 'node', 'rack'],
    research: 'hyperscale', desc: 'Mehrere Hallen, eigenes Umspannwerk. 300 MW.',
  },
  gigawatt: {
    name: 'Gigawatt-Campus', rent: 10000000, space: 250000, power: 1500000, staff: 2000, cooling: 1.15, classes: [...PCS, 'server', 'node', 'rack'],
    research: 'gigawatt', desc: 'Ein eigenes Kraftwerk für deine AI. 1,5 GW.',
  },
};

export const LOCATION_ORDER = ['room', 'wg-office', 'office', 'serverroom', 'datacenter', 'hyperscale', 'gigawatt'];
