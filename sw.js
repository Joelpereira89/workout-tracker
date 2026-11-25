// Lets the app open without internet by keeping a copy of its files on the phone.
// IMPORTANT: change the version number whenever any app file changes,
// otherwise the phone keeps using its old copy.
const VERSION = "workout-v10";
const FILES = ["./", "index.html", "style.css", "manifest.json", "icon-180.png", "icon-512.png",
  "theme.js", "icons.js", "effects.js", "helpers.js","storage.js", "exercises.js", "planner.js", "timer.js", "log.js", "history.js", "bests.js", "backup.js", "charts.js", "dashboard.js", "goals.js", "calendar.js", "insights.js", "report.js", "library.js", "routines.js", "live.js", "progress.js", "muscles.js", "body.js", "motivation.js", "app.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

// Remove copies left over from older versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("workout-") && n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Use the saved copy first; go to the internet only for anything not saved
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.open(VERSION)
      .then((cache) => cache.match(event.request, { ignoreSearch: true }))
      .then((saved) => saved || fetch(event.request))
  );
});
