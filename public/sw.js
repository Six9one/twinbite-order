// Twin Pizza Service Worker - Auto-Updating Version
// This version automatically checks for updates and refreshes cached content

// VERSION: Change this when deploying updates - triggers cache refresh
const CACHE_VERSION = 'v2';
const CACHE_NAME = `twin-pizza-${CACHE_VERSION}`;

// Files to cache for offline support (minimal - only essentials)
const STATIC_CACHE = [
    '/favicon.png',
    '/manifest.json'
];

// Files that should NEVER be cached (always fetch fresh)
const NEVER_CACHE = [
    '/api/',
    'supabase',
    'stripe',
    '.hot-update.',
    'sockjs-node'
];

// Install event - cache essential files and skip waiting
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new version:', CACHE_VERSION);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_CACHE);
            })
            .then(() => {
                // Force immediate activation
                console.log('[SW] Skip waiting - activating immediately');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean ALL old caches and take control
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new version:', CACHE_VERSION);

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete ALL caches that don't match current version
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Taking control of all clients');
            return self.clients.claim();
        }).then(() => {
            // Notify all clients about the update
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: CACHE_VERSION
                    });
                });
            });
        })
    );
});

// Fetch event - NETWORK FIRST for everything except static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip requests that should never be cached
    if (NEVER_CACHE.some(pattern => event.request.url.includes(pattern))) {
        return;
    }

    // For navigation requests (HTML pages) - ALWAYS network first
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone and cache successful responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Only use cache if network fails (offline)
                    return caches.match(event.request).then(cached => {
                        return cached || caches.match('/');
                    });
                })
        );
        return;
    }

    // For JS/CSS with hash - cache these (they're versioned by build)
    if (url.pathname.match(/\.(js|css)$/) && url.pathname.includes('.')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;

                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // For other assets (images, fonts) - network first, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Received skip waiting request');
        self.skipWaiting();
    }

    // Force refresh all caches
    if (event.data && event.data.type === 'FORCE_REFRESH') {
        console.log('[SW] Force refreshing all caches');
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        }).then(() => {
            event.source.postMessage({ type: 'CACHE_CLEARED' });
        });
    }
});

// Push notification event - HACCP Kitchen Notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    let data = {
        title: '🍕 Twin Pizza HACCP',
        body: 'Nouvelle notification!',
        tag: 'haccp-notification',
        url: '/kitchen'
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        data: {
            url: data.url || '/kitchen',
            dateOfArrival: Date.now()
        },
        actions: [
            { action: 'open', title: '📋 Ouvrir' },
            { action: 'close', title: '❌ Fermer' }
        ],
        tag: data.tag || 'haccp-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Background sync for offline orders
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-orders') {
        console.log('[SW] Syncing pending orders...');
        // Handle offline order sync here
    }
});
