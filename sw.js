// Notifications de MINDIFF : affiche les messages envoyés par le service (worker/push.mjs) et ouvre la bonne page au toucher.
// Aucun cache : le site reste servi tel quel par GitHub Pages.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch { m = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(m.title || "MINDIFF", {
    body: m.body || "", tag: m.tag || undefined, icon: "icon-192.png", badge: "icon-192.png", data: { url: m.url || "./" },
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const same = open.find(c => c.url.startsWith(self.registration.scope));
    if (same) { await same.focus(); return same.navigate(url).catch(() => null); }
    return self.clients.openWindow(url);
  })());
});
