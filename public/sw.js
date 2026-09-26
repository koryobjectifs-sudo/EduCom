/* EduCom — service worker des notifications push (Communauté). 25 sept. 2026.
 * Volontairement minimal : aucun cache hors ligne (les pages restent toujours
 * fraîches), seulement la réception des notifications et l'ouverture du lien. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "EduCom", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(
    self.registration.showNotification(d.title || "EduCom", {
      body: d.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: d.tag || undefined,
      renotify: Boolean(d.tag),
      // Son et vibration du système (26 sept. 2026) : la notification doit se remarquer.
      silent: false,
      vibrate: [120, 60, 120],
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) { w.navigate(url); return w.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
