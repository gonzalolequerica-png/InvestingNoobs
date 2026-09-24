/* InvestingNoobs service worker.
   Keeps the shell available offline and lets the site be installed as an app.
   Never caches market data: every price request goes straight to the network. */
const CACHE = 'in-shell-v1';
const SHELL = [
  './',
  'index.html',
  'blog.html',
  'manifest.json',
  'lesson-urls.js',
  'in-app.js',
  'icon-192.png',
  'icon-512.png',
  'favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Anything that is not ours (prices, ads, fonts, images from CoinGecko...)
  // is left completely alone.
  if (url.origin !== self.location.origin) return;

  // Pages: network first, so a fresh deploy is picked up straight away.
  // The cached copy is only used when the network fails.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
    );
    return;
  }

  // Our own static files: serve from cache and refresh in the background.
  if (/\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?|json)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});

/* Price alerts (used by the alerts feature). */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  const title = d.title || 'InvestingNoobs';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'in-alert',
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) { c.navigate(target); return c.focus(); }
    }
    return clients.openWindow(target);
  }));
});
