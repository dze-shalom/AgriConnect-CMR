/**
 * Navigation Module - Sidebar Navigation & View Management
 * Handles view switching, sidebar toggle, fullscreen map
 */

const Navigation = {
    currentView: 'overview',
    sidebarOpen: false,

    // Initialize navigation
    init() {
        console.log('[INFO] Initializing navigation module...');

        this.setupEventListeners();
        this.initializeLucideIcons();

        console.log('[SUCCESS] Navigation initialized');
    },

    // Setup all event listeners
    setupEventListeners() {
        // Sidebar toggle (mobile)
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Navigation items
        const navItems = document.querySelectorAll('.nav-item');
        console.log(`[INFO] Found ${navItems.length} navigation items`);

        if (navItems.length === 0) {
            console.warn('[WARN] No navigation items found! Retrying in 500ms...');
            setTimeout(() => this.setupEventListeners(), 500);
            return;
        }

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                console.log(`[INFO] Navigation clicked: ${view}`);
                this.navigateTo(view);
            });
        });

        // User menu dropdown
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                if (!userDropdown.classList.contains('hidden')) {
                    userDropdown.classList.add('hidden');
                }
            });
        }

        // Fullscreen map close button
        const mapFullscreenClose = document.getElementById('map-fullscreen-close');
        if (mapFullscreenClose) {
            mapFullscreenClose.addEventListener('click', () => this.exitFullscreenMap());
        }

        // ESC key to close fullscreen map
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const fullscreenMap = document.getElementById('map-fullscreen');
                if (fullscreenMap && !fullscreenMap.classList.contains('hidden')) {
                    this.exitFullscreenMap();
                }
            }
        });
    },

    // Initialize Lucide icons
    initializeLucideIcons() {
        if (typeof lucide !== 'undefined') {
            setTimeout(() => {
                lucide.createIcons();
                // Refresh translations after icons are created
                if (typeof Language !== 'undefined') {
                    Language.refresh();
                }
            }, 100);
        }
    },

    // Toggle sidebar (mobile)
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            this.sidebarOpen = !this.sidebarOpen;
        }
    },

    // Navigate to a view
    navigateTo(view) {
        console.log(`[INFO] Navigating to view: ${view}`);

        // Update active nav item
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Close sidebar on mobile after navigation
        if (window.innerWidth <= 768 && this.sidebarOpen) {
            this.toggleSidebar();
        }

        // Update current view
        this.currentView = view;

        // Handle special views
        if (view === 'map') {
            this.openFullscreenMap();
        } else if (view === 'satellite') {
            this.showSatelliteView();
        } else {
            // Scroll to the corresponding section
            this.scrollToSection(view);
        }

        // Reinitialize icons
        this.initializeLucideIcons();
    },

    // Scroll to section
    scrollToSection(view) {
        // Map view names to section classes/IDs (Consolidated Structure)
        const sectionMap = {
            // Main consolidated views
            'overview': '.map-section',
            'monitoring': '#live-sensors-section',  // Sensors & Weather
            'analytics': '.charts-section',          // Charts & Reports
            'intelligence': '.intelligence-section', // AI Insights (includes Yield Forecast)
            'automation': '.control-panel-section',  // Farm Controls (includes Smart Scheduler)
            'satellite': '.map-section',             // Satellite & NDVI (opens fullscreen map)
            'alerts': '.alerts-section',             // Alerts & Maintenance (includes Equipment Health)
            'settings': '.settings-section',         // Settings & Notifications (WhatsApp, Email, SMS)

            // Legacy mappings for backward compatibility
            'sensors': '#live-sensors-section',
            'charts': '.charts-section',
            'weather': '.weather-section',
            'controls': '.control-panel-section',
            'reports': '#recent-readings-section'
        };

        const selector = sectionMap[view];
        if (selector) {
            const section = document.querySelector(selector);
            if (section) {
                // Add visual feedback - flash the section border
                section.style.transition = 'box-shadow 0.3s ease, border 0.3s ease';
                section.style.boxShadow = '0 0 0 3px var(--primary-color), 0 0 20px rgba(46, 125, 50, 0.3)';
                section.style.border = '2px solid var(--primary-color)';

                // Scroll with offset for fixed header
                const headerOffset = 100; // Increased for better visibility
                const elementPosition = section.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Remove the flash after animation
                setTimeout(() => {
                    section.style.boxShadow = '';
                    section.style.border = '';
                }, 2000);

                console.log(`[SUCCESS] Scrolled to ${view} section`);
            } else {
                console.warn(`[WARN] Section not found for view: ${view} (selector: ${selector})`);
            }
        }
    },

    // Open fullscreen map
    openFullscreenMap() {
        const fullscreenOverlay = document.getElementById('map-fullscreen');
        const mapContainer = document.getElementById('map-container');
        const fullscreenMapContainer = document.getElementById('map-fullscreen-container');
        const mapCanvas = document.getElementById('map');

        if (fullscreenOverlay && mapCanvas && fullscreenMapContainer) {
            // Move map to fullscreen container
            fullscreenMapContainer.appendChild(mapCanvas);

            // Show fullscreen overlay
            fullscreenOverlay.classList.remove('hidden');

            // Resize map if Mapbox is available
            if (typeof FarmMap !== 'undefined' && FarmMap.map) {
                setTimeout(() => {
                    FarmMap.map.resize();
                }, 300);
            }

            // Reinitialize icons
            this.initializeLucideIcons();
        }
    },

    // Exit fullscreen map
    exitFullscreenMap() {
        const fullscreenOverlay = document.getElementById('map-fullscreen');
        const mapContainer = document.getElementById('map-container');
        const fullscreenMapContainer = document.getElementById('map-fullscreen-container');
        const mapCanvas = document.getElementById('map');

        if (fullscreenOverlay && mapCanvas && mapContainer) {
            // Move map back to original container
            mapContainer.appendChild(mapCanvas);

            // Hide fullscreen overlay
            fullscreenOverlay.classList.add('hidden');

            // Resize map if Mapbox is available
            if (typeof FarmMap !== 'undefined' && FarmMap.map) {
                setTimeout(() => {
                    FarmMap.map.resize();
                }, 300);
            }

            // Navigate back to overview
            this.navigateTo('overview');
        }
    },

    // Show satellite view with drawing tools
    showSatelliteView() {
        // Open fullscreen map for satellite analysis
        this.openFullscreenMap();

        // Notification removed - drawing tools are visible on map if user needs them
        console.log('[INFO] Satellite view opened - drawing tools available on map');

        // Show satellite panel (will populate when fields are drawn)
        const panel = document.getElementById('satellite-analysis-panel');
        if (panel && typeof Satellite !== 'undefined' && Satellite.analysisResults.size > 0) {
            panel.classList.remove('hidden');
        }
    },

    // Update alerts badge
    updateAlertsBadge(count) {
        const badge = document.getElementById('alerts-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    },

    // Get current view
    getCurrentView() {
        return this.currentView;
    }
};
