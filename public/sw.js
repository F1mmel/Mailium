self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Neue E-Mail';
  const options = {
    body: data.body || 'Sie haben eine neue Nachricht empfangen.',
    icon: self.location.origin + '/favicon.ico',
    badge: self.location.origin + '/favicon.ico',
    data: data.url || '/',
    actions: [
        { action: 'open', title: 'Öffnen' }
    ]
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SYNC_EMAILS' }));
      })
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
