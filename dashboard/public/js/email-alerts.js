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
    async saveEmailSettings() {
        const emailInput = document.getElementById('alert-email-input');
        const enableCheckbox = document.getElementById('enable-email-alerts');

        if (emailInput && enableCheckbox) {
            const previousEmail = this.recipientEmail;
            const previousEnabled = this.enabled;

            this.recipientEmail = emailInput.value.trim();
            this.enabled = enableCheckbox.checked;

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.recipientEmail && !emailRegex.test(this.recipientEmail)) {
                if (typeof Notifications !== 'undefined') {
                    Notifications.error(
                        'Invalid Email',
                        'Please enter a valid email address'
                    );
                }
                return;
            }

            // Save to localStorage
            localStorage.setItem('alertRecipientEmail', this.recipientEmail);
            localStorage.setItem('emailAlertsEnabled', this.enabled.toString());

            // Check if this is a new email or newly enabled
            const isNewSetup = (this.recipientEmail !== previousEmail) ||
                             (this.enabled && !previousEnabled && this.recipientEmail);

            if (typeof Notifications !== 'undefined') {
                Notifications.success(
                    'Settings Saved',
                    `Email alerts ${this.enabled ? 'enabled' : 'disabled'}`
                );
            }

            console.log('[INFO] Email alert settings saved');

            // Auto-send welcome message if email is new or newly enabled
            if (this.enabled && isNewSetup && this.recipientEmail) {
                console.log('[INFO] Sending welcome email to verify setup...');
                await this.sendWelcomeEmail();
            }
        }
    },

    // Send welcome email to verify setup
    async sendWelcomeEmail() {
        if (!this.recipientEmail) return;

        try {
            await this.sendAlert({
                alertType: '🌱 Welcome to AgriConnect',
                severity: 'info',
                message: `Welcome to AgriConnect Farm Monitoring! Your email alerts are now active and working correctly.\n\nYou'll receive notifications for:\n• Critical temperature alerts (< 15°C or > 35°C)\n• Low battery warnings (< 15%)\n• Dry soil alerts (moisture < 300)\n• Sensor offline notifications\n• Daily farm summaries\n\nThank you for choosing AgriConnect. Your farm is now smarter!`,
                sensorData: {
                    air_temperature: 25.0,
                    air_humidity: 68.0,
                    soil_moisture: 520,
                    battery_level: 95
                }
            });

            if (typeof Notifications !== 'undefined') {
                Notifications.success(
                    '📧 Welcome Email Sent!',
                    'Check your inbox to verify email alerts are working'
                );
            }

            console.log('[SUCCESS] Welcome email sent');

        } catch (error) {
            console.error('[ERROR] Failed to send welcome email:', error);

            if (typeof Notifications !== 'undefined') {
                Notifications.warning(
                    'Welcome Email Failed',
                    'Settings saved but email send failed. Please check your Supabase configuration.'
                );
            }
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
