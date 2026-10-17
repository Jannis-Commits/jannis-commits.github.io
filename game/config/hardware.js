// Eigene Hardware. tflops = Peak-TFLOP/s, power in kW, space in Platz-Einheiten.

export const HARDWARE = {
  laptop: {
    name: 'Laptop', cost: 0, tflops: 0.1, power: 0.05, space: 0, sellable: false,
    desc: 'Dein Start-Gerät. CPU only.',
  },
  'gaming-pc': {
    name: 'Gaming-PC', cost: 2500, tflops: 10, power: 0.4, space: 1, year: 2015,
    desc: 'Eine Consumer-GPU.',
  },
  workstation: {
    name: 'GPU-Workstation', cost: 8000, tflops: 40, power: 1, space: 1, year: 2016,
    research: 'gpu-training', desc: '4 GPUs in einem Tower.',
  },
  'dc-v': {
    name: 'Datacenter-GPU (Gen 1)', cost: 10000, tflops: 100, power: 0.35, space: 0.5, year: 2017.5,
    research: 'datacenter-hw', desc: 'Tensor Cores, für Server gebaut.',
  },
  'dc-a': {
    name: 'Datacenter-GPU (Gen 2)', cost: 15000, tflops: 312, power: 0.4, space: 0.5, year: 2020.4,
    research: 'datacenter-hw', desc: 'Dreifache Leistung von Gen 1.',
  },
  'dc-h': {
    name: 'Datacenter-GPU (Gen 3)', cost: 30000, tflops: 1000, power: 0.7, space: 0.5, year: 2022.8,
    research: 'distributed', desc: 'Der Standard für große LLMs.',
  },
  'dc-b': {
    name: 'Datacenter-GPU (Gen 4)', cost: 40000, tflops: 2500, power: 1.0, space: 0.5, year: 2024.6,
    research: 'flash-attention', desc: 'Riesige Racks mit Flüssigkühlung.',
  },
  'dc-r': {
    name: 'Datacenter-GPU (Gen 5)', cost: 60000, tflops: 6000, power: 1.4, space: 0.5, year: 2026.5,
    research: 'mega-cluster', desc: 'Nächste Generation, gebaut für Reasoning-Modelle.',
  },
  'dc-x': {
    name: 'Datacenter-GPU (Gen 6)', cost: 80000, tflops: 15000, power: 1.8, space: 0.5, year: 2028.5,
    research: 'next-gen-arch', desc: 'Chips für die AGI-Ära.',
  },
};

// Cloud-GPUs: das beste verfügbare Modell wird automatisch gemietet.
export const CLOUD = [
  { name: 'Cloud-GPU (alt)', year: 2015, tflops: 8, pricePerHour: 0.9 },
  { name: 'Cloud-GPU (Gen 1)', year: 2017.8, tflops: 100, pricePerHour: 3.0 },
  { name: 'Cloud-GPU (Gen 2)', year: 2020.8, tflops: 312, pricePerHour: 3.0 },
  { name: 'Cloud-GPU (Gen 3)', year: 2023.2, tflops: 1000, pricePerHour: 4.0 },
  { name: 'Cloud-GPU (Gen 4)', year: 2025.2, tflops: 2500, pricePerHour: 6.0 },
  { name: 'Cloud-GPU (Gen 5)', year: 2027.0, tflops: 6000, pricePerHour: 8.0 },
  { name: 'Cloud-GPU (Gen 6)', year: 2029.0, tflops: 15000, pricePerHour: 10.0 },
];

export const CLOUD_MAX = 100000;
