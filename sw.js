// sw.js — CrewCare service worker (PWA).
// Caches every app file on first load, so the app works with Wi-Fi off.
// No network request is ever needed after the first load.
var CACHE_NAME = 'crewcare-v1';
var FILES = [
  './', './index.html', './style.css', './app.js', './data.js', './trends.js',
  './store.js', './queue.js', './triage.js', './guidance.js',
  './vendor/chart.umd.min.js', './manifest.json', './icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  event.respondWith(caches.match(event.request).then(function (cached) {
    return cached || fetch(event.request);
  }));
});
