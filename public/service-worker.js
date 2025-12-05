// sw.js
const CACHE_NAME = 'todo-cache-v3'; // ↑ Cambia la versión para forzar actualización
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index-*.js', // Vite genera hashes, así que usa patrón
  '/assets/index-*.css',
  '/icons/icon192x192.png',
  '/icons/icon512x512.png',
];

// Archivos que siempre deben venir de la red (API, etc.)
const NETWORK_ONLY = [
  '/api/',
  '/tasks',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache solo los archivos base
      return cache.addAll([
        '/',
        '/index.html',
        '/icons/icon192x192.png',
        '/icons/icon512x512.png',
      ]).catch(err => {
        console.warn('Cache install partial failed:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Si es una solicitud de API → siempre usa la red
  if (NETWORK_ONLY.some(prefix => request.url.includes(prefix))) {
    return event.respondWith(fetch(request));
  }

  // 2. Si es una solicitud de navegación (HTML)
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => {
        // Si falla la red, servir el index.html desde cache
        return caches.match('/index.html');
      })
    );
    return;
  }

  // 3. Para otros recursos (JS, CSS, imágenes)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        // Opcional: cachea en vuelo (solo para recursos estáticos)
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
        }
        return response;
      }).catch(() => {
        // Si todo falla, intentar con index.html (último recurso)
        return caches.match('/index.html');
      });
    })
  );
});