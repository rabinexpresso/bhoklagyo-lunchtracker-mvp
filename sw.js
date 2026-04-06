// ═══════════════════════════════════════════════════════════════
//  Bhok Lagyo! — Service Worker  (deploy alongside index.html)
//  v4 — network-first for HTML so fixes reach PWA immediately
//       cache-first only for static assets (fonts, images)
// ═══════════════════════════════════════════════════════════════
const CACHE = 'bhok-lagyo-v4';
const SHELL = ['./index.html', './sw.js', './manifest.json'];
const ICON  = 'data:image/png;base64,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';

// ── Install: pre-cache app shell ──
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c) { return c.addAll(SHELL); })
      .catch(function() {})        // don't block install if offline
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── Message: let the page trigger skip-waiting ──
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Fetch: smart strategy ──
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  var method = e.request.method;

  // ── Always pass through to network for these — never cache ──
  // Bare `return` skips e.respondWith for navigational fetches but NOT
  // for subresource fetches like <script> tags (JSONP). Use explicit
  // e.respondWith(fetch()) so the request definitely hits the network.
  if (url.includes('script.google.com') ||
      url.includes('api.github.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('googleapis.com') ||
      method !== 'GET') {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response('', { status: 503 });
    }));
    return;
  }

  // ── Network-first for HTML and JS — ensures latest code always runs ──
  // Falls back to cache only when truly offline
  if (url.endsWith('.html') || url.endsWith('.js') ||
      url.endsWith('/') || url.includes('index')) {
    e.respondWith(
      fetch(e.request)
        .then(function(resp) {
          if (resp && resp.status === 200) {
            var clone = resp.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          }
          return resp;
        })
        .catch(function() {
          return caches.match(e.request);
        })
    );
    return;
  }

  // ── Cache-first for everything else (icons, manifest, fonts) ──
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var network = fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {});
      return cached || network;
    })
  );
});

// ── Push: show notification ──
self.addEventListener('push', function(e) {
  var data = {};
  try {
    data = e.data.json();
  } catch(ex) {
    data = { title: 'Bhok Lagyo 🍛', body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Bhok Lagyo 🍛', {
      body:      data.body || '',
      icon:      ICON,
      badge:     ICON,
      tag:       data.tag || 'bhok',
      renotify:  true,
      vibrate:   [200, 100, 200],
      data:      data
    })
  );
});

// ── Notification click: focus or open the app ──
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
