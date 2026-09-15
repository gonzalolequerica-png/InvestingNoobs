/*
  Service worker del juego (Investing Noobs Tycoon).

  Solo se ocupa de los archivos del juego: cualquier otra pagina de la web
  (el tracker, los articulos, el curso) pasa de largo sin tocarse, para que
  nunca se quede una version antigua guardada de esas paginas.

  - game.html: primero la red y, si no hay conexion, lo guardado.
  - Imagenes, sonidos y scripts del juego: primero lo guardado y se actualiza por detras.
  - Todo lo demas: no se intercepta.
*/
const VERSION = 'tycoon-v12';
const CORE_CACHE = VERSION + '-core';
const RUN_CACHE = VERSION + '-run';
const RUN_MAX = 140; // tope de archivos guardados sobre la marcha

// Lo minimo para que el juego arranque sin conexion.
const CORE = [
  'game.html',
  'game-manifest.json',
  'game-career.js?v=20260906-1',
  'game-career.css?v=20260906-1',
  'game-finance.js?v=20260906-1',
  'game-room-3d.js?v=20260912-1',
  'game-room-3d.css?v=20260914-1',
  'vendor/three/three.core.min.js',
  'vendor/three/three.module.min.js',
  'game-icon-192.png',
  'game-icon-512.png',
  'favicon.svg',
  'asset-Cuarto-1_1.webp',
  'asset-Cuarto-1_2.webp',
  'asset-Cuarto-1_3.webp',
  'asset-Cuarto-1_4.webp',
  'asset-companion-m.webp',
  'asset-companion-f.webp',
  'asset-companion-f-intro.webp',
  'asset-personaje-trader.webp',
  'asset-personaje-trader-no-laptop.webp',
  'asset-personaje-trader-f-alpha.webp',
  'character-intro.webp',
  'scene-room-1.webp',
  'scene-intro-gotera.webp',
  'asesor-1.png',
];

// Prefijos de archivos que pertenecen al juego.
const PREFIJOS = [
  'game-', 'asset-', 'scene-', 'companion-', 'personaje-', 'asesor-',
  'menu-', 'movil-', 'Cuarto', 'icon-', 'vendor/three/', 'neon_lounge',
  'character-intro', 'favicon.svg',
];

function esArchivoDelJuego(ruta) {
  const limpia = ruta.replace(/^\//, '');
  if (limpia === 'game.html') return true;
  return PREFIJOS.some(p => limpia.startsWith(p));
}

function esNavegacionAlJuego(request, url) {
  return request.mode === 'navigate' && url.pathname.replace(/^\//, '') === 'game.html';
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    // Uno a uno: si un archivo falla, la instalacion sigue adelante.
    await Promise.all(CORE.map(async ruta => {
      try { await cache.add(new Request(ruta, { cache: 'reload' })); } catch (e) {}
    }));
    await self.skipWaiting(); // la version nueva manda ya, sin esperar a que se cierren las pestanas
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.map(n => (n.startsWith('tycoon-') && !n.startsWith(VERSION)) ? caches.delete(n) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function recortarCache() {
  const cache = await caches.open(RUN_CACHE);
  const claves = await cache.keys();
  if (claves.length <= RUN_MAX) return;
  await Promise.all(claves.slice(0, claves.length - RUN_MAX).map(k => cache.delete(k)));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;      // APIs y CDNs, a su aire
  if (!esArchivoDelJuego(url.pathname) && !esNavegacionAlJuego(req, url)) return; // el resto de la web, intacto

  // La pagina del juego: red primero para que las actualizaciones lleguen solas.
  if (esNavegacionAlJuego(req, url) || url.pathname.endsWith('game.html')) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(CORE_CACHE);
          cache.put('game.html', res.clone());
        }
        return res;
      } catch (e) {
        const guardado = await caches.match('game.html', { ignoreSearch: true });
        return guardado || Response.error();
      }
    })());
    return;
  }

  // Archivos del juego: lo guardado va primero y se refresca por detras.
  // Se respeta el ?v= de la direccion: si el archivo cambia de version, se pide de nuevo
  // en lugar de servir la copia antigua.
  event.respondWith((async () => {
    const guardado = await caches.match(req);
    const red = fetch(req).then(async res => {
      if (res && res.ok) {
        const cache = await caches.open(RUN_CACHE);
        await cache.put(req, res.clone());
        recortarCache();
      }
      return res;
    }).catch(() => null);
    if (guardado) return guardado;
    const respuesta = await red;
    if (respuesta) return respuesta;
    // Sin conexion: sirve cualquier version guardada del mismo archivo
    return (await caches.match(req, { ignoreSearch: true })) || Response.error();
  })());
});
