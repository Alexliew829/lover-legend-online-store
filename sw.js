const CACHE = 'll-online-v1.01-101';
const FILES = ['./','./index.html','./css/style.css','./js/store.js','./js/import-adapter.js','./js/app.js','./manifest.json','./version.json'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(resp => { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)); return resp; }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html'))));
});
