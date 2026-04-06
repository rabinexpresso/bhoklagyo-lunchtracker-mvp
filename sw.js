// Bhok Lagyo — SW Killer
// This SW's only job: unregister itself and clear all caches.
// Fixes PWA issues caused by old SWs intercepting Google Sheets JSONP calls.
self.addEventListener('install', function() {
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(keys.map(function(k) { return caches.delete(k); }));
      })
      .then(function() {
        return self.registration.unregister();
      })
      .then(function() {
        return self.clients.matchAll({ includeUncontrolled: true });
      })
      .then(function(clients) {
        clients.forEach(function(c) { c.navigate(c.url); });
      })
  );
});
self.addEventListener('fetch', function(e) {
  // Pass everything through — no interception at all
  return;
});
