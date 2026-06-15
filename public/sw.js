const STATIC_CACHE = "andante-static-v1";
const DOCUMENT_CACHE = "andante-documents-v1";
const PRIVATE_ROUTES = [
  "/digest-preview",
  "/goals",
  "/home",
  "/leaderboard",
  "/log",
  "/loop",
  "/onboarding",
  "/pathways",
  "/pieces",
  "/recordings",
  "/rooms",
  "/session",
  "/settings",
  "/teacher",
];

function isPrivateRoute(pathname) {
  return PRIVATE_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

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
    if (isPrivateRoute(url.pathname)) {
      event.respondWith(fetch(request));
      return;
    }
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

self.addEventListener("push", (event) => {
  let payload = {
    title: "Practice reminder",
    body: "Open Andante and log today's session.",
    url: "/home",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/home", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      return clients.openWindow(targetUrl);
    }),
  );
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
