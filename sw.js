/* ADAS Team — service worker: shows push notifications and opens the Team page when tapped.
 * Deliberately no offline caching, so updates to the site are always picked up straight away. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'ADAS', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'ADAS', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/#/team' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/#/team', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        try { await w.navigate(url); } catch (e) { /* cross-state navigation not allowed */ }
        return w.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
