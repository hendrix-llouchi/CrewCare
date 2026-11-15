const CACHE_NAME = "crewcare-shell-v14";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./icons.js",
  "./stubs.js",
  "./sw.js",
  "./vendor/chart.min.js",
  "./icons/favicon.svg",
  "./manifest.json"
];
const OPTIONAL_FILES = [
  "./data.js",
  "./trends.js",
  "./store.js",
  "./queue.js",
  "./triage.js",
  "./guidance.js",
  "./adapter.js",
  // Icons and fonts are optional: the PNG icons and woff2 fonts could not be
  // pushed to this branch (binary upload), so the service worker must not
  // fail installation when they are missing. They fall back to the SVG
  // favicon and system fonts until someone with git access adds them.
  "./fonts/ibm-plex-sans-latin-400-normal.woff2",
  "./fonts/ibm-plex-sans-latin-500-normal.woff2",
  "./fonts/ibm-plex-sans-latin-600-normal.woff2",
  "./fonts/ibm-plex-mono-latin-400-normal.woff2",
  "./fonts/ibm-plex-mono-latin-500-normal.woff2",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./privacy.html",
  "./terms.html"
];
const APP_ASSET_PATHS = new Set(
  APP_FILES.concat(OPTIONAL_FILES).map(function (file) {
    return new URL(file, self.registration.scope).pathname;
  })
);

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_FILES).then(function () {
        return Promise.all(OPTIONAL_FILES.map(function (file) {
          return fetch(file, { cache: "reload" }).then(function (response) {
            if (response.status === 404) {
              console.warn("CrewCare optional file is not present and was cached as unavailable: " + file);
              return cache.put(new URL(file, self.registration.scope).href, new Response(null, {
                status: 404,
                statusText: "Not Found"
              }));
            }
            if (!response.ok) {
              throw new Error("Could not precache " + file + ": HTTP " + response.status);
            }
            return cache.put(new URL(file, self.registration.scope).href, response);
          }).catch(function (error) {
            console.error("CrewCare could not precache optional file: " + file, error);
            throw error;
          });
        }));
      });
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (cacheName) {
            return cacheName.startsWith("crewcare-shell-") && cacheName !== CACHE_NAME;
          })
          .map(function (cacheName) {
            return caches.delete(cacheName);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    requestUrl.origin !== self.location.origin ||
    !APP_ASSET_PATHS.has(requestUrl.pathname)
  ) {
    return;
  }

  const cacheKey = new Request(requestUrl.origin + requestUrl.pathname);
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(cacheKey).then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(cacheKey).then(function (response) {
          if (response.ok) {
            cache.put(cacheKey, response.clone()).catch(function (error) {
              console.error("CrewCare could not cache an app file.", error);
            });
          }
          return response;
        });
      });
    })
  );
});
