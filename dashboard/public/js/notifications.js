/**
 * Notifications Module - Toast Notifications
 * Displays real-time toast notifications
 */

const Notifications = {
    container: null,
    toastId: 0,

    // Initialize notifications
    init() {
        console.log('[INFO] Initializing notifications module...');
        this.container = document.getElementById('toast-container');

        if (!this.container) {
            console.error('[ERROR] Toast container not found');
            return;
        }

        // Request notification permission for browser notifications
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        console.log('[SUCCESS] Notifications initialized');
    },

    // Show toast notification
    show(title, message, type = 'info', duration = 5000) {
        if (!this.container) return;

        const id = ++this.toastId;
        const toast = this.createToast(id, title, message, type);

        this.container.appendChild(toast);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    },

    // Create toast element
    createToast(id, title, message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('data-toast-id', id);

        // Icon mapping (Lucide icons)
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        toast.innerHTML = `
            <div class="toast-icon"><i data-lucide="${icons[type] || icons.info}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="Notifications.remove(${id})">
                <i data-lucide="x"></i>
            </button>
        `;

        // Initialize Lucide icons for the new toast
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 10);

        return toast;
    },

    // Remove toast
    remove(id) {
        const toast = document.querySelector(`[data-toast-id="${id}"]`);
        if (toast) {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    },

    // Show browser notification
    showBrowserNotification(title, body, icon = null) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico'
            });
        }
    },

    // Success notification
    success(title, message) {
        return this.show(title, message, 'success');
    },

    // Error notification
    error(title, message) {
        return this.show(title, message, 'error');
    },

    // Warning notification
    warning(title, message) {
        return this.show(title, message, 'warning');
    },

    // Info notification
    info(title, message) {
        return this.show(title, message, 'info');
    }
};

// Add slideOutRight animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(400px);
        }
    }
`;
document.head.appendChild(style);
