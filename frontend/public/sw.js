const CACHE_NAME = 'award-ccu-cache-v1';
const BASE_URL = new URL('./', self.location.href);
const ASSETS_TO_CACHE = [
  '',
  'index.html',
  'manifest.json',
  'icon.svg',
  'assets/equipment/bp_monitor.png',
  'assets/equipment/ecg_monitor.png',
  'assets/equipment/first_aid_kit.png',
  'assets/equipment/iv_bag.png',
  'assets/equipment/medical_chart.png',
  'assets/equipment/medicine_bottle.png',
  'assets/equipment/otoscope.png',
  'assets/equipment/oxygen_mask.png',
  'assets/equipment/penlight.png',
  'assets/equipment/pulse_oximeter.png',
  'assets/equipment/reflex_hammer.png',
  'assets/equipment/scissors_forceps.png',
  'assets/equipment/stethoscope.png',
  'assets/equipment/syringe.png',
  'assets/equipment/thermometer_digital.png',
  'assets/equipment/thermometer_glass.png',
].map((asset) => new URL(asset, BASE_URL).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match(new URL('index.html', BASE_URL).toString()))
      )
  );
});
