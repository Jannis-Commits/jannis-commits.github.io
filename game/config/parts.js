// Maschinen und Komponenten. Alle Preise in $, Leistung in kW, Speicher in GB/TB.
// cls = Plattform-Klasse: laptop | desktop | hedt | server | node | rack
// Teile mit cls passen nur in Maschinen dieser Klassen.

// ---------- Gehäuse / Systeme ----------
// gpuSlots, ff (welche GPUs passen), ramSlots, storSlots, space (Stellplatz), cpuCount (Sockel/Superchips), nicCount
export const CHASSIS = {
  laptop: {
    name: 'Laptop', short: 'Laptop', icon: '💻', cls: 'laptop', cost: 0, fixed: true, sellable: false,
    gpuSlots: 0, ff: null, ramSlots: 1, storSlots: 1, space: 0,
    desc: 'Dein Start-Gerät. Nur CPU, nicht aufrüstbar.',
  },
  desktop: {
    name: 'Midi-Tower (Consumer-Mainboard)', short: 'PC', icon: '🖥️', cls: 'desktop', cost: 250, year: 2015,
    gpuSlots: 2, ff: 'pcie', ramSlots: 4, storSlots: 4, space: 1,
    desc: 'Gehäuse + Mainboard. 2 PCIe-Slots (der zweite nur mit x8).',
  },
  hedt: {
    name: 'Workstation-Tower (HEDT)', short: 'Workstation', icon: '🗄️', cls: 'hedt', cost: 1200, year: 2016, research: 'gpu-training',
    gpuSlots: 4, ff: 'pcie', ramSlots: 8, storSlots: 8, space: 1,
    desc: 'Großes Board mit 4 vollen PCIe-Slots und vielen Lanes.',
  },
  server4u: {
    name: '4U-GPU-Server (PCIe)', short: '4U-Server', icon: '🧱', cls: 'server', cost: 6000, year: 2016.5, research: 'datacenter-hw',
    gpuSlots: 8, ff: 'pcie', ramSlots: 16, storSlots: 8, space: 2,
    desc: 'Rack-Server für 8 PCIe-GPUs. Braucht einen Serverraum.',
  },
  hgx: {
    name: 'HGX-Node (8× SXM, NVLink)', short: 'HGX-Node', icon: '🔲', cls: 'node', cost: 25000, year: 2017.5, research: 'datacenter-hw',
    gpuSlots: 8, ff: 'sxm', ramSlots: 32, storSlots: 8, space: 4, nicCount: 8,
    desc: '8 SXM-GPUs über NVLink-Switch verbunden. Der Standard für große Modelle.',
  },
  nvl72: {
    name: 'NVL72-Rack (72× SXM)', short: 'NVL72-Rack', icon: '🏗️', cls: 'rack', cost: 1500000, year: 2025, research: 'rack-scale',
    gpuSlots: 72, ff: 'sxm', ramSlots: 72, storSlots: 36, space: 20, cpuCount: 36, nicCount: 72,
    desc: 'Ein ganzes Rack als eine GPU-Domäne: 72 GPUs, ein NVLink-Netz, flüssiggekühlt.',
  },
};

// ---------- CPUs ----------
// tf = eigene Rechenleistung (ohne GPU), feed = wie viele GPU-TFLOP/s sie mit Daten versorgen kann,
// lanes = PCIe-Lanes (16 pro GPU für volle Bandbreite), mem = RAM-Typ
export const CPUS = {
  'i5-6200u': { name: 'Intel Core i5-6200U', cls: ['laptop'], year: 2015, cost: 0, tf: 0.1, feed: 5, tdp: 15, lanes: 0, mem: 'ddr4' },

  'i5-4690k': { name: 'Intel Core i5-4690K', cls: ['desktop'], year: 2014.5, cost: 240, tf: 0.25, feed: 25, tdp: 88, lanes: 16, mem: 'ddr3' },
  'i7-4790k': { name: 'Intel Core i7-4790K', cls: ['desktop'], year: 2014.5, cost: 340, tf: 0.4, feed: 40, tdp: 88, lanes: 16, mem: 'ddr3' },
  'i5-6600k': { name: 'Intel Core i5-6600K', cls: ['desktop'], year: 2015.6, cost: 240, tf: 0.3, feed: 30, tdp: 91, lanes: 16, mem: 'ddr4' },
  'i7-6700k': { name: 'Intel Core i7-6700K', cls: ['desktop'], year: 2015.6, cost: 340, tf: 0.5, feed: 50, tdp: 91, lanes: 16, mem: 'ddr4' },
  'r7-1800x': { name: 'AMD Ryzen 7 1800X', cls: ['desktop'], year: 2017.2, cost: 500, tf: 0.9, feed: 120, tdp: 95, lanes: 20, mem: 'ddr4' },
  'i9-9900k': { name: 'Intel Core i9-9900K', cls: ['desktop'], year: 2018.8, cost: 490, tf: 1.0, feed: 150, tdp: 95, lanes: 16, mem: 'ddr4' },
  'r9-3950x': { name: 'AMD Ryzen 9 3950X', cls: ['desktop'], year: 2019.9, cost: 750, tf: 1.8, feed: 400, tdp: 105, lanes: 24, mem: 'ddr4' },
  'r9-5950x': { name: 'AMD Ryzen 9 5950X', cls: ['desktop'], year: 2020.9, cost: 800, tf: 2.2, feed: 700, tdp: 105, lanes: 24, mem: 'ddr4' },
  'r9-7950x': { name: 'AMD Ryzen 9 7950X', cls: ['desktop'], year: 2022.75, cost: 700, tf: 3.5, feed: 1500, tdp: 170, lanes: 28, mem: 'ddr5' },
  'r9-9950x': { name: 'AMD Ryzen 9 9950X', cls: ['desktop'], year: 2024.6, cost: 650, tf: 4.5, feed: 2500, tdp: 170, lanes: 28, mem: 'ddr5' },

  'i7-5960x': { name: 'Intel Core i7-5960X', cls: ['hedt'], year: 2014.7, cost: 1000, tf: 0.6, feed: 80, tdp: 140, lanes: 40, mem: 'ddr4' },
  'i7-6950x': { name: 'Intel Core i7-6950X', cls: ['hedt'], year: 2016.4, cost: 1700, tf: 0.8, feed: 120, tdp: 140, lanes: 40, mem: 'ddr4' },
  'tr-2990wx': { name: 'AMD Threadripper 2990WX', cls: ['hedt'], year: 2018.6, cost: 1800, tf: 2, feed: 400, tdp: 250, lanes: 64, mem: 'ddr4' },
  'tr-3970x': { name: 'AMD Threadripper 3970X', cls: ['hedt'], year: 2019.9, cost: 2000, tf: 3.5, feed: 900, tdp: 280, lanes: 88, mem: 'ddr4' },
  'tr-5995wx': { name: 'AMD Threadripper PRO 5995WX', cls: ['hedt'], year: 2022.2, cost: 6500, tf: 6, feed: 2000, tdp: 280, lanes: 128, mem: 'ddr4' },
  'tr-7980x': { name: 'AMD Threadripper 7980X', cls: ['hedt'], year: 2023.8, cost: 5000, tf: 9, feed: 5000, tdp: 350, lanes: 92, mem: 'ddr5' },
  'tr-9980x': { name: 'AMD Threadripper 9980X', cls: ['hedt'], year: 2025.6, cost: 5000, tf: 12, feed: 8000, tdp: 350, lanes: 92, mem: 'ddr5' },

  'xeon-e5-2699v3': { name: '2× Intel Xeon E5-2699 v3', cls: ['server', 'node'], year: 2014.7, cost: 8000, tf: 1.2, feed: 200, tdp: 290, lanes: 80, mem: 'ddr4' },
  'xeon-e5-2699v4': { name: '2× Intel Xeon E5-2699 v4', cls: ['server', 'node'], year: 2016.2, cost: 8200, tf: 1.5, feed: 300, tdp: 290, lanes: 80, mem: 'ddr4' },
  'xeon-8180': { name: '2× Intel Xeon Platinum 8180', cls: ['server', 'node'], year: 2017.5, cost: 20000, tf: 4, feed: 1000, tdp: 410, lanes: 96, mem: 'ddr4' },
  'epyc-7742': { name: '2× AMD EPYC 7742', cls: ['server', 'node'], year: 2019.6, cost: 14000, tf: 7, feed: 4000, tdp: 450, lanes: 128, mem: 'ddr4' },
  'epyc-7763': { name: '2× AMD EPYC 7763', cls: ['server', 'node'], year: 2021.2, cost: 16000, tf: 8, feed: 8000, tdp: 560, lanes: 128, mem: 'ddr4' },
  'epyc-9654': { name: '2× AMD EPYC 9654', cls: ['server', 'node'], year: 2022.9, cost: 23000, tf: 15, feed: 20000, tdp: 720, lanes: 160, mem: 'ddr5' },
  'epyc-9965': { name: '2× AMD EPYC 9965', cls: ['server', 'node'], year: 2024.8, cost: 30000, tf: 25, feed: 50000, tdp: 1000, lanes: 160, mem: 'ddr5' },
  'grace': { name: 'NVIDIA Grace (2 pro Tray)', cls: ['rack'], year: 2024.9, cost: 10000, tf: 7, feed: 60000, tdp: 500, lanes: 0, mem: 'ddr5' },
  'vera': { name: 'NVIDIA Vera (Roadmap)', cls: ['rack'], year: 2026.7, cost: 14000, tf: 12, feed: 150000, tdp: 600, lanes: 0, mem: 'ddr5' },
};

// ---------- RAM-Module ----------
export const RAM = {
  'ddr3-8': { name: 'DDR3 8 GB', mem: 'ddr3', gb: 8, cost: 60, year: 2013 },
  'ddr4-8': { name: 'DDR4 8 GB', mem: 'ddr4', gb: 8, cost: 60, year: 2014.8 },
  'ddr4-16': { name: 'DDR4 16 GB', mem: 'ddr4', gb: 16, cost: 120, year: 2015 },
  'ddr4-32': { name: 'DDR4 32 GB', mem: 'ddr4', gb: 32, cost: 250, year: 2017 },
  'ddr4-64': { name: 'DDR4 64 GB (RDIMM)', mem: 'ddr4', gb: 64, cost: 450, year: 2018 },
  'ddr4-128': { name: 'DDR4 128 GB (RDIMM)', mem: 'ddr4', gb: 128, cost: 1100, year: 2019.5 },
  'ddr5-32': { name: 'DDR5 32 GB', mem: 'ddr5', gb: 32, cost: 200, year: 2021.9 },
  'ddr5-64': { name: 'DDR5 64 GB', mem: 'ddr5', gb: 64, cost: 320, year: 2023 },
  'ddr5-128': { name: 'DDR5 128 GB (RDIMM)', mem: 'ddr5', gb: 128, cost: 700, year: 2023 },
  'ddr5-256': { name: 'DDR5 256 GB (RDIMM)', mem: 'ddr5', gb: 256, cost: 2500, year: 2024.5 },
};

// ---------- Datenträger ----------
// feed = Lese-Durchsatz in "GPU-TFLOP/s, die er versorgen kann" (mehrere Laufwerke addieren sich)
export const STORAGE = {
  'ssd-256': { name: '256 GB SSD (verlötet)', tb: 0.256, feed: 50, cost: 0, year: 2015, cls: ['laptop'] },
  'hdd-4tb': { name: 'HDD 4 TB', tb: 4, feed: 15, cost: 120, year: 2014 },
  'ssd-1tb': { name: 'SATA-SSD 1 TB', tb: 1, feed: 150, cost: 350, year: 2015 },
  'nvme3-2tb': { name: 'NVMe Gen3 2 TB', tb: 2, feed: 1000, cost: 700, year: 2017 },
  'nvme4-4tb': { name: 'NVMe Gen4 4 TB', tb: 4, feed: 4000, cost: 700, year: 2020 },
  'nvme5-8tb': { name: 'NVMe Gen5 8 TB', tb: 8, feed: 12000, cost: 1000, year: 2023.5 },
  'u2-30tb': { name: 'U.2 NVMe 30 TB', tb: 30, feed: 15000, cost: 4500, year: 2023, cls: ['server', 'node', 'rack'] },
  'e1-61tb': { name: 'E3.S NVMe 61 TB', tb: 61, feed: 30000, cost: 9000, year: 2025, cls: ['server', 'node', 'rack'] },
};

// ---------- Kühlung ----------
// kw = Wärme, die abgeführt werden kann. Mehr Abwärme → Thermal Throttling.
export const COOLING = {
  laptop: { name: 'Laptop-Lüfter', cls: ['laptop'], kw: 0.05, cost: 0, year: 2014 },
  'case-std': { name: 'Gehäuselüfter (Standard)', cls: ['desktop'], kw: 0.4, cost: 0, year: 2014 },
  'tower-air': { name: 'Tower-Luftkühler + 6 Lüfter', cls: ['desktop', 'hedt'], kw: 0.75, cost: 150, year: 2014 },
  aio: { name: 'AIO-Wasserkühlung 360 mm', cls: ['desktop', 'hedt'], kw: 1.0, cost: 260, year: 2015 },
  'custom-loop': { name: 'Custom-Wasserkühlung (GPU-Blöcke)', cls: ['desktop', 'hedt'], kw: 1.8, cost: 1100, year: 2016 },
  'ws-air': { name: 'Workstation-Airflow', cls: ['hedt'], kw: 1.3, cost: 0, year: 2014 },
  'custom-xl': { name: 'Custom-Loop XL (2 Radiatoren)', cls: ['hedt'], kw: 3.2, cost: 2500, year: 2017 },
  'srv-fans': { name: 'Server-Lüfter', cls: ['server'], kw: 3.5, cost: 0, year: 2014 },
  'srv-hp': { name: 'Hochleistungs-Lüfter', cls: ['server', 'node'], kw: 7, cost: 1500, year: 2016 },
  'rear-door': { name: 'Rear-Door-Wärmetauscher', cls: ['server', 'node'], kw: 11, cost: 8000, year: 2018 },
  'hgx-air': { name: 'HGX-Luftkühlung', cls: ['node'], kw: 6.5, cost: 0, year: 2014 },
  dlc: { name: 'Direct-to-Chip-Flüssigkühlung', cls: ['node'], kw: 16, cost: 20000, year: 2022.5 },
  immersion: { name: 'Immersionskühlung', cls: ['node'], kw: 30, cost: 50000, year: 2024 },
  'rack-liquid': { name: 'Rack-Flüssigkühlung', cls: ['rack'], kw: 140, cost: 0, year: 2014 },
  'rack-liquid-xl': { name: 'Rack-Flüssigkühlung XL', cls: ['rack'], kw: 300, cost: 250000, year: 2026.5 },
};

// ---------- Netzteile ----------
// kw = maximale Leistung. GPUs + CPU müssen reinpassen, sonst lassen sie sich nicht einbauen.
export const PSU = {
  laptop: { name: 'Laptop-Netzteil 65 W', cls: ['laptop'], kw: 0.065, cost: 0 },
  'psu-550': { name: 'Netzteil 550 W', cls: ['desktop'], kw: 0.55, cost: 0 },
  'psu-850': { name: 'Netzteil 850 W', cls: ['desktop', 'hedt'], kw: 0.85, cost: 130 },
  'psu-1200': { name: 'Netzteil 1200 W', cls: ['desktop', 'hedt'], kw: 1.2, cost: 260 },
  'psu-1600': { name: 'Netzteil 1600 W', cls: ['desktop', 'hedt'], kw: 1.6, cost: 420 },
  'psu-ws': { name: 'Workstation-Netzteil 1000 W', cls: ['hedt'], kw: 1.0, cost: 0 },
  'psu-2x2000': { name: '2× 2000 W (redundant)', cls: ['hedt', 'server'], kw: 3.0, cost: 1200 },
  'psu-srv': { name: 'Server-Netzteile 2× 1600 W', cls: ['server'], kw: 3.2, cost: 0 },
  'psu-srv-8k': { name: 'Server-Netzteile 4× 2700 W', cls: ['server', 'node'], kw: 8, cost: 2500 },
  'psu-hgx': { name: 'HGX-Netzteile 6× 2000 W', cls: ['node'], kw: 10, cost: 0 },
  'psu-hgx-18k': { name: 'HGX-Netzteile 6× 3300 W', cls: ['node'], kw: 18, cost: 6000 },
  'psu-hgx-30k': { name: 'HGX-Netzteile 8× 3600 W', cls: ['node'], kw: 28, cost: 12000 },
  'rack-power': { name: 'Rack-Power-Shelves 140 kW', cls: ['rack'], kw: 140, cost: 0 },
  'rack-power-xl': { name: 'Rack-Power-Shelves 300 kW', cls: ['rack'], kw: 300, cost: 150000 },
};

// ---------- Netzwerk ----------
// eff = Skalierungs-Effizienz, wenn mehrere Maschinen zusammen trainieren
export const NIC = {
  gbe: { name: '1 GbE (onboard)', eff: 0.3, cost: 0, year: 2014 },
  '10gbe': { name: '10 GbE', eff: 0.55, cost: 300, year: 2014 },
  '100gbe': { name: '100 GbE', eff: 0.75, cost: 1200, year: 2017 },
  'ib-hdr': { name: 'InfiniBand HDR 200G', eff: 0.88, cost: 2500, year: 2019.5, research: 'distributed', cls: ['server', 'node', 'rack'] },
  'ib-ndr': { name: 'InfiniBand NDR 400G', eff: 0.93, cost: 3500, year: 2022.8, research: 'distributed', cls: ['server', 'node', 'rack'] },
  'xdr': { name: 'InfiniBand XDR 800G', eff: 0.96, cost: 6000, year: 2025.3, research: 'distributed', cls: ['node', 'rack'] },
};

// Standard-Ausstattung je Klasse (immer das billigste passende, sonst diese Fallbacks)
export const DEFAULTS = {
  laptop: { cpu: 'i5-6200u', cooling: 'laptop', psu: 'laptop', ram: ['ddr4-8'], storage: ['ssd-256'] },
  desktop: { cooling: 'case-std', psu: 'psu-550' },
  hedt: { cooling: 'ws-air', psu: 'psu-ws' },
  server: { cooling: 'srv-fans', psu: 'psu-srv' },
  node: { cooling: 'hgx-air', psu: 'psu-hgx' },
  rack: { cooling: 'rack-liquid', psu: 'rack-power' },
};

// ---------- Cloud ----------
// Instanzen mit fester, guter Ausstattung (kein Engpass, kein Platz/Strom). price $/Stunde zum Start,
// fällt danach jedes Jahr um priceDrop bis priceFloor.
export const CLOUD = {
  'k80-1': { name: 'Cloud: 1× Tesla K80', gpu: 'tesla-k80', n: 1, year: 2015, price: 0.9 },
  'v100-8': { name: 'Cloud: 8× V100 (p3.16xlarge)', gpu: 'v100-sxm', n: 8, year: 2017.8, price: 24.5 },
  'a100-8': { name: 'Cloud: 8× A100 (p4de)', gpu: 'a100-sxm', n: 8, year: 2020.9, price: 41 },
  'tpu-v4-8': { name: 'Cloud: TPU v4 (8 Chips)', gpu: 'tpu-v4', n: 8, year: 2021.6, price: 26 },
  'h100-8': { name: 'Cloud: 8× H100 (p5)', gpu: 'h100-sxm', n: 8, year: 2023.3, price: 98 },
  'tpu-v5p-8': { name: 'Cloud: TPU v5p (8 Chips)', gpu: 'tpu-v5p', n: 8, year: 2024, price: 34 },
  'b200-8': { name: 'Cloud: 8× B200', gpu: 'b200', n: 8, year: 2025.2, price: 80 },
  'tpu-v7-8': { name: 'Cloud: TPU v7 Ironwood (8 Chips)', gpu: 'tpu-v7', n: 8, year: 2025.9, price: 70 },
  'gb300-72': { name: 'Cloud: GB300 NVL72 (72 GPUs)', gpu: 'b300', n: 72, year: 2026, price: 450 },
  'rubin-8': { name: 'Cloud: 8× Rubin', gpu: 'rubin', n: 8, year: 2027.3, price: 140 },
  'feynman-8': { name: 'Cloud: 8× Feynman', gpu: 'feynman', n: 8, year: 2029.2, price: 260 },
};

export const CLOUD_ECON = {
  priceDrop: 0.78,     // Preis × 0,78 pro Jahr nach Start
  priceFloor: 0.25,
  feed: 1e9, storageTb: 200, nicEff: 0.92,
  maxPerOffer: 20000,
};

export const CLASS_NAMES = { laptop: 'Laptop', desktop: 'PC', hedt: 'Workstation', server: 'Server', node: 'GPU-Node', rack: 'Rack' };
