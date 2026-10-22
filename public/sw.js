// BuzzChat service worker: shows web push notifications and opens the right chat when one is clicked.
// The server sends { title, body, url, tag } (PushPayload in the backend's notification.types.ts).

const ICON = "/message_4140377.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      // The server skips devices with the app open; this covers the moment a socket is reconnecting
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((client) => client.focused && client.visibilityState === "visible")) return;

      await self.registration.showNotification(data.title || "BuzzChat", {
        body: data.body || "",
        icon: ICON,
        badge: ICON,
        // One notification per chat: a newer message replaces the older one, and still alerts
        tag: data.tag,
        renotify: !!data.tag,
        data: { url: data.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        // The app navigates itself (no reload); see PushBridge.jsx
        open.postMessage({ type: "OPEN_URL", url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
