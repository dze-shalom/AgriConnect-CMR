/**
 * Main Application Entry Point
 * Initializes the application and sets up event listeners
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('[INFO] AgriConnect Dashboard starting...');

    // Initialize authentication
    Auth.init();

    // Initialize theme (must be early for proper styling)
    if (typeof Theme !== 'undefined') {
        Theme.init();
    }

    // Initialize language
    if (typeof Language !== 'undefined') {
        Language.init();
    }

    // Initialize notifications
    if (typeof Notifications !== 'undefined') {
        Notifications.init();
    }

    // Initialize push notifications
    if (typeof PushNotifications !== 'undefined') {
        PushNotifications.init();
    }

    // Initialize navigation
    if (typeof Navigation !== 'undefined') {
        Navigation.init();
    }

    // Setup event listeners
    setupEventListeners();

    console.log('[SUCCESS] Application initialized');
});

function setupEventListeners() {
    // Login form
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            const errorDiv = document.getElementById('login-error');
            errorDiv.textContent = 'Please enter both email and password';
            errorDiv.classList.add('show');
            return;
        }
        
        Auth.login(email, password);
    });
    
    // Allow Enter key to submit login
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            Auth.logout();
        }
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.addEventListener('click', () => {
        Dashboard.refresh();
    });
    
    // Export CSV button
    const exportBtn = document.getElementById('export-csv-btn');
    exportBtn.addEventListener('click', () => {
        Dashboard.exportToCSV();
    });

    // Export PDF report button
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (typeof PDFReports !== 'undefined') {
                PDFReports.generateFarmReport();
            }
        });
    }

    // Initialize farm controls after dashboard loads
    if (typeof FarmControls !== 'undefined') {
        FarmControls.init();
    }

    // Initialize farm map
    if (typeof FarmMap !== 'undefined') {
        FarmMap.init();
    }

    // Initialize satellite module
    if (typeof Satellite !== 'undefined') {
        Satellite.init();
    }

    // Initialize NDVI history module
    if (typeof NDVIHistory !== 'undefined') {
        NDVIHistory.init();
    }

    // Satellite panel controls
    const closeSatellitePanel = document.getElementById('close-satellite-panel');
    if (closeSatellitePanel) {
        closeSatellitePanel.addEventListener('click', () => {
            document.getElementById('satellite-analysis-panel').classList.add('hidden');
        });
    }

    const exportSatelliteBtn = document.getElementById('export-satellite-btn');
    if (exportSatelliteBtn) {
        exportSatelliteBtn.addEventListener('click', () => {
            if (typeof Satellite !== 'undefined') {
                Satellite.exportToCSV();
            }
        });
    }
}

// Global function to initialize dashboard modules after login
window.initDashboardModules = async function() {
    console.log('[INFO] Initializing dashboard modules...');

    try {
        // Initialize weather module
        if (typeof Weather !== 'undefined') {
            await Weather.init();
        }

        // Initialize charts module
        if (typeof Charts !== 'undefined') {
            await Charts.init();
        }

        // Initialize intelligence module
        if (typeof Intelligence !== 'undefined') {
            await Intelligence.init();
        }

        // Initialize PDF reports module
        if (typeof PDFReports !== 'undefined') {
            PDFReports.init();
        }

        // Initialize real-time updates (Supabase Realtime)
        if (typeof Realtime !== 'undefined') {
            Realtime.init();
        }

        // Initialize email alerts
        if (typeof EmailAlerts !== 'undefined') {
            EmailAlerts.init();
        }

        // Initialize SMS alerts
        if (typeof SMSAlerts !== 'undefined') {
            SMSAlerts.init();
        }

        // Initialize TensorFlow ML (async, runs in background)
        if (typeof TensorFlowML !== 'undefined') {
            TensorFlowML.init().catch(err => {
                console.error('[ERROR] TensorFlow ML initialization failed:', err);
            });
        }

        // Initialize Disease Analysis
        if (typeof DiseaseAnalysis !== 'undefined') {
            DiseaseAnalysis.init();
        }

        // Initialize Innovation Modules
        console.log('[INFO] Initializing innovation modules...');

        // Initialize Offline Manager first (provides offline capabilities)
        if (typeof OfflineManager !== 'undefined') {
            await OfflineManager.init();
        }

        // Initialize Voice Control
        if (typeof VoiceControl !== 'undefined') {
            VoiceControl.init();
        }

        // Initialize Smart Irrigation Scheduler
        if (typeof SmartScheduler !== 'undefined') {
            SmartScheduler.init();
        }

        // Initialize Predictive Maintenance
        if (typeof PredictiveMaintenance !== 'undefined') {
            PredictiveMaintenance.init();
        }

        // Initialize Yield Forecasting AI
        if (typeof YieldForecast !== 'undefined') {
            YieldForecast.init();
        }

        // Initialize WhatsApp Bot
        if (typeof WhatsAppBot !== 'undefined') {
            WhatsAppBot.init();
        }

        // Notification removed to reduce UI spam
        console.log('[SUCCESS] All dashboard modules initialized');
    } catch (error) {
        console.error('[ERROR] Failed to initialize dashboard modules:', error);
        if (typeof Notifications !== 'undefined') {
            Notifications.error('Initialization Error', 'Some modules failed to load');
        }
    }
};

// Global function to refresh all modules
window.refreshAllModules = async function() {
    console.log('[INFO] Refreshing all modules...');

    try {
        const promises = [];

        if (typeof Dashboard !== 'undefined') promises.push(Dashboard.refresh());
        if (typeof Charts !== 'undefined') promises.push(Charts.refresh());
        if (typeof Weather !== 'undefined') promises.push(Weather.refresh());
        if (typeof Intelligence !== 'undefined') promises.push(Intelligence.refresh());
        if (typeof FarmMap !== 'undefined') promises.push(FarmMap.refresh());
        if (typeof Satellite !== 'undefined') promises.push(Satellite.refresh());

        await Promise.all(promises);

        // Notification removed to reduce UI spam
        console.log('[SUCCESS] All modules refreshed');
    } catch (error) {
        console.error('[ERROR] Failed to refresh modules:', error);
        if (typeof Notifications !== 'undefined') {
            Notifications.error('Refresh Failed', 'Could not update some modules');
        }
    }
};