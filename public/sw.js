const CACHE = "emilda-static-v1";
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/icons/emilda.svg"])),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      ),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (
    request.method !== "GET" ||
    request.mode === "navigate" ||
    request.url.includes("/api/") ||
    request.headers.get("authorization")
  )
    return;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    !url.pathname.match(/\.(?:js|css|woff2|svg|png|ico)$/)
  )
    return;
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === "basic")
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, response.clone()));
          return response;
        }),
    ),
  );
});
