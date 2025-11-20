/**
 * Configuration for AgriConnect Dashboard
 */

const CONFIG = {
    supabase: {
        url: 'https://popjkcyahvtuutgyvxky.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcGprY3lhaHZ0dXV0Z3l2eGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDkwNDIsImV4cCI6MjA3NjUyNTA0Mn0.L-271zGde-RunIUFi9tvOStLve8bE0sG7t_gAuhBcA0'  // UPDATE THIS!
    },

    farmId: 'FARM-CM-001',
    refreshInterval: 30000,

    // Copernicus Sentinel Hub Configuration
    copernicus: {
        clientId: '', // Get from https://dataspace.copernicus.eu/
        clientSecret: '', // Get from https://dataspace.copernicus.eu/
        baseUrl: 'https://sh.dataspace.copernicus.eu',
        oauthUrl: 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
        enabled: false // Set to true when credentials are added
    },

    // WebSocket Configuration (for real-time updates)
    websocket: {
        enabled: false, // Enable when WebSocket server is deployed
        url: 'wss://your-websocket-server.com', // UPDATE THIS
        reconnectInterval: 5000
    },

    // Push Notification Configuration
    pushNotifications: {
        enabled: true,
        vapidPublicKey: '' // Will be generated when service worker is set up
    },

    // Email/SMS Alert Configuration
    alerts: {
        email: {
            enabled: false, // Enable when Supabase Edge Function is deployed
            from: 'alerts@agriconnect.com'
        },
        sms: {
            enabled: false, // Requires Twilio integration
            twilioAccountSid: '',
            twilioAuthToken: '',
            twilioPhoneNumber: ''
        }
    },

    sensorThresholds: {
        airTemperature: { min: 18, max: 30, unit: '°C' },
        airHumidity: { min: 60, max: 80, unit: '%' },
        soilMoisture: { min: 400, max: 600, unit: '' },
        phValue: { min: 6.0, max: 7.0, unit: '' },
        ecValue: { min: 2.0, max: 3.5, unit: 'mS/cm' },
        batteryLevel: { min: 20, max: 100, unit: '%' }
    }
};

// Initialize Supabase client with error handling
(function initializeSupabase() {
    try {
        // Check if Supabase library is loaded
        if (typeof supabase === 'undefined') {
            console.error('[ERROR] Supabase library not loaded. Please check your internet connection.');
            return;
        }

        const { createClient } = supabase;
        const supabaseClient = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

        // Make it globally available
        window.supabase = supabaseClient;
        console.log('[SUCCESS] Supabase client initialized');

    } catch (error) {
        console.error('[ERROR] Failed to initialize Supabase:', error.message);
    }
})();