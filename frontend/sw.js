// MINIMAL SERVICE WORKER - Solo per PWA fullscreen iOS
// NO caching, NO auto-updates, NO notifiche spam!

const SW_VERSION = '2.0.0-minimal';

// Install - attiva immediatamente senza precaching
self.addEventListener('install', event => {
  console.log('[SW] Installing minimal service worker v' + SW_VERSION);
  self.skipWaiting();
});

// Activate - prendi il controllo immediatamente
self.addEventListener('activate', event => {
  console.log('[SW] Activating minimal service worker');
  event.waitUntil(self.clients.claim());
});

// Fetch - passa tutto al network, nessun caching
self.addEventListener('fetch', event => {
  // Lascia che il browser gestisca tutto normalmente
  return;
});

// Message handler - per debug e utility
self.addEventListener('message', event => {
  if (event.data?.type === 'GET_SW_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
});
