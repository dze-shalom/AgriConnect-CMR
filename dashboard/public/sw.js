/**
 * Service Worker for AgriConnect
 * Handles offline caching and background sync
 */

const CACHE_NAME = 'agriconnect-v1';
const RUNTIME_CACHE = 'agriconnect-runtime';

// Files to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/config.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/navigation.js',
    '/js/language.js',
    '/js/theme.js',
    '/js/notifications.js',
    '/js/map.js',
    '/js/weather.js',
    '/js/charts.js',
    '/js/controls.js',
    '/js/satellite.js',
    '/js/intelligence.js',
    '/js/smart-scheduler.js',
    '/js/predictive-maintenance.js',
    '/js/voice-control.js',
    '/js/offline-manager.js',
    '/js/yield-forecast.js',
    '/js/whatsapp-bot.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // API requests - network first, then cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Static assets - cache first, then network
    event.respondWith(cacheFirstStrategy(request));
});

// Cache-first strategy
async function cacheFirstStrategy(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response.status === 200) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlinePage = await cache.match('/index.html');
            return offlinePage || new Response('Offline', { status: 503 });
        }

        return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Network-first strategy
async function networkFirstStrategy(request) {
    const cache = await caches.open(RUNTIME_CACHE);

    try {
        const response = await fetch(request);

        // Cache successful API responses
        if (response.status === 200) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[SW] Network failed, checking cache...');

        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }

        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Background sync for pending commands
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'sync-commands') {
        event.waitUntil(syncPendingCommands());
    }
});

// Sync pending commands
async function syncPendingCommands() {
    try {
        // Open IndexedDB and get pending commands
        const db = await openIndexedDB();
        const commands = await getPendingCommands(db);

        console.log(`[SW] Syncing ${commands.length} commands...`);

        for (const cmd of commands) {
            try {
                await executeCommand(cmd);
                await removeCommand(db, cmd.id);
            } catch (error) {
                console.error('[SW] Failed to sync command:', error);
            }
        }

        console.log('[SW] Sync complete');
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

// Open IndexedDB
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AgriConnectDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get pending commands from IndexedDB
function getPendingCommands(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending-commands'], 'readonly');
        const store = transaction.objectStore('pending-commands');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Execute command
async function executeCommand(command) {
    const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

// Remove command from IndexedDB
function removeCommand(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending-commands'], 'readwrite');
        const store = transaction.objectStore('pending-commands');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Push notification
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');

    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'New notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: data
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'AgriConnect', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');

    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

console.log('[SW] Service Worker loaded');
