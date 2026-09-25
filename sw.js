const CACHE = "lover-legend-online-store-V2.5-identity-isolated";
const SCOPE_PATH = "/lover-legend-online-store/";
const CORE = [
  "./",
  "./index.html?v=25-import-initial-minimum-readonly",
  "./css/style.css?v=25-import-initial-minimum-readonly",
  "./js/common.js?v=25-import-initial-minimum-readonly",
  "./js/sync.js?v=25-import-initial-minimum-readonly",
  "./js/app.js?v=25-import-initial-minimum-readonly",
  "./manifest.json?v=25-import-initial-minimum-readonly",
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
      .then(keys => Promise.all(keys.filter(key => key.startsWith("lover-legend-online-store-") && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put("./index.html?v=25-import-initial-minimum-readonly", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match("./index.html?v=25-import-initial-minimum-readonly")) || (await caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
