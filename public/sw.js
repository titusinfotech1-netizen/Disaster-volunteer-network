// Service Worker for Disaster Volunteer Network Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data = {
      title: '🚨 Emergency Disaster Alert',
      body: event.data ? event.data.text() : 'A new disaster response task requires your assistance.'
    };
  }

  const title = data.title || '🚨 Emergency Disaster Alert';
  const options = {
    body: data.body || 'A new disaster response task requires your assistance.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    vibrate: data.vibrate || [300, 100, 300, 100, 300],
    tag: data.tag || 'emergency-notification-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/volunteer-dashboard',
      timestamp: Date.now(),
      ...data.data
    },
    actions: [
      { action: 'open', title: 'View Task' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification interaction / click on mobile device
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetPath = event.notification.data?.url || '/volunteer-dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window tab is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && !client.url.includes(targetPath)) {
            client.navigate(targetPath);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Notification dismissed by user
});
