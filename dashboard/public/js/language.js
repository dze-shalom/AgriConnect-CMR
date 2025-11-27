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
            'weather_forecast': 'Weather Forecast',
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
            'export_pdf': 'Export PDF',
            'show_map': 'Show Map',
            'hide_map': 'Hide Map',

            // Map Section
            'farm_map_title': 'Farm Map - Node Locations',
            'legend': 'Legend',
            'farm_location': 'Farm Location',
            'gateway_online': 'Gateway (Online)',
            'gateway_offline': 'Gateway (Offline)',
            'node_optimal': 'Node (Optimal)',
            'node_warning': 'Node (Warning)',
            'node_offline': 'Node (Offline)',
            'all_nodes': 'All Nodes',
            'online_only': 'Online Only',
            'offline_only': 'Offline Only',
            'warnings_only': 'Warnings Only',
            'total_nodes': 'Total Nodes',
            'online': 'Online',
            'warnings': 'Warnings',
            'offline': 'Offline',

            // Chart Section
            'temp_humidity': 'Temperature & Humidity',
            'soil_moisture': 'Soil Moisture',
            'ph_ec_levels': 'pH & EC Levels',
            'npk_levels': 'NPK Levels',
            'last_24_hours': 'Last 24 Hours',
            'last_7_days': 'Last 7 Days',
            'last_30_days': 'Last 30 Days',

            // Farm Controls
            'pump_control': 'Pump Control',
            'water_pump': 'Water Pump',
            'manual_irrigation': 'Manual Irrigation',
            'irrigation_zone': 'Irrigation Zone',
            'irrigation_zones': 'Irrigation Zones',
            'zone': 'Zone',
            'field': 'Field',
            'turn_on': 'Turn ON',
            'turn_off': 'Turn OFF',
            'duration_minutes': 'Duration (minutes)',
            'start_irrigation': 'Start Irrigation',
            'time_remaining': 'Time remaining',
            'quick_actions': 'Quick Actions',
            'water_all_zones': 'Water All Zones',
            'emergency_stop': 'Emergency Stop',
            'test_pump': 'Test Pump',
            'sync_nodes': 'Sync All Nodes',
            'test_pump_1min': 'Test Pump (1 min)',
            'select_target': 'Select Target',
            'duration_control': 'Duration Control',
            'common_tasks': 'Common Tasks',
            'generate_pdf_report': 'Generate PDF Report',

            // Intelligence Section
            'disease_analysis': ' Disease Analysis',
            'upload_leaf_image': '📸 Upload Leaf Image',
            'disease_instruction': 'Upload a photo of tomato leaves for AI-powered disease detection',

            // Alert Settings
            'email_alert_settings': 'Email Alert Settings',
            'sms_alert_settings': 'SMS Alert Settings',
            'email_address': 'Email Address',
            'phone_number': 'Phone Number',
            'enable_email_alerts': 'Enable email alerts',
            'enable_sms_alerts': 'Enable SMS alerts',
            'save_settings': 'Save Settings',
            'test_alert': 'Test Alert',

            // Misc
            'loading': 'Loading...',
            'close': 'Close',
            'save': 'Save',
            'cancel': 'Cancel'
        },
        fr: {
            // Navigation items
            'nav_overview': 'Vue d\'ensemble',
            'nav_monitoring': 'Surveillance',
            'nav_monitoring_sub': 'Capteurs & Météo',
            'nav_analytics': 'Analytique',
            'nav_analytics_sub': 'Graphiques & Rapports',
            'nav_intelligence': 'IA Insights',
            'nav_intelligence_sub': 'Prédictions & Analyse',
            'nav_automation': 'Automatisation',
            'nav_automation_sub': 'Contrôles & Planification',
            'nav_satellite': 'Satellite',
            'nav_satellite_sub': 'NDVI & Cartographie',
            'nav_alerts': 'Alertes & Maintenance',
            'nav_settings': 'Paramètres',
            'nav_settings_sub': 'Notifications & Configuration',
            'nav_farm_map': 'Carte de la Ferme',
            'nav_live_sensors': 'Capteurs en Direct',
            'nav_weather': 'Météo',
            'nav_ai_insights': 'Insights IA',
            'nav_farm_controls': 'Contrôles de la Ferme',
            'nav_reports': 'Rapports',

            // Header
            'dashboard_title': 'Tableau de Bord AgriConnect',
            'last_update': 'Dernière mise à jour',
            'logout': 'Déconnexion',
            'refresh': 'Actualiser',

            // General UI
            'weather_forecast': 'Prévisions Météo',
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
            'export_pdf': 'Exporter PDF',
            'show_map': 'Afficher la Carte',
            'hide_map': 'Masquer la Carte',

            // Map Section
            'farm_map_title': 'Carte de la Ferme - Emplacements des Nœuds',
            'legend': 'Légende',
            'farm_location': 'Emplacement de la Ferme',
            'gateway_online': 'Passerelle (En ligne)',
            'gateway_offline': 'Passerelle (Hors ligne)',
            'node_optimal': 'Nœud (Optimal)',
            'node_warning': 'Nœud (Avertissement)',
            'node_offline': 'Nœud (Hors ligne)',
            'all_nodes': 'Tous les Nœuds',
            'online_only': 'En ligne uniquement',
            'offline_only': 'Hors ligne uniquement',
            'warnings_only': 'Avertissements uniquement',
            'total_nodes': 'Total de Nœuds',
            'online': 'En ligne',
            'warnings': 'Avertissements',
            'offline': 'Hors ligne',

            // Chart Section
            'temp_humidity': 'Température & Humidité',
            'soil_moisture': 'Humidité du Sol',
            'ph_ec_levels': 'Niveaux de pH & EC',
            'npk_levels': 'Niveaux NPK',
            'last_24_hours': 'Dernières 24 Heures',
            'last_7_days': 'Derniers 7 Jours',
            'last_30_days': 'Derniers 30 Jours',

            // Farm Controls
            'pump_control': 'Contrôle de la Pompe',
            'water_pump': 'Pompe à Eau',
            'manual_irrigation': 'Irrigation Manuelle',
            'irrigation_zone': 'Zone d\'Irrigation',
            'irrigation_zones': 'Zones d\'Irrigation',
            'zone': 'Zone',
            'field': 'Champ',
            'turn_on': 'Activer',
            'turn_off': 'Désactiver',
            'duration_minutes': 'Durée (minutes)',
            'start_irrigation': 'Démarrer l\'Irrigation',
            'time_remaining': 'Temps restant',
            'quick_actions': 'Actions Rapides',
            'water_all_zones': 'Arroser Toutes les Zones',
            'emergency_stop': 'Arrêt d\'Urgence',
            'test_pump': 'Tester la Pompe',
            'sync_nodes': 'Synchroniser tous les Nœuds',
            'test_pump_1min': 'Tester la Pompe (1 min)',
            'select_target': 'Sélectionner la Cible',
            'duration_control': 'Contrôle de la Durée',
            'common_tasks': 'Tâches Courantes',
            'generate_pdf_report': 'Générer un Rapport PDF',

            // Intelligence Section
            'disease_analysis': ' Analyse des Maladies',
            'upload_leaf_image': '📸 Télécharger une Image de Feuille',
            'disease_instruction': 'Téléchargez une photo de feuilles de tomate pour la détection de maladies par IA',

            // Alert Settings
            'email_alert_settings': 'Paramètres d\'Alertes Email',
            'sms_alert_settings': 'Paramètres d\'Alertes SMS',
            'email_address': 'Adresse Email',
            'phone_number': 'Numéro de Téléphone',
            'enable_email_alerts': 'Activer les alertes email',
            'enable_sms_alerts': 'Activer les alertes SMS',
            'save_settings': 'Enregistrer les Paramètres',
            'test_alert': 'Tester l\'Alerte',

            // Misc
            'loading': 'Chargement...',
            'close': 'Fermer',
            'save': 'Enregistrer',
            'cancel': 'Annuler'
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
