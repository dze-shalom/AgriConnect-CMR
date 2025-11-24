/**
 * Performance Utilities
 * Debouncing, throttling, and performance optimization helpers
 */

const PerformanceUtils = {
    /**
     * Debounce function - delays execution until after wait milliseconds have passed
     * since the last call
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function - ensures function is called at most once per wait milliseconds
     */
    throttle(func, wait = 300) {
        let inThrottle;
        let lastFunc;
        let lastRan;

        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                lastRan = Date.now();
                inThrottle = true;
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= wait) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, Math.max(wait - (Date.now() - lastRan), 0));
            }
        };
    },

    /**
     * Request Animation Frame throttle - for smooth UI updates
     */
    rafThrottle(func) {
        let rafId = null;
        let lastArgs = null;

        const throttled = (...args) => {
            lastArgs = args;
            if (rafId === null) {
                rafId = requestAnimationFrame(() => {
                    func(...lastArgs);
                    rafId = null;
                });
            }
        };

        throttled.cancel = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };

        return throttled;
    },

    /**
     * Batch DOM updates together to minimize reflows
     */
    batchDOMUpdates(updates) {
        requestAnimationFrame(() => {
            updates.forEach(update => update());
        });
    },

    /**
     * DOM element cache to avoid repeated querySelector calls
     */
    DOMCache: {
        cache: {},

        get(selector) {
            if (!this.cache[selector]) {
                this.cache[selector] = document.getElementById(selector);
            }
            return this.cache[selector];
        },

        clear(selector) {
            if (selector) {
                delete this.cache[selector];
            } else {
                this.cache = {};
            }
        }
    },

    /**
     * Limit notification frequency to prevent spam
     */
    NotificationLimiter: {
        lastNotifications: {},

        canNotify(key, cooldownMs = 60000) {
            const now = Date.now();
            const last = this.lastNotifications[key];

            if (!last || (now - last) > cooldownMs) {
                this.lastNotifications[key] = now;
                return true;
            }
            return false;
        }
    }
};
