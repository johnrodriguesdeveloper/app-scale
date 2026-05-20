self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body,
        icon: '/assets/icon.png',
        badge: '/assets/favicon.png',
        data: data.data, 
        vibrate: [100, 50, 100],
      };

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      const options = {
        body: event.data.text(),
        icon: '/assets/icon.png',
        badge: '/assets/favicon.png',
      };
      event.waitUntil(
        self.registration.showNotification('Escala Verbo', options)
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});