// Service worker: permite usar la app sin conexión.
// Sube este número cuando cambies archivos de la app (html, css, js) para renovar la caché.
const VERSION = "agape-v49";
const SHELL = [
  "./", "index.html", "css/app.css",
  "js/app.js", "js/admin.js", "js/store.js", "js/util.js", "js/config.js", "js/cloud.js", "js/muro.js", "js/chat.js", "js/agenda.js", "js/encuentros.js", "js/ilustraciones.js", "js/portada.js", "js/capilla.js", "js/cancionero.js", "js/repeat.js", "js/avatares.js", "js/dinamicas.js", "js/acompanar.js", "js/desafio.js", "js/qrcode.mjs", "js/qrcode-utf8.mjs",
  "fonts/fraunces-latin-wght-normal.woff2", "fonts/fraunces-latin-wght-italic.woff2", "fonts/plus-jakarta-sans-latin-wght-normal.woff2", "fonts/bricolage-grotesque-latin-standard-normal.woff2", "fonts/caveat-latin-700-normal.woff2",
  "icons/logo-160.webp", "icons/logo-320.webp", "icons/favicon-64.png", "icons/icon-192.png", "manifest.webmanifest", "data/contenido.json", "data/encuentros.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  // El contenido cambia cuando el equipo publica: primero red, si no hay, caché.
  if (url.pathname.endsWith("/data/contenido.json")) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // Páginas, estilos y código: primero la red (así los cambios publicados se ven de inmediato);
  // sin conexión, la copia guardada. Fuentes e imágenes: primero la caché.
  const isAsset = /\.(woff2|png|webp|jpg|svg)$/.test(url.pathname);
  if (isAsset) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")))
  );
});
