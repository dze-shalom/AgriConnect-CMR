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
        // Map view names to section classes/IDs
        const sectionMap = {
            'overview': '.map-section',
            'sensors': '#live-sensors-section',
            'charts': '.charts-section',
            'weather': '.weather-section',
            'intelligence': '.intelligence-section',
            'controls': '.control-panel-section',
            'alerts': '.alerts-section',
            'reports': '#recent-readings-section'
        };

        const selector = sectionMap[view];
        if (selector) {
            const section = document.querySelector(selector);
            if (section) {
                // Scroll with offset for fixed header
                const headerOffset = 80;
                const elementPosition = section.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
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

        // Show helpful notification
        if (typeof Notifications !== 'undefined') {
            Notifications.info(
                'Satellite Analysis Ready',
                'Draw polygons on the map to analyze field areas with NDVI data',
                8000
            );
        }

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
