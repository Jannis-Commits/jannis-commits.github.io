# AI Company (game)

Rundenbasiertes AI-Firmen-Spiel, mobile-first, Vanilla JS ohne Build.

- `config/` – alle Balancing-Werte (GPUs, Komponenten, Forschung, Datasets, Pipeline, Funding, Events, Ziele)
- `js/engine/` – Spiellogik (ohne DOM)
- `js/ui/` – Ansichten pro Tab + Bottom-Sheets
- `js/state.js` – Spielstand, Save/Export/Import
- `tools/sim.mjs` – Bot spielt einen Run durch (Balancing): `node tools/sim.mjs [wochen] [seed]`

## Tabs
- **Zentrale** – Kennzahlen, nächstes Ziel, To-do-Liste (was gerade Aufmerksamkeit braucht), laufende Jobs, Logbuch
- **Infra** – Maschinen & Pools, Shop (Maschinen, GPUs neu/gebraucht), Standort, Cloud
- **Labor** – Training (Pretraining, Post-Training, Distillation als Wizard), Modelle, Daten
- **Forschung** – nach Zweigen gefiltert, mit Warteschlange
- **Business** – Aufträge, Produkte (Chat/API/Apps), Ranking, Firma (Team, Finanzierung, Finanzen)

## Stand
- **M1/M2:** Kern-Loop, Forschung, Aufträge, Rivalen, LLM-Produkte, Late Game bis 2030+
- **M3 (großer Umbau, neue Saves):**
  - Hardware als Bausystem: PC / Workstation / 4U-Server / HGX-Node / NVL72-Rack kaufen, GPUs einzeln einbauen, CPU, RAM, Laufwerke, Kühlung, Netzteil und Netzwerk aufrüsten. Echte GPUs & CPUs (GTX 970 … B300, Rubin; i7-6700K … EPYC 9965). Engpässe (CPU-Feed, Storage, RAM, Throttling, PCIe-Lanes), Cluster-Effizienz je Netzwerk, Gruppen identischer Maschinen (×1/×10/×100), Rollen Training/Chat/API/Aus, Cloud-Gruppen
  - VRAM: Training (Gewichte/Gradienten/Optimizer/Aktivierungen, Präzision, Checkpointing, ZeRO/FSDP, Tensor-Parallel, Offload, LoRA/QLoRA) und Inferenz (Gewichte + KV-Cache → Batch → Tokens/s)
  - Trainings-Pipeline: Pretraining → SFT (inkl. Fach-Daten) → RLHF/DPO → Reasoning-RL → Agentic-RL, Distillation, Quantisierung (RTN/GPTQ/AWQ/QAT bis 2 Bit), Benchmarks, Open-Weight-Modelle herunterladen
  - Lernrate, Checkpoints, Loss-Kurve, Abstürze und Loss-Spikes mit Entscheidung
  - Aufträge mit Anforderungen (Fachgebiet, Skill, „läuft auf Gerät X“), Finanzierungsrunden bis IPO, Ereignisse, GPU-Marktphasen, Ziele, Team mit 5 Rollen
