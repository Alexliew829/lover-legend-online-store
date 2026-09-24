const CACHE = "lover-legend-online-store-v2.0-import372-readonly-adapter-orange";
const CORE = [
  "./",
  "./index.html?v=20-import372-readonly",
  "./css/style.css?v=20-import372-readonly",
  "./js/common.js?v=20-import372-readonly",
  "./js/sync.js?v=20-import372-readonly",
  "./js/app.js?v=20-import372-readonly",
  "./manifest.json?v=20-import372-readonly",
  "./assets/images/logo-green.jpg",
  "./assets/images/logo-red.jpg",
  "./assets/icons/online-store-orange-v15.ico",
  "./assets/icons/apple-touch-icon-v15.png",
  "./assets/icons/online-store-orange-v15-192.png",
  "./assets/icons/online-store-orange-v15-512.png",
  "./assets/icons/online-store-orange-v15-maskable-192.png",
  "./assets/icons/online-store-orange-v15-maskable-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html?v=20-import372-readonly", copy));
          return response;
        })
        .catch(() => caches.match("./index.html?v=20-import372-readonly") || caches.match("./index.html"))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
