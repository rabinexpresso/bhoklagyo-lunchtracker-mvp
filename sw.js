// ═══════════════════════════════════════════════════════════════
//  Bhok Lagyo! — Service Worker v5
//  Strategy: only cache the app shell for offline.
//  ALL cross-origin requests (Google Sheets JSONP, GitHub API,
//  Google Fonts) are passed straight through — no interception.
//  HTML/JS served network-first so fixes deploy instantly.
// ═══════════════════════════════════════════════════════════════
const CACHE = 'bhok-lagyo-v5';

// ── Install ──
self.addEventListener('install', function(e) {
  // Pre-cache nothing on install — just activate immediately.
  // We'll cache on first fetch instead.
  self.skipWaiting();
});

// ── Activate: delete ALL old caches ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        return caches.delete(k); // wipe everything, start fresh
      }));
    }).then(function() {
      return self.clients.claim(); // take control of all open tabs immediately
    })
  );
});

// ── Message ──
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Fetch ──
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  var method = e.request.method;

  // ── Never intercept these — let browser handle completely ──
  // This covers ALL Google Sheets JSONP calls, GitHub API, fonts,
  // and any other cross-origin request the app makes.
  if (
    url.indexOf('script.google.com') !== -1 ||
    url.indexOf('googleapis.com') !== -1 ||
    url.indexOf('github.com') !== -1 ||
    url.indexOf('gstatic.com') !== -1 ||
    url.indexOf('fonts.') !== -1 ||
    method !== 'GET'
  ) {
    // Do NOT call e.respondWith() — browser handles it natively.
    return;
  }

  // ── Network-first for HTML, JS, manifest — always get latest ──
  if (
    url.indexOf('.html') !== -1 ||
    url.indexOf('.js') !== -1 ||
    url.indexOf('.json') !== -1 ||
    url.slice(-1) === '/'
  ) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(function(resp) {
          if (resp && resp.status === 200) {
            var clone = resp.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          }
          return resp;
        })
        .catch(function() {
          // Offline fallback
          return caches.match(e.request);
        })
    );
    return;
  }

  // ── Cache-first for everything else (PNG icons, etc.) ──
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});

// ── Push notifications ──
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); }
  catch(ex) { data = { title: 'Bhok Lagyo 🍛', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Bhok Lagyo 🍛', {
      body: data.body || '',
      tag: data.tag || 'bhok',
      renotify: true,
      vibrate: [200, 100, 200],
      data: data
    })
  );
});

// ── Notification click ──
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cs) {
      for (var i = 0; i < cs.length; i++) {
        if ('focus' in cs[i]) return cs[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
