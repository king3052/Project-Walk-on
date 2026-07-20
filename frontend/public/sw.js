// Intentionally minimal: this app needs live data (workouts, dashboard, AI
// coach) so real offline caching would show stale numbers. This just
// registers a fetch handler, which is what makes Chrome/Android treat the
// app as installable rather than a plain bookmark.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
