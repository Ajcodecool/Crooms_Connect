/* eslint-disable */ // If more service workers are ever define, it may be worth adding eslint constants

// public/sw.js

// 1. Listen for the incoming Push Event from your server
self.addEventListener('push', function (event) {
  // Parse the data sent from your Supabase Edge Function
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'Someone mentioned you in chat!',
    icon: '/logo192.png', // Uses the icon from your manifest
    badge: '/logo192.png',
    vibrate: [200, 100, 200], // Android vibration pattern
    data: {
      url: data.url || '/', // Where to take the user when they click it
    },
  };

  // Tell the phone's OS to show the notification banner
  event.waitUntil(
    self.registration.showNotification(data.title || 'New Mention', options),
  );
});

// 2. Listen for the user clicking the notification banner
self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Clear the notification

  // Open the app to the correct URL
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
