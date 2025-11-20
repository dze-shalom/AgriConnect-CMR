/**
 * SMS Alerts Module
 * Sends critical farm alerts via Twilio SMS
 */

const SMSAlerts = {
    enabled: false,
    recipientPhone: '',
    supabaseFunctionUrl: '',

    // Initialize SMS alerts module
    init() {
        console.log('[INFO] Initializing SMS alerts module...');

        // Build Supabase function URL
        this.supabaseFunctionUrl = `${CONFIG.supabase.url}/functions/v1/send-sms-alert`;

        // Load settings from localStorage
        this.loadSettings();

        // Setup event listeners
        this.setupEventListeners();

        console.log('[SUCCESS] SMS alerts module initialized');
    },

    // Setup event listeners
    setupEventListeners() {
        // SMS settings form
        const smsForm = document.getElementById('sms-alert-settings-form');
        if (smsForm) {
            smsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Enable/disable SMS alerts checkbox
        const enableCheckbox = document.getElementById('enable-sms-alerts');
        if (enableCheckbox) {
            enableCheckbox.addEventListener('change', (e) => {
                this.enabled = e.target.checked;
                this.updateUIState();
            });
        }

        // Test SMS button
        const testSmsBtn = document.getElementById('test-sms-btn');
        if (testSmsBtn) {
            testSmsBtn.addEventListener('click', () => this.sendTestSMS());
        }
    },

    // Load settings from localStorage
    loadSettings() {
        const savedPhone = localStorage.getItem('sms_alert_phone');
        const savedEnabled = localStorage.getItem('sms_alerts_enabled') === 'true';

        if (savedPhone) {
            this.recipientPhone = savedPhone;
            const phoneInput = document.getElementById('alert-phone-input');
            if (phoneInput) phoneInput.value = savedPhone;
        }

        if (savedEnabled) {
            this.enabled = true;
            const checkbox = document.getElementById('enable-sms-alerts');
            if (checkbox) checkbox.checked = true;
        }

        this.updateUIState();
    },

    // Save settings to localStorage
    saveSettings() {
        const phoneInput = document.getElementById('alert-phone-input');
        const enableCheckbox = document.getElementById('enable-sms-alerts');

        if (!phoneInput || !enableCheckbox) return;

        const phone = phoneInput.value.trim();

        // Validate phone number (E.164 format)
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (phone && !phoneRegex.test(phone)) {
            if (typeof Notifications !== 'undefined') {
                Notifications.error(
                    'Invalid Phone Number',
                    'Please use E.164 format (e.g., +1234567890)'
                );
            }
            return;
        }

        this.recipientPhone = phone;
        this.enabled = enableCheckbox.checked;

        localStorage.setItem('sms_alert_phone', phone);
        localStorage.setItem('sms_alerts_enabled', this.enabled.toString());

        if (typeof Notifications !== 'undefined') {
            Notifications.success(
                'Settings Saved',
                `SMS alerts ${this.enabled ? 'enabled' : 'disabled'}`
            );
        }

        this.updateUIState();
    },

    // Update UI state based on settings
    updateUIState() {
        const phoneInput = document.getElementById('alert-phone-input');
        const testBtn = document.getElementById('test-sms-btn');

        if (phoneInput) {
            phoneInput.disabled = !this.enabled;
        }

        if (testBtn) {
            testBtn.disabled = !this.enabled || !this.recipientPhone;
        }
    },

    // Send SMS alert
    async sendAlert({ alertType, severity, message }) {
        if (!this.enabled || !this.recipientPhone) {
            console.log('[INFO] SMS alerts disabled or no recipient configured');
            return null;
        }

        try {
            console.log(`[INFO] Sending SMS alert: ${alertType} (${severity})`);

            const response = await fetch(this.supabaseFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.supabase.anonKey}`
                },
                body: JSON.stringify({
                    alertType,
                    severity,
                    message,
                    recipientPhone: this.recipientPhone,
                    farmId: CONFIG.farmId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'SMS send failed');
            }

            const data = await response.json();
            console.log('[SUCCESS] SMS alert sent:', data.messageSid);

            return data;

        } catch (error) {
            console.error('[ERROR] Failed to send SMS alert:', error);
            if (typeof Notifications !== 'undefined') {
                Notifications.error('SMS Failed', error.message);
            }
            return null;
        }
    },

    // Send test SMS
    async sendTestSMS() {
        const result = await this.sendAlert({
            alertType: 'Test Alert',
            severity: 'info',
            message: 'This is a test SMS from AgriConnect. Your SMS alerts are working correctly!'
        });

        if (result) {
            if (typeof Notifications !== 'undefined') {
                Notifications.success(
                    'Test SMS Sent',
                    `Message sent to ${this.recipientPhone}`
                );
            }
        }
    },

    // Predefined alert methods

    // Critical temperature alert
    async sendCriticalTemperatureAlert(temperature, threshold) {
        const isHigh = temperature > threshold;
        const message = isHigh
            ? `Extreme high temperature detected: ${temperature}°C (threshold: ${threshold}°C). Immediate action required!`
            : `Extreme low temperature detected: ${temperature}°C (threshold: ${threshold}°C). Risk of crop damage!`;

        return await this.sendAlert({
            alertType: 'Critical Temperature',
            severity: 'critical',
            message
        });
    },

    // Low battery alert
    async sendLowBatteryAlert(batteryLevel, nodeId) {
        return await this.sendAlert({
            alertType: 'Low Battery',
            severity: 'warning',
            message: `Sensor battery critically low at ${batteryLevel}% for ${nodeId}. Replace battery soon.`
        });
    },

    // Dry soil alert
    async sendDrySoilAlert(soilMoisture, threshold) {
        return await this.sendAlert({
            alertType: 'Dry Soil',
            severity: 'critical',
            message: `Critically dry soil detected (${soilMoisture}, threshold: ${threshold}). Irrigation urgently needed!`
        });
    },

    // High stressed vegetation alert
    async sendStressedVegetationAlert(stressedPercentage, fieldName) {
        return await this.sendAlert({
            alertType: 'Vegetation Stress',
            severity: 'warning',
            message: `${stressedPercentage}% of ${fieldName} showing stress indicators. Check irrigation and nutrient levels.`
        });
    },

    // System error alert
    async sendSystemErrorAlert(errorType, details) {
        return await this.sendAlert({
            alertType: 'System Error',
            severity: 'critical',
            message: `System error detected: ${errorType}. ${details}`
        });
    },

    // Daily summary SMS
    async sendDailySummary(stats) {
        const message = `Daily Summary:
Avg Temp: ${stats.avgTemp}°C
Avg Humidity: ${stats.avgHumidity}%
Avg Soil: ${stats.avgSoilMoisture}
Active Sensors: ${stats.activeSensors}
Alerts: ${stats.alertCount}`;

        return await this.sendAlert({
            alertType: 'Daily Summary',
            severity: 'info',
            message
        });
    }
};
