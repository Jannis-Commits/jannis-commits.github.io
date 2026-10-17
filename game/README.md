# AI Company (game)

Rundenbasiertes AI-Firmen-Spiel, mobile-first, Vanilla JS ohne Build.

- `config/` – alle Balancing-Werte
- `js/engine/` – Spiellogik (ohne DOM)
- `js/ui/` – Ansichten pro Tab
- `js/state.js` – Spielstand, Save/Export/Import
- `tools/` – Node-Skripte zum Balancen (`node tools/sim.mjs`)

## Stand
- **M1:** Kern-Loop, Training, Hardware, Forschung, Aufträge, Rivalen-Rangliste, PWA
- **M2:** LLM-Produkte (Chat-Website mit Abo, API mit Preis pro 1M Tokens, Open Source, Lizenz-Deals), Compute-Split Training/Inferenz mit Serverlast, Late Game bis 2030+ (Gen-4–6-GPUs, Rechenzentren bis 1 GW, Post-Training/Reasoning/Agents-Forschung, fiktive Rivalen-Releases)
