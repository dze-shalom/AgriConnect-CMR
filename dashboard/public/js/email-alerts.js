/**
 * Email Alerts Module
 * Sends email notifications via Supabase Edge Functions
 */

const EmailAlerts = {
    enabled: false,
    recipientEmail: '',
    supabaseFunctionUrl: '',

    // Initialize email alerts
    init() {
        console.log('[INFO] Initializing email alerts module...');

        this.enabled = CONFIG.alerts.email.enabled;

        if (this.enabled) {
            // Get Supabase function URL
            this.supabaseFunctionUrl = `${CONFIG.supabase.url}/functions/v1/send-alert-email`;

            // Load recipient email from localStorage or settings
            this.recipientEmail = localStorage.getItem('alertRecipientEmail') || '';

            console.log('[SUCCESS] Email alerts module initialized');
        } else {
            console.log('[INFO] Email alerts disabled in config');
        }

        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        // Email settings form
        const emailSettingsForm = document.getElementById('email-alert-settings-form');
        if (emailSettingsForm) {
            emailSettingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEmailSettings();
            });
        }

        // Test email button
        const testEmailBtn = document.getElementById('test-email-btn');
        if (testEmailBtn) {
            testEmailBtn.addEventListener('click', () => this.sendTestEmail());
        }
    },

    // Save email settings
    saveEmailSettings() {
        const emailInput = document.getElementById('alert-email-input');
        const enableCheckbox = document.getElementById('enable-email-alerts');

        if (emailInput && enableCheckbox) {
            this.recipientEmail = emailInput.value.trim();
            this.enabled = enableCheckbox.checked;

            // Save to localStorage
            localStorage.setItem('alertRecipientEmail', this.recipientEmail);
            localStorage.setItem('emailAlertsEnabled', this.enabled.toString());

            if (typeof Notifications !== 'undefined') {
                Notifications.success(
                    'Settings Saved',
                    `Email alerts ${this.enabled ? 'enabled' : 'disabled'}`
                );
            }

            console.log('[INFO] Email alert settings saved');
        }
    },

    // Send test email
    async sendTestEmail() {
        if (!this.recipientEmail) {
            if (typeof Notifications !== 'undefined') {
                Notifications.warning(
                    'No Email Set',
                    'Please configure your email address first'
                );
            }
            return;
        }

        try {
            await this.sendAlert({
                alertType: 'Test Alert',
                severity: 'info',
                message: 'This is a test email from AgriConnect monitoring system. Email alerts are working correctly!',
                sensorData: {
                    air_temperature: 24.5,
                    air_humidity: 68.2,
                    soil_moisture: 512,
                    battery_level: 87
                }
            });

            if (typeof Notifications !== 'undefined') {
                Notifications.success(
                    'Test Email Sent',
                    'Check your inbox for the test alert'
                );
            }

        } catch (error) {
            if (typeof Notifications !== 'undefined') {
                Notifications.error(
                    'Test Failed',
                    error.message
                );
            }
        }
    },

    // Send email alert
    async sendAlert({ alertType, severity, message, sensorData = null }) {
        if (!this.enabled) {
            console.log('[INFO] Email alerts disabled, skipping send');
            return;
        }

        if (!this.recipientEmail) {
            console.log('[WARNING] No recipient email configured');
            return;
        }

        try {
            console.log(`[INFO] Sending ${severity} email alert: ${alertType}`);

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
                    sensorData,
                    recipientEmail: this.recipientEmail,
                    farmId: CONFIG.farmId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Email send failed');
            }

            const data = await response.json();
            console.log('[SUCCESS] Email alert sent:', data.messageId);

            return data;

        } catch (error) {
            console.error('[ERROR] Failed to send email alert:', error);
            throw error;
        }
    },

    // Send critical temperature alert
    async sendCriticalTemperatureAlert(temperature, threshold) {
        await this.sendAlert({
            alertType: 'Critical Temperature Alert',
            severity: 'critical',
            message: `Temperature has reached ${temperature.toFixed(1)}°C, exceeding the threshold of ${threshold}°C. Immediate attention required!`,
            sensorData: { air_temperature: temperature }
        });
    },

    // Send low battery alert
    async sendLowBatteryAlert(batteryLevel, nodeId) {
        await this.sendAlert({
            alertType: 'Low Battery Alert',
            severity: 'warning',
            message: `Sensor node ${nodeId} battery is critically low at ${batteryLevel}%. Please replace batteries soon to avoid data loss.`,
            sensorData: { battery_level: batteryLevel }
        });
    },

    // Send dry soil alert
    async sendDrySoilAlert(soilMoisture, threshold) {
        await this.sendAlert({
            alertType: 'Dry Soil Alert',
            severity: 'warning',
            message: `Soil moisture has dropped to ${soilMoisture}, below the optimal threshold of ${threshold}. Irrigation recommended.`,
            sensorData: { soil_moisture: soilMoisture }
        });
    },

    // Send daily summary email
    async sendDailySummary(stats) {
        await this.sendAlert({
            alertType: 'Daily Farm Summary',
            severity: 'info',
            message: `Daily report: ${stats.activeNodes} active nodes, ${stats.totalReadings} readings collected. Average temperature: ${stats.avgTemp}°C, Humidity: ${stats.avgHumidity}%`,
            sensorData: stats
        });
    }
};
