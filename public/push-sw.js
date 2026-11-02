// Service Worker for Browser Web Push Notifications

self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "🛒 নতুন অর্ডার এসেছে!";
    const options = {
      body: data.body || "একটি নতুন অর্ডার প্লেস হয়েছে।",
      icon: data.icon || "/favicon.ico",
      badge: data.badge || "/favicon.ico",
      vibrate: [300, 100, 300, 100, 300],
      tag: "ecommerce-order-notification",
      renotify: true,
      requireInteraction: true,
      data: {
        url: data.url || "/admin/orders",
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[SW] Push handling error:", err);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin/orders";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // If a tab is already open with admin orders, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes("/admin/orders") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
