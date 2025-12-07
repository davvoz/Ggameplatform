// App version - will be updated automatically by GitHub Actions
let APP_VERSION = '1.0.0';

// Fetch version from server on install
async function fetchAppVersion() {
  try {
    const response = await fetch('/version.json');
    if (response.ok) {
      const data = await response.json();
      APP_VERSION = data.version;
      console.log('[Service Worker] Loaded version:', APP_VERSION);
    }
  } catch (error) {
    console.warn('[Service Worker] Could not fetch version:', error);
  }
}

const CACHE_NAME = 'cur8-games-v3';
const RUNTIME_CACHE = 'runtime-cache-v3';

// Precache SOLO i file essenziali - il resto verrà caricato on-demand
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - precache essential files
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    fetchAppVersion()
      .then(() => caches.open(CACHE_NAME))
      .then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with fallback strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip CDN requests - let browser handle them directly (CSP will manage)
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'esm.sh') {
    return;
  }

  // Network-only for API calls, version.json e env.js (always fetch fresh data)
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/users/') ||
      url.pathname.includes('/games/list') ||
      url.pathname.includes('/leaderboard/') ||
      url.pathname.includes('/quests/') ||
      url.pathname.includes('/version.json') ||
      url.pathname.includes('/env.js')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => {
          // Return offline fallback for API errors
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'No network connection' }),
            { 
              status: 503, 
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Stale-while-revalidate for game files
  if (url.pathname.startsWith('/games/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE)
        .then(cache => {
          return cache.match(request)
            .then(cachedResponse => {
              const fetchPromise = fetch(request)
                .then(networkResponse => {
                  if (networkResponse && networkResponse.status === 200) {
                    cache.put(request, networkResponse.clone());
                  }
                  return networkResponse;
                })
                .catch(() => cachedResponse);
              
              return cachedResponse || fetchPromise;
            });
        })
    );
    return;
  }

  // Network-first per JS e HTML (sempre freschi), cache-first per immagini e font
  if (url.pathname.match(/\.(js|html)$/)) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then(response => {
          // Cache la risposta solo se è valida
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback alla cache solo se network fallisce
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first solo per assets pesanti (immagini, font)
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then(response => {
              if (!response || response.status !== 200 || response.type === 'error') {
                return response;
              }

              const clone = response.clone();
              caches.open(RUNTIME_CACHE)
                .then(cache => cache.put(request, clone));
              
              return response;
            });
        })
    );
    return;
  }

  // Network-first per CSS (garantire aggiornamenti)
  if (url.pathname.match(/\.css$/)) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for HTML pages with cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE)
          .then(cache => cache.put(request, clone));
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(response => {
            return response || caches.match('/index.html');
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Clearing cache');
    event.waitUntil(
      caches.keys()
        .then(cacheNames => Promise.all(cacheNames.map(name => caches.delete(name))))
        .then(() => self.clients.matchAll())
        .then(clients => {
          clients.forEach(client => client.postMessage({ type: 'CACHE_CLEARED' }));
        })
    );
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    console.log('[Service Worker] Version requested');
    event.ports[0].postMessage({ 
      type: 'VERSION_INFO', 
      version: APP_VERSION 
    });
  }
});

// Check for version updates periodically
async function checkForUpdates() {
  try {
    const response = await fetch('/version.json', { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (response.ok) {
      const data = await response.json();
      const newVersion = data.version;
      
      if (newVersion !== APP_VERSION) {
        console.log(`[Service Worker] 🎉 New version available: ${newVersion} (current: ${APP_VERSION})`);
        
        // Aggiorna la versione locale
        APP_VERSION = newVersion;
        
        // Notify all clients about the new version
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'NEW_VERSION_AVAILABLE',
            currentVersion: APP_VERSION,
            newVersion: newVersion,
            changelog: data.changelog && data.changelog[0] ? data.changelog[0] : null
          });
        });
        
        // Forza il re-install del service worker
        self.skipWaiting();
        
        return true;
      }
    }
  } catch (error) {
    console.warn('[Service Worker] Version check failed:', error);
  }
  return false;
}

// Check for updates ogni 2 minuti (più aggressivo)
setInterval(() => {
  checkForUpdates();
}, 2 * 60 * 1000);

// Check immediato all'attivazione
checkForUpdates();

// Sync event for background sync (future feature)
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  if (event.tag === 'sync-game-scores') {
    event.waitUntil(syncGameScores());
  }
});

// Push notification event (future feature)
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Cur8 Games';
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event.action);
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

// Helper function for background sync (placeholder)
async function syncGameScores() {
  console.log('[Service Worker] Syncing game scores...');
  // Implementation for syncing offline game scores
  return Promise.resolve();
}
