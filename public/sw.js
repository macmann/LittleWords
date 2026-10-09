/* Only public illustrations and the offline activity are cached. Never accounts, API data, or family photos. */
const CACHE = "littlewords-shell-v2";
const SHELL = ["/offline.html", "/icon.svg", "/images/fallback.svg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("littlewords-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});
async function publicImage(request) {
  const cache = await caches.open(CACHE);
  const existing = await cache.match(request);
  if (existing) return existing;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      const images = (await cache.keys()).filter(
        (key) => !SHELL.includes(new URL(key.url).pathname),
      );
      // A bounded public-artwork cache, not a growing learning feed.
      if (images.length > 120)
        await Promise.all(
          images.slice(0, images.length - 120).map((key) => cache.delete(key)),
        );
    }
    return response;
  } catch {
    return (await cache.match("/images/fallback.svg")) || Response.error();
  }
}
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
    return;
  }
  if (
    !url.search &&
    (/^\/images\/[a-z0-9/-]+\.svg$/.test(url.pathname) ||
      url.pathname === "/icon.svg")
  ) {
    event.respondWith(publicImage(event.request));
  }
});
