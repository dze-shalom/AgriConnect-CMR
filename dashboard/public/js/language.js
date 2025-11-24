/**
 * Language Module - Multi-language Support
 * English / French translation
 */

const Language = {
    currentLang: 'en',

    translations: {
        en: {
            // Navigation items
            'nav_overview': 'Overview',
            'nav_farm_map': 'Farm Map',
            'nav_live_sensors': 'Live Sensors',
            'nav_analytics': 'Analytics',
            'nav_weather': 'Weather',
            'nav_ai_insights': 'AI Insights',
            'nav_farm_controls': 'Farm Controls',
            'nav_alerts': 'Alerts',
            'nav_satellite': 'Satellite Data',
            'nav_reports': 'Reports',

            // Header
            'dashboard_title': 'AgriConnect Dashboard',
            'last_update': 'Last update',
            'logout': 'Logout',
            'refresh': 'Refresh',

            // General UI
            'weather_forecast': ' Weather Forecast',
            'historical_trends': ' Historical Trends (7 Days)',
            'disease_risk': ' Disease Risk Timeline',
            'smart_analytics': ' Smart Analytics',
            'growth_stage': ' Growth Stage',
            'nutrient_mgmt': ' Nutrient Management',
            'cost_roi': ' Cost & ROI',
            'yield_forecast': ' Yield Forecast',
            'active_alerts': 'Active Alerts',
            'farm_controls': 'Farm Controls',
            'live_sensor_data': 'Live Sensor Data',
            'recent_readings': 'Recent Readings',
            'export_csv': 'Export CSV',
            'show_map': 'Show Map',
            'hide_map': 'Hide Map'
        },
        fr: {
            // Navigation items
            'nav_overview': 'Vue d\'ensemble',
            'nav_farm_map': 'Carte de la Ferme',
            'nav_live_sensors': 'Capteurs en Direct',
            'nav_analytics': 'Analytiques',
            'nav_weather': 'Météo',
            'nav_ai_insights': 'Insights IA',
            'nav_farm_controls': 'Contrôles de la Ferme',
            'nav_alerts': 'Alertes',
            'nav_satellite': 'Données Satellite',
            'nav_reports': 'Rapports',

            // Header
            'dashboard_title': 'Tableau de Bord AgriConnect',
            'last_update': 'Dernière mise à jour',
            'logout': 'Déconnexion',
            'refresh': 'Actualiser',

            // General UI
            'weather_forecast': ' Prévisions Météo',
            'historical_trends': ' Tendances Historiques (7 Jours)',
            'disease_risk': ' Risque de Maladies',
            'smart_analytics': ' Analyses Intelligentes',
            'growth_stage': ' Stade de Croissance',
            'nutrient_mgmt': ' Gestion des Nutriments',
            'cost_roi': ' Coûts & ROI',
            'yield_forecast': ' Prévision de Rendement',
            'active_alerts': 'Alertes Actives',
            'farm_controls': 'Contrôles de la Ferme',
            'live_sensor_data': 'Données des Capteurs en Direct',
            'recent_readings': 'Lectures Récentes',
            'export_csv': 'Exporter CSV',
            'show_map': 'Afficher la Carte',
            'hide_map': 'Masquer la Carte'
        }
    },

    // Initialize language
    init() {
        console.log('[INFO] Initializing language module...');

        // Load saved language or use default
        this.currentLang = localStorage.getItem('agriconnect-lang') || 'en';
        this.applyLanguage(this.currentLang);

        // Setup event listeners
        this.setupEventListeners();

        console.log(`[SUCCESS] Language initialized: ${this.currentLang}`);
    },

    // Setup event listeners
    setupEventListeners() {
        const langBtn = document.getElementById('lang-toggle-btn');
        if (langBtn) {
            langBtn.addEventListener('click', () => this.toggle());
        }
    },

    // Toggle language
    toggle() {
        const newLang = this.currentLang === 'en' ? 'fr' : 'en';
        this.applyLanguage(newLang);

        // Show toast notification
        if (typeof Notifications !== 'undefined') {
            const message = newLang === 'en' ? 'Switched to English' : 'Basculé vers le français';
            Notifications.show(
                '🌐 Language Changed',
                message,
                'info',
                3000
            );
        }
    },

    // Apply language
    applyLanguage(lang) {
        this.currentLang = lang;

        // Update icon
        const icon = document.getElementById('lang-icon');
        if (icon) {
            icon.textContent = lang.toUpperCase();
        }

        // Update all translatable elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[lang][key]) {
                el.textContent = this.translations[lang][key];
            }
        });

        // Save to localStorage
        localStorage.setItem('agriconnect-lang', lang);

        console.log(`[INFO] Language applied: ${lang}`);
    },

    // Get translation
    get(key) {
        return this.translations[this.currentLang][key] || key;
    },

    // Refresh translations (useful when DOM elements are dynamically updated)
    refresh() {
        this.applyLanguage(this.currentLang);
    }
};
