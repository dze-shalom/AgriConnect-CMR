/**
 * Theme Module - Dark/Light Mode Toggle
 * Handles theme switching and persistence
 */

const Theme = {
    currentTheme: 'light',

    // Initialize theme
    init() {
        console.log('[INFO] Initializing theme module...');

        // Load saved theme or use default
        this.currentTheme = localStorage.getItem('agriconnect-theme') || 'light';
        this.applyTheme(this.currentTheme);

        // Setup event listeners
        this.setupEventListeners();

        console.log(`[SUCCESS] Theme initialized: ${this.currentTheme}`);
    },

    // Setup event listeners
    setupEventListeners() {
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggle());
        }
    },

    // Toggle theme
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);

        // Show toast notification
        if (typeof Notifications !== 'undefined') {
            const emoji = newTheme === 'dark' ? '🌙' : '☀️';
            Notifications.show(
                `${emoji} Theme Changed`,
                `Switched to ${newTheme} mode`,
                'info',
                3000
            );
        }
    },

    // Apply theme
    applyTheme(theme) {
        this.currentTheme = theme;

        // Update DOM
        document.documentElement.setAttribute('data-theme', theme);

        // Update icon (using Lucide icons)
        const icon = document.getElementById('theme-icon');
        if (icon) {
            const iconName = theme === 'light' ? 'moon' : 'sun';
            icon.setAttribute('data-lucide', iconName);

            // Reinitialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        // Save to localStorage
        localStorage.setItem('agriconnect-theme', theme);

        console.log(`[INFO] Theme applied: ${theme}`);
    },

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    },

    // Check if dark mode
    isDark() {
        return this.currentTheme === 'dark';
    }
};
