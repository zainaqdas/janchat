// Service Worker for push notifications
const CACHE_NAME = 'call-cache-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const { title, body, icon, badge, tag, data: payloadData, actions, requireInteraction } = data

    const options = {
      body: body || '',
      icon: icon || '/favicon.svg',
      badge: badge || '/favicon.svg',
      tag: tag || 'default',
      data: payloadData || {},
      vibrate: [200, 100, 200],
      requireInteraction: requireInteraction !== false,
      actions: actions || [
        { action: 'open', title: 'Open' },
      ],
    }

    event.waitUntil(
      self.registration.showNotification(title || 'call', options)
    )
  } catch (err) {
    // If it's not JSON, show the raw text
    event.waitUntil(
      self.registration.showNotification('call', {
        body: event.data.text(),
        icon: '/favicon.svg',
      })
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window tab is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
