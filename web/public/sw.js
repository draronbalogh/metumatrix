// Minimál service worker a sürgős-kártya értesítésekhez: Androidon a Notification
// konstruktor nem él, csak a registration.showNotification — ehhez kell a SW.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const c = cs.find((x) => 'focus' in x);
      return c ? c.focus() : self.clients.openWindow('/');
    })
  );
});
