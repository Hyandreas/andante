const STATIC_CACHE = "andante-static-v1";
const DOCUMENT_CACHE = "andante-documents-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(["/", "/manifest.json", "/icon.svg"]),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, DOCUMENT_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, DOCUMENT_CACHE));
    return;
  }

  const destination = request.destination;
  if (destination === "style" || destination === "script" || destination === "font" || destination === "image") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
