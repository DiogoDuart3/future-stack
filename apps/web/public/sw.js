// Service Worker for offline support
const CACHE_NAME = 'ecomantem-v1';
const urlsToCache = [
  '/',
  '/todos-offline',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Background sync for queued actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-todos') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Get queued actions from IndexedDB
    const syncQueue = JSON.parse(localStorage.getItem('sync-queue') || '[]');
    
    if (syncQueue.length === 0) return;

    console.log('Background sync: processing', syncQueue.length, 'actions');

    // Process each action
    for (const action of syncQueue) {
      try {
        await processAction(action);
      } catch (error) {
        console.error('Background sync failed for action:', action, error);
      }
    }

    // Notify the main app about sync completion
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_SYNC_COMPLETE'
        });
      });
    });

  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function processAction(action) {
  switch (action.type) {
    case 'create':
      const formData = new FormData();
      formData.append('text', action.data.text);
      if (action.data.image) {
        formData.append('image', action.data.image);
      }

      const response = await fetch('/todos/create-with-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create todo');
      }
      break;

    case 'update':
      // Handle update actions
      break;

    case 'delete':
      // Handle delete actions
      break;
  }
}