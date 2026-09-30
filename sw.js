const CACHE = "lover-legend-online-store-V8.3-clean-r2";
const SCOPE_PATH = "/lover-legend-online-store/";
const CORE = [
  "./",
  "./index.html?v=83-clean-r2",
  "./css/style.css?v=83-clean-r2",
  "./js/sync.js?v=83-clean-r2",
  "./js/app.js?v=83-clean-r2",
  "./manifest.json?v=83-clean-r2",
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
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(CORE.map(url => cache.add(new Request(url, { cache: "reload" })).catch(error => {
        console.warn("SW cache skipped:", url, error);
        return null;
      })))
    )
  );
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
    event.respondWith((async () => {
      const cached = (await caches.match("./index.html?v=83-clean-r2")) || (await caches.match("./index.html"));
      const update = fetch(event.request, { cache: "no-store" }).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html?v=83-clean-r2", copy));
        }
        return response;
      }).catch(() => null);
      if (cached) { event.waitUntil(update); return cached; }
      return (await update) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request, { cache: "no-store" })
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
