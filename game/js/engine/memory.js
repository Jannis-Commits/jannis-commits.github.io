import { MEMORY, PRECISION, MOE } from '../../config/formulas.js';
import { has } from './research.js';

// VRAM-Rechner für Training und Inferenz. Alle Ergebnisse in GB.

export const activeParams = (m) => m.params * (m.arch === 'moe' ? m.activeShare || MOE.activeShare : 1);

// Training: Speicher pro GPU.
// spec: params, arch, activeShare, precision, adapter (full|lora|qlora), ckpt, sharding (none|zero|fsdp), offload
// pl: Pool aus hardware.pool()
export function trainMemory(state, spec, pl) {
  const P = spec.params, A = activeParams(spec);
  const b = PRECISION[spec.precision].bytes;
  const N = Math.max(1, pl.gpus);
  const tp = has(state, 'tensor-parallel') ? pl.gpusPerMachine : 1;
  const ckpt = spec.ckpt ? MEMORY.ckptAct : 1;
  let a = MEMORY.actGb * 1e9 * Math.pow(A / 1e9, MEMORY.actExp) * (b / 2) * ckpt;
  let w, g, o;
  if (spec.adapter === 'lora' || spec.adapter === 'qlora') {
    w = P * (spec.adapter === 'qlora' ? MEMORY.qloraBytes : b);
    g = P * MEMORY.loraShare * b;
    o = P * MEMORY.loraShare * MEMORY.optim;
  } else {
    w = P * b;
    g = P * b;
    o = P * MEMORY.optim;
  }
  const oTotal = o;
  if (spec.sharding === 'zero' || spec.sharding === 'fsdp') { o /= N; g /= N; }
  if (spec.sharding === 'fsdp') w /= N;
  else { w /= tp; if (spec.sharding !== 'zero') { g /= tp; o /= tp; } }
  a /= tp;
  let ramNeed = 0;
  if (spec.offload) { ramNeed = oTotal / Math.max(1, pl.machines) / 1e9; o = 0; }
  const parts = { weights: w / 1e9, grads: g / 1e9, optim: o / 1e9, act: a / 1e9 };
  const perGpu = parts.weights + parts.grads + parts.optim + parts.act + MEMORY.overheadGb;
  const cap = pl.minVram;
  const ramCap = pl.minRam * 0.8;
  return { parts, perGpu, cap, fits: perGpu <= cap, ramNeed, ramCap, ramOk: ramNeed <= ramCap, tp };
}

// Vorschläge, wenn es nicht passt
export function memoryTips(state, spec, mem) {
  const tips = [];
  if (mem.fits && mem.ramOk) return tips;
  if (!mem.ramOk) tips.push('CPU-Offload braucht mehr RAM pro Maschine – RAM aufrüsten oder Offload aus.');
  if (mem.fits) return tips;
  if (!spec.ckpt && has(state, 'grad-ckpt')) tips.push('Gradient Checkpointing an: Aktivierungen −87 %.');
  if (spec.precision === 'fp32' && has(state, 'fp16')) tips.push('BF16 statt FP32: halber Speicher.');
  if (spec.sharding === 'none' && has(state, 'zero')) tips.push('ZeRO-Sharding: Optimizer auf alle GPUs verteilen.');
  if (spec.sharding !== 'fsdp' && has(state, 'fsdp')) tips.push('FSDP: auch die Gewichte verteilen.');
  if (!spec.offload && has(state, 'offload')) tips.push('CPU-Offload: Optimizer in den RAM.');
  if (spec.adapter === 'full' && has(state, 'lora') && spec.kind === 'post') tips.push('LoRA statt Full: ~10× weniger VRAM.');
  if (spec.adapter === 'lora' && has(state, 'qlora')) tips.push('QLoRA: Basis in 4 Bit.');
  tips.push('Mehr VRAM: GPUs mit mehr Speicher oder mehr GPUs (mit Sharding).');
  return tips;
}

// ---------- Inferenz ----------

export const weightsGb = (m, bits = m.bits || 16) => (m.params * bits) / 8 / 1e9;
export const kvGb = (state, m) => (activeParams(m) / 1e9) * MEMORY.kvPerB * (has(state, 'gqa') ? MEMORY.gqaKv : 1);

// Kleinste VRAM-Menge, auf der das Modell mit einer Anfrage läuft
export const minServeGb = (state, m) => weightsGb(m) * 1.05 + kvGb(state, m) + MEMORY.overheadGb;

// Tokens/Sekunde einer Maschine für ein Modell (bestes aus: je GPU eine Kopie, oder Tensor-Parallel über alle)
export function serveRate(state, m, s) {
  if (!m) return { tokS: 0, fits: false };
  const wGb = weightsGb(m) * 1.05 + MEMORY.overheadGb, kv = Math.max(kvGb(state, m), 1e-6);
  const bytesPerTok = activeParams(m) * (m.bits || 16) / 8;
  const flopsPerTok = 2 * activeParams(m);
  const maxBatch = MEMORY.batchMax * (has(state, 'paged') ? MEMORY.pagedBatch : 1);
  const speed = has(state, 'spec') ? MEMORY.specDecode : 1;
  const tfPerTf = s.raw / Math.max(1, s.gpus);
  const replica = (vram, bw, tf) => {
    const batch = Math.min(maxBatch, Math.floor((vram - wGb) / kv));
    if (batch < 1) return 0;
    return Math.min((bw * 1e9 * batch) / bytesPerTok, (tf * 1e12 * MEMORY.inferUtil) / flopsPerTok) * speed;
  };
  let best = 0;
  if (s.gpus) {
    // je GPU eine Kopie
    let sum = 0;
    for (const g of s.gpuList) sum += replica(g.vram, g.bw, tfPerTf);
    best = sum;
    if (has(state, 'tensor-parallel') && s.gpus > 1) best = Math.max(best, replica(s.vramTotal, s.bw, s.raw));
  } else {
    best = replica(s.vramTotal * 0.7, MEMORY.cpuBw, s.raw);
  }
  return { tokS: best * s.coolF, fits: best > 0 };
}
