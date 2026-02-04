// MINIMAL SERVICE WORKER - Solo per PWA fullscreen iOS + Push Notifications
// NO caching, NO auto-updates, NO notifiche spam!

const SW_VERSION = '3.0.0-push';

// Install - attiva immediatamente senza precaching
self.addEventListener('install', event => {

  self.skipWaiting();
});

// Activate - prendi il controllo immediatamente
self.addEventListener('activate', event => {

  event.waitUntil(self.clients.claim());
});

// Fetch - passa tutto al network, nessun caching
self.addEventListener('fetch', event => {
  // Lascia che il browser gestisca tutto normalmente
  return;
});

// Push notification handler
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    console.warn('[SW] Push event without data');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    // Fallback for plain text
    payload = {
      title: 'CUR8 Games',
      body: event.data.text()
    };
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-72x72.png',
    timestamp: payload.timestamp || Date.now(),
    tag: payload.tag || 'default',
    requireInteraction: payload.requireInteraction || false,
    silent: payload.silent || false,
    data: payload.data || {}
  };

  // Add action buttons if provided
  if (payload.actions) {
    options.actions = payload.actions;
  }

  // Vibration pattern for supported devices
  if (payload.vibrate) {
    options.vibrate = payload.vibrate;
  } else {
    options.vibrate = [100, 50, 100];
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'CUR8 Games', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  // Get URL from notification data or default to home
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate existing window
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// Notification close handler (for analytics if needed)
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Message handler - per debug e utility
self.addEventListener('message', event => {
  if (event.data?.type === 'GET_SW_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
  
  // Handle push subscription updates
  if (event.data?.type === 'PUSH_SUBSCRIBE') {
    console.log('[SW] Push subscription request received');
  }
});
