/**
 * Offline Manager
 * Enables offline functionality with smart sync
 */

const OfflineManager = {
    db: null,
    isOnline: navigator.onLine,
    syncQueue: [],
    syncInProgress: false,

    // Initialize offline mode
    async init() {
        console.log('[INFO] Initializing Offline Mode...');

        await this.setupDatabase();
        await this.registerServiceWorker();
        this.setupEventListeners();
        this.updateOnlineStatus();

        console.log('[SUCCESS] Offline Mode initialized');
    },

    // Setup IndexedDB
    async setupDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AgriConnectDB', 1);

            request.onerror = () => {
                console.error('[ERROR] IndexedDB failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[SUCCESS] IndexedDB opened');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('sensor-data')) {
                    db.createObjectStore('sensor-data', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('pending-commands')) {
                    db.createObjectStore('pending-commands', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('cached-weather')) {
                    db.createObjectStore('cached-weather', { keyPath: 'date' });
                }

                if (!db.objectStoreNames.contains('offline-logs')) {
                    db.createObjectStore('offline-logs', { keyPath: 'id', autoIncrement: true });
                }

                console.log('[INFO] IndexedDB stores created');
            };
        });
    },

    // Register Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[SUCCESS] Service Worker registered:', registration.scope);

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    console.log('[INFO] Service Worker update found');
                });

                return registration;
            } catch (error) {
                console.error('[ERROR] Service Worker registration failed:', error);
            }
        } else {
            console.warn('[WARN] Service Workers not supported');
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Sync button
        const syncBtn = document.getElementById('manual-sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.manualSync());
        }
    },

    // Handle online event
    handleOnline() {
        console.log('[INFO] Connection restored');
        this.isOnline = true;
        this.updateOnlineStatus();

        // Auto-sync pending commands
        this.syncPendingCommands();

        // Show notification
        if (typeof Notifications !== 'undefined') {
            Notifications.show(
                '[NETWORK] Back Online',
                'Syncing pending data...',
                'success',
                3000
            );
        }
    },

    // Handle offline event
    handleOffline() {
        console.log('[WARN] Connection lost - entering offline mode');
        this.isOnline = false;
        this.updateOnlineStatus();

        // Show notification
        if (typeof Notifications !== 'undefined') {
            Notifications.show(
                '[OFFLINE] Offline Mode',
                'Changes will sync when connection restored',
                'warning',
                5000
            );
        }
    },

    // Update online status UI
    updateOnlineStatus() {
        const badge = document.getElementById('online-status-badge');
        if (badge) {
            if (this.isOnline) {
                badge.textContent = '[ONLINE]';
                badge.className = 'status-badge online';
            } else {
                badge.textContent = '[OFFLINE]';
                badge.className = 'status-badge offline';
            }
        }

        // Update sync button
        const syncBtn = document.getElementById('manual-sync-btn');
        if (syncBtn) {
            syncBtn.disabled = !this.isOnline || this.syncInProgress;
        }
    },

    // Save sensor data offline
    async saveSensorData(data) {
        if (!this.db) return;

        const transaction = this.db.transaction(['sensor-data'], 'readwrite');
        const store = transaction.objectStore('sensor-data');

        const record = {
            data: data,
            timestamp: new Date().toISOString(),
            synced: this.isOnline
        };

        return new Promise((resolve, reject) => {
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get cached sensor data
    async getCachedSensorData(limit = 100) {
        if (!this.db) return [];

        const transaction = this.db.transaction(['sensor-data'], 'readonly');
        const store = transaction.objectStore('sensor-data');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const data = request.result.slice(-limit).reverse();
                resolve(data);
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Queue command for later execution
    async queueCommand(command) {
        if (!this.db) return;

        const transaction = this.db.transaction(['pending-commands'], 'readwrite');
        const store = transaction.objectStore('pending-commands');

        const record = {
            command: command,
            timestamp: new Date().toISOString(),
            retries: 0
        };

        return new Promise((resolve, reject) => {
            const request = store.add(record);
            request.onsuccess = () => {
                console.log('[INFO] Command queued for sync:', command.type);
                this.syncQueue.push(record);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Sync pending commands
    async syncPendingCommands() {
        if (!this.isOnline || this.syncInProgress) return;

        this.syncInProgress = true;
        console.log('[INFO] Starting sync...');

        try {
            // Get all pending commands
            const commands = await this.getPendingCommands();

            if (commands.length === 0) {
                console.log('[INFO] No pending commands to sync');
                this.syncInProgress = false;
                return;
            }

            console.log(`[INFO] Syncing ${commands.length} pending commands...`);

            let successCount = 0;
            let failCount = 0;

            // Execute each command
            for (const cmd of commands) {
                try {
                    await this.executeCommand(cmd.command);
                    await this.removePendingCommand(cmd.id);
                    successCount++;
                } catch (error) {
                    console.error('[ERROR] Failed to sync command:', error);
                    failCount++;

                    // Increment retry count
                    await this.incrementRetryCount(cmd.id);
                }
            }

            console.log(`[INFO] Sync complete: ${successCount} success, ${failCount} failed`);

            // Show notification
            if (typeof Notifications !== 'undefined') {
                if (failCount === 0) {
                    Notifications.show(
                        '[SUCCESS] Sync Complete',
                        `${successCount} commands synced successfully`,
                        'success',
                        3000
                    );
                } else {
                    Notifications.show(
                        '[WARNING] Sync Partial',
                        `${successCount} synced, ${failCount} failed`,
                        'warning',
                        4000
                    );
                }
            }
        } catch (error) {
            console.error('[ERROR] Sync failed:', error);
        } finally {
            this.syncInProgress = false;
            this.updateOnlineStatus();
        }
    },

    // Get pending commands
    async getPendingCommands() {
        if (!this.db) return [];

        const transaction = this.db.transaction(['pending-commands'], 'readonly');
        const store = transaction.objectStore('pending-commands');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Execute command
    async executeCommand(command) {
        switch (command.type) {
            case 'irrigation':
                if (typeof FarmControls !== 'undefined') {
                    await FarmControls.startIrrigation(command.zone, command.duration);
                }
                break;

            case 'pump-control':
                if (typeof FarmControls !== 'undefined') {
                    if (command.action === 'on') {
                        await FarmControls.activatePump();
                    } else {
                        await FarmControls.deactivatePump();
                    }
                }
                break;

            case 'settings-update':
                // Update settings via API
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(command.data)
                });
                break;

            default:
                console.warn('[WARN] Unknown command type:', command.type);
        }
    },

    // Remove pending command
    async removePendingCommand(id) {
        if (!this.db) return;

        const transaction = this.db.transaction(['pending-commands'], 'readwrite');
        const store = transaction.objectStore('pending-commands');

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Increment retry count
    async incrementRetryCount(id) {
        if (!this.db) return;

        const transaction = this.db.transaction(['pending-commands'], 'readwrite');
        const store = transaction.objectStore('pending-commands');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.retries = (record.retries || 0) + 1;

                    // Remove if too many retries
                    if (record.retries > 5) {
                        store.delete(id);
                        console.warn('[WARN] Command removed after 5 failed retries:', id);
                    } else {
                        store.put(record);
                    }
                }
                resolve();
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    // Manual sync trigger
    async manualSync() {
        if (!this.isOnline) {
            if (typeof Notifications !== 'undefined') {
                Notifications.show(
                    '[OFFLINE] Offline',
                    'Cannot sync while offline',
                    'warning',
                    3000
                );
            }
            return;
        }

        await this.syncPendingCommands();
    },

    // Cache weather data
    async cacheWeatherData(data) {
        if (!this.db) return;

        const transaction = this.db.transaction(['cached-weather'], 'readwrite');
        const store = transaction.objectStore('cached-weather');

        const record = {
            date: new Date().toDateString(),
            data: data,
            timestamp: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Get cached weather
    async getCachedWeather() {
        if (!this.db) return null;

        const transaction = this.db.transaction(['cached-weather'], 'readonly');
        const store = transaction.objectStore('cached-weather');
        const today = new Date().toDateString();

        return new Promise((resolve, reject) => {
            const request = store.get(today);
            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => reject(request.error);
        });
    },

    // Log offline action
    async logAction(action, data) {
        if (!this.db) return;

        const transaction = this.db.transaction(['offline-logs'], 'readwrite');
        const store = transaction.objectStore('offline-logs');

        const record = {
            action: action,
            data: data,
            timestamp: new Date().toISOString(),
            wasOffline: !this.isOnline
        };

        return new Promise((resolve, reject) => {
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get status
    getStatus() {
        return {
            isOnline: this.isOnline,
            pendingCommands: this.syncQueue.length,
            syncInProgress: this.syncInProgress,
            dbAvailable: this.db !== null
        };
    }
};
