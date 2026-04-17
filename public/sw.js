// Kill-switch: clears all caches from the old site and unregisters this SW.
// Once users' browsers pick up this file, they'll get a clean slate.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});

// Pass all fetches through to the network while active
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
