// agAPPe se mudó a https://pj-agape.github.io/. Este service worker reemplaza al antiguo de /Formacion_Monitores/:
// borra lo guardado, se da de baja y lleva las ventanas abiertas a la dirección nueva.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  try { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } catch (_) {}
  try { await self.registration.unregister(); } catch (_) {}
  const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  cs.forEach((c) => { try { c.navigate(c.url.replace(/\/Formacion_Monitores\/?/i, "/")); } catch (_) {} });
})()));
self.addEventListener("fetch", () => {});
