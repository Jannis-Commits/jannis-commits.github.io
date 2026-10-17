// Echte GPUs (Specs gerundet, ohne Sparsity). Ab ~2027 nach Roadmap bzw. fiktiv weitergeführt.
// tf = dichte TFLOP/s je Präzision. Fehlt eine Präzision, läuft sie im nächstgrößeren Format.
// vram GB · bw = Speicherbandbreite GB/s · tdp W · cost $ (ca. Launch-Preis)
// ff: 'pcie' = Steckkarte (PC/Workstation/4U-Server), 'sxm' = Modul (nur HGX-Node / NVL-Rack)
// tier: consumer | pro | dc · nvlink: 'bridge' = zwei Karten per NVLink-Brücke koppelbar
// cloudOnly: nur mietbar (TPUs)

export const GPUS = {
  // ---------- Consumer ----------
  'gtx-970': {
    name: 'GeForce GTX 970', vendor: 'nvidia', tier: 'consumer', ff: 'pcie', year: 2014.7,
    vram: 4, bw: 224, tdp: 145, cost: 330, tf: { fp32: 3.5 },
  },
  'gtx-980ti': {
    name: 'GeForce GTX 980 Ti', vendor: 'nvidia', tier: 'consumer', ff: 'pcie', year: 2015.4,
    vram: 6, bw: 336, tdp: 250, cost: 650, tf: { fp32: 5.6 },
  },
  'gtx-1080': {
    name: 'GeForce GTX 1080', vendor: 'nvidia', tier: 'consumer', ff: 'pcie', year: 2016.4,
    vram: 8, bw: 320, tdp: 180, cost: 600, tf: { fp32: 8.9 },
  },
  'gtx-1080ti': {
    name: 'GeForce GTX 1080 Ti', vendor: 'nvidia', tier: 'consumer', ff: 'pcie', year: 2017.2,
    vram: 11, bw: 484, tdp: 250, cost: 700, tf: { fp32: 11.3 },
  },
  'rtx-2080ti': {
    name: 'GeForce RTX 2080 Ti', vendor: 'nvidia', tier: 'consumer', ff: 'pcie', year: 2018.7,
    vram: 11, bw: 616, tdp: 250, cost: 1200, tf: { fp32: 13.4, fp16: 54 },
  },
  'rtx-3090': {
    name: 'GeForce RTX 3090', vendor: 'nvidia', tier: 'consumer', ff: 'pcie', year: 2020.7, nvlink: 'bridge',
    vram: 24, bw: 936, tdp: 350, cost: 1500, tf: { fp32: 35.6, fp16: 71 },
  },
  'rtx-4090': {
    name: 'GeForce RTX 4090', vendor: 'nvidia', tier: 'consumer', ff: 'pcie', year: 2022.8,
    vram: 24, bw: 1008, tdp: 450, cost: 1600, tf: { fp32: 82.6, fp16: 165, fp8: 330 },
  },
  'rtx-5090': {
    name: 'GeForce RTX 5090', vendor: 'nvidia', tier: 'consumer', ff: 'pcie', year: 2025.1,
    vram: 32, bw: 1792, tdp: 575, cost: 2000, tf: { fp32: 104.8, fp16: 209, fp8: 419, fp4: 838 },
  },

  // ---------- Workstation ----------
  'quadro-rtx-8000': {
    name: 'Quadro RTX 8000', vendor: 'nvidia', tier: 'pro', ff: 'pcie', year: 2018.8, nvlink: 'bridge',
    vram: 48, bw: 672, tdp: 295, cost: 5500, tf: { fp32: 16.3, fp16: 130 },
  },
  'rtx-a6000': {
    name: 'RTX A6000', vendor: 'nvidia', tier: 'pro', ff: 'pcie', year: 2020.9, nvlink: 'bridge',
    vram: 48, bw: 768, tdp: 300, cost: 4650, tf: { fp32: 38.7, fp16: 155 },
  },
  'rtx-6000-ada': {
    name: 'RTX 6000 Ada', vendor: 'nvidia', tier: 'pro', ff: 'pcie', year: 2023.0,
    vram: 48, bw: 960, tdp: 300, cost: 6800, tf: { fp32: 91, fp16: 364, fp8: 728 },
  },
  'rtx-pro-6000': {
    name: 'RTX PRO 6000 Blackwell', vendor: 'nvidia', tier: 'pro', ff: 'pcie', year: 2025.3,
    vram: 96, bw: 1792, tdp: 600, cost: 8500, tf: { fp32: 125, fp16: 500, fp8: 1000, fp4: 2000 },
  },

  // ---------- Datacenter PCIe ----------
  'tesla-k80': {
    name: 'Tesla K80', vendor: 'nvidia', tier: 'dc', ff: 'pcie', year: 2014.9,
    vram: 24, bw: 480, tdp: 300, cost: 5000, tf: { fp32: 8.7 },
  },
  'tesla-p100': {
    name: 'Tesla P100', vendor: 'nvidia', tier: 'dc', ff: 'pcie', year: 2016.5,
    vram: 16, bw: 732, tdp: 250, cost: 6000, tf: { fp32: 9.3, fp16: 18.7 },
  },
  'v100-pcie': {
    name: 'Tesla V100 PCIe', vendor: 'nvidia', tier: 'dc', ff: 'pcie', year: 2017.6,
    vram: 16, bw: 900, tdp: 250, cost: 8000, tf: { fp32: 14, fp16: 112 },
  },
  'a100-pcie': {
    name: 'A100 80GB PCIe', vendor: 'nvidia', tier: 'dc', ff: 'pcie', year: 2021.2,
    vram: 80, bw: 1935, tdp: 300, cost: 14000, tf: { fp32: 19.5, fp16: 312 },
  },
  'l40s': {
    name: 'L40S', vendor: 'nvidia', tier: 'dc', ff: 'pcie', year: 2023.6,
    vram: 48, bw: 864, tdp: 350, cost: 8000, tf: { fp32: 91.6, fp16: 362, fp8: 733 },
  },
  'h100-pcie': {
    name: 'H100 PCIe', vendor: 'nvidia', tier: 'dc', ff: 'pcie', year: 2023.0,
    vram: 80, bw: 2000, tdp: 350, cost: 25000, tf: { fp32: 51, fp16: 756, fp8: 1513 },
  },
  'mi100': {
    name: 'AMD Instinct MI100', vendor: 'amd', tier: 'dc', ff: 'pcie', year: 2020.9,
    vram: 32, bw: 1228, tdp: 300, cost: 6400, tf: { fp32: 23.1, fp16: 184.6 },
  },

  // ---------- Datacenter SXM / OAM ----------
  'v100-sxm': {
    name: 'Tesla V100 SXM2 32GB', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2017.5,
    vram: 32, bw: 900, tdp: 300, cost: 9000, tf: { fp32: 15.7, fp16: 125 },
  },
  'a100-sxm': {
    name: 'A100 80GB SXM', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2020.9,
    vram: 80, bw: 2039, tdp: 400, cost: 15000, tf: { fp32: 19.5, fp16: 312 },
  },
  'mi250x': {
    name: 'AMD Instinct MI250X', vendor: 'amd', tier: 'dc', ff: 'sxm', year: 2021.9,
    vram: 128, bw: 3277, tdp: 560, cost: 12000, tf: { fp32: 47.9, fp16: 383 },
  },
  'h100-sxm': {
    name: 'H100 SXM', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2022.9,
    vram: 80, bw: 3350, tdp: 700, cost: 30000, tf: { fp32: 67, fp16: 989, fp8: 1979 },
  },
  'mi300x': {
    name: 'AMD Instinct MI300X', vendor: 'amd', tier: 'dc', ff: 'sxm', year: 2023.95,
    vram: 192, bw: 5300, tdp: 750, cost: 18000, tf: { fp32: 163, fp16: 1307, fp8: 2615 },
  },
  'h200': {
    name: 'H200', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2024.4,
    vram: 141, bw: 4800, tdp: 700, cost: 32000, tf: { fp32: 67, fp16: 989, fp8: 1979 },
  },
  'mi325x': {
    name: 'AMD Instinct MI325X', vendor: 'amd', tier: 'dc', ff: 'sxm', year: 2024.8,
    vram: 256, bw: 6000, tdp: 1000, cost: 22000, tf: { fp32: 163, fp16: 1307, fp8: 2615 },
  },
  'b200': {
    name: 'B200', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2024.9,
    vram: 192, bw: 8000, tdp: 1000, cost: 40000, tf: { fp32: 80, fp16: 2250, fp8: 4500, fp4: 9000 },
  },
  'mi355x': {
    name: 'AMD Instinct MI355X', vendor: 'amd', tier: 'dc', ff: 'sxm', year: 2025.5,
    vram: 288, bw: 8000, tdp: 1400, cost: 30000, tf: { fp32: 157, fp16: 2500, fp8: 5000, fp4: 10000 },
  },
  'b300': {
    name: 'B300 (Blackwell Ultra)', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2025.7,
    vram: 288, bw: 8000, tdp: 1100, cost: 50000, tf: { fp32: 75, fp16: 2250, fp8: 4500, fp4: 13500 },
  },
  'rubin': {
    name: 'Rubin (Roadmap)', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2026.7,
    vram: 288, bw: 13000, tdp: 1800, cost: 60000, tf: { fp32: 130, fp16: 4000, fp8: 8000, fp4: 25000 },
  },
  'rubin-ultra': {
    name: 'Rubin Ultra (Roadmap)', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2027.7,
    vram: 1000, bw: 32000, tdp: 3600, cost: 120000, tf: { fp32: 260, fp16: 8000, fp8: 16000, fp4: 50000 },
  },
  'feynman': {
    name: 'Feynman (Roadmap)', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2028.7,
    vram: 1500, bw: 50000, tdp: 4000, cost: 150000, tf: { fp32: 500, fp16: 15000, fp8: 30000, fp4: 100000 },
  },
  'nx-2030': {
    name: 'Next-Gen 2030 (fiktiv)', vendor: 'nvidia', tier: 'dc', ff: 'sxm', year: 2030.5,
    vram: 2500, bw: 80000, tdp: 5000, cost: 200000, tf: { fp32: 1000, fp16: 30000, fp8: 60000, fp4: 200000 },
  },

  // ---------- Google TPU (nur Cloud) ----------
  'tpu-v4': {
    name: 'TPU v4', vendor: 'google', tier: 'dc', ff: 'sxm', year: 2021.6, cloudOnly: true,
    vram: 32, bw: 1200, tdp: 200, cost: 0, tf: { fp32: 70, fp16: 275 },
  },
  'tpu-v5p': {
    name: 'TPU v5p', vendor: 'google', tier: 'dc', ff: 'sxm', year: 2023.95, cloudOnly: true,
    vram: 95, bw: 2765, tdp: 400, cost: 0, tf: { fp32: 115, fp16: 459, fp8: 918 },
  },
  'tpu-v7': {
    name: 'TPU v7 Ironwood', vendor: 'google', tier: 'dc', ff: 'sxm', year: 2025.8, cloudOnly: true,
    vram: 192, bw: 7370, tdp: 900, cost: 0, tf: { fp32: 300, fp16: 2300, fp8: 4614 },
  },
};

export const PRECISIONS = ['fp32', 'fp16', 'fp8', 'fp4'];

// Forschung, die eine GPU-Klasse freischaltet
export const TIER_RESEARCH = { consumer: null, pro: 'gpu-training', dc: 'datacenter-hw' };
