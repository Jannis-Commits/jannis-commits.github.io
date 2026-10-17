// Service Worker: Network-first (immer neueste Version, wenn online), Cache als Offline-Fallback.
const CACHE = 'aicg-v3';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/main.js', 'js/state.js', 'js/util/format.js', 'js/util/rng.js',
  'js/engine/turn.js', 'js/engine/training.js', 'js/engine/market.js', 'js/engine/rivals.js', 'js/engine/research.js',
  'js/engine/company.js', 'js/engine/products.js', 'js/engine/hardware.js', 'js/engine/memory.js', 'js/engine/events.js',
  'js/engine/funding.js', 'js/engine/goals.js', 'js/engine/alerts.js',
  'js/ui/components.js', 'js/ui/home.js', 'js/ui/infra.js', 'js/ui/lab.js', 'js/ui/wizard.js', 'js/ui/research.js',
  'js/ui/business.js', 'js/ui/products.js', 'js/ui/sheets.js',
  'config/formulas.js', 'config/tasks.js', 'config/datasets.js', 'config/gpus.js', 'config/parts.js', 'config/locations.js',
  'config/staff.js', 'config/research.js', 'config/rivals.js', 'config/contracts.js', 'config/products.js',
  'config/pipeline.js', 'config/funding.js', 'config/events.js', 'config/goals.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
