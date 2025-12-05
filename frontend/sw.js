const CACHE_NAME = 'cur8-games-v2';
const RUNTIME_CACHE = 'runtime-cache-v2';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/auth.html',
  '/css/variables.css',
  '/css/layout.css',
  '/css/navigation.css',
  '/css/game-catalog.css',
  '/css/game-player.css',
  '/css/auth.css',
  '/css/profile.css',
  '/css/wallet.css',
  '/css/leaderboard.css',
  '/css/quest-hero.css',
  '/css/level-widget.css',
  '/css/utilities.css',
  '/js/main.js',
  '/js/router.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/authManager.js',
  '/js/config.js',
  '/js/nav.js',
  '/js/runtimeShell.js',
  '/js/coinAPI.js',
  '/js/CoinBalanceWidget.js',
  '/js/LeaderboardAPI.js',
  '/js/LeaderboardRenderer.js',
  '/js/level-widget.js',
  '/js/ProfileRenderer.js',
  '/js/quest.js',
  '/js/SteemProfileService.js',
  '/js/WalletProfileWidget.js',
  '/js/WalletRenderer.js',
  '/js/game-status-integration.js',
  '/env.js',
  '/manifest.json'
];

// Install event - precache essential files
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
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

  // Network-only for API calls (always fetch fresh data)
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/users/') ||
      url.pathname.includes('/games/list') ||
      url.pathname.includes('/leaderboard/') ||
      url.pathname.includes('/quests/')) {
    event.respondWith(
      fetch(request)
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

  // Cache-first strategy for static assets (CSS, JS, images)
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then(response => {
              // Don't cache non-ok responses
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
});

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
