/**
 * Push Notifications Module
 * Handles browser push notification permissions and sending
 */

const PushNotifications = {
    permission: 'default',
    serviceWorkerRegistration: null,

    // Initialize push notifications
    init() {
        console.log('[INFO] Initializing push notifications...');

        // Check browser support
        if (!('Notification' in window)) {
            console.log('[WARNING] Browser does not support notifications');
            return;
        }

        this.permission = Notification.permission;
        console.log(`[INFO] Notification permission: ${this.permission}`);

        // Show permission banner if not decided
        if (this.permission === 'default' && CONFIG.pushNotifications.enabled) {
            setTimeout(() => this.showPermissionBanner(), 5000); // Show after 5 seconds
        }

        // Setup event listeners
        this.setupEventListeners();

        // Register service worker for PWA support
        this.registerServiceWorker();

        console.log('[SUCCESS] Push notifications module initialized');
    },

    // Setup event listeners
    setupEventListeners() {
        const enableBtn = document.getElementById('enable-notifications-btn');
        const dismissBtn = document.getElementById('dismiss-notifications-btn');

        if (enableBtn) {
            enableBtn.addEventListener('click', () => this.requestPermission());
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => this.dismissBanner());
        }
    },

    // Show permission banner
    showPermissionBanner() {
        const banner = document.getElementById('notification-permission-banner');
        if (banner && this.permission === 'default') {
            banner.classList.remove('hidden');

            // Initialize Lucide icons for the banner
            if (typeof lucide !== 'undefined') {
                setTimeout(() => lucide.createIcons(), 100);
            }
        }
    },

    // Dismiss banner
    dismissBanner() {
        const banner = document.getElementById('notification-permission-banner');
        if (banner) {
            banner.classList.add('hidden');

            // Remember dismissal in localStorage
            localStorage.setItem('notificationBannerDismissed', 'true');
        }
    },

    // Request notification permission
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                console.log('[SUCCESS] Notification permission granted');

                this.dismissBanner();

                if (typeof Notifications !== 'undefined') {
                    Notifications.success(
                        'Notifications Enabled',
                        'You will now receive alerts for critical events'
                    );
                }

                // Send a test notification
                this.sendTestNotification();

            } else if (permission === 'denied') {
                console.log('[WARNING] Notification permission denied');

                this.dismissBanner();

                if (typeof Notifications !== 'undefined') {
                    Notifications.warning(
                        'Notifications Blocked',
                        'You can enable notifications in your browser settings'
                    );
                }
            }

        } catch (error) {
            console.error('[ERROR] Failed to request permission:', error);
        }
    },

    // Send test notification
    sendTestNotification() {
        if (Notification.permission === 'granted') {
            const notification = new Notification('AgriConnect Notifications Enabled', {
                body: 'You will now receive real-time alerts for your farm',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'test-notification',
                requireInteraction: false
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);
        }
    },

    // Send custom notification
    send(title, options = {}) {
        if (Notification.permission !== 'granted') {
            console.log('[INFO] Notifications not enabled, skipping');
            return null;
        }

        const defaultOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: false,
            vibrate: [100]
        };

        const notification = new Notification(title, {
            ...defaultOptions,
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        return notification;
    },

    // Register service worker for PWA support
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                this.serviceWorkerRegistration = registration;
                console.log('[SUCCESS] Service worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('[INFO] Service worker update found');
                });

            } catch (error) {
                console.log('[INFO] Service worker not available yet:', error.message);
            }
        }
    }
};
