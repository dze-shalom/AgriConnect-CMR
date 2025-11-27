/**
 * Telegram Alerts Module
 * Sends critical farm alerts via Telegram Bot
 */

const TelegramAlerts = {
    enabled: false,
    chatId: '',
    supabaseFunctionUrl: '',

    // Initialize Telegram alerts module
    init() {
        console.log('[INFO] Initializing Telegram alerts module...');

        // Build Supabase function URL
        this.supabaseFunctionUrl = `${CONFIG.supabase.url}/functions/v1/send-telegram-alert`;

        // Load settings from localStorage
        this.loadSettings();

        // Setup event listeners
        this.setupEventListeners();

        console.log('[SUCCESS] Telegram alerts module initialized');
    },

    // Setup event listeners
    setupEventListeners() {
        // Telegram settings form
        const telegramForm = document.getElementById('telegram-alert-settings-form');
        if (telegramForm) {
            telegramForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Enable/disable Telegram alerts checkbox
        const enableCheckbox = document.getElementById('enable-telegram-alerts');
        if (enableCheckbox) {
            enableCheckbox.addEventListener('change', (e) => {
                this.enabled = e.target.checked;
                this.updateUIState();
            });
        }

        // Test Telegram button
        const testTelegramBtn = document.getElementById('test-telegram-btn');
        if (testTelegramBtn) {
            testTelegramBtn.addEventListener('click', () => this.sendTestMessage());
        }
    },

    // Load settings from localStorage
    loadSettings() {
        const savedChatId = localStorage.getItem('telegram_alert_chat_id');
        const savedEnabled = localStorage.getItem('telegram_alerts_enabled') === 'true';

        if (savedChatId) {
            this.chatId = savedChatId;
            const chatIdInput = document.getElementById('telegram-chat-id-input');
            if (chatIdInput) chatIdInput.value = savedChatId;
        }

        if (savedEnabled) {
            this.enabled = true;
            const checkbox = document.getElementById('enable-telegram-alerts');
            if (checkbox) checkbox.checked = true;
        }

        this.updateUIState();
    },

    // Save settings to localStorage
    async saveSettings() {
        const chatIdInput = document.getElementById('telegram-chat-id-input');
        const enableCheckbox = document.getElementById('enable-telegram-alerts');

        if (!chatIdInput || !enableCheckbox) return;

        const previousChatId = this.chatId;
        const previousEnabled = this.enabled;

        const chatId = chatIdInput.value.trim();

        // Validate chat ID (numeric or @username)
        if (chatId && !chatId.match(/^(@[\w]+|[-]?\d+)$/)) {
            if (typeof Notifications !== 'undefined') {
                Notifications.show(
                    'Invalid Chat ID',
                    'Please use numeric ID (e.g., 123456789) or username (e.g., @username)',
                    'error',
                    3000
                );
            }
            return;
        }

        this.chatId = chatId;
        this.enabled = enableCheckbox.checked;

        // Save to localStorage
        localStorage.setItem('telegram_alert_chat_id', this.chatId);
        localStorage.setItem('telegram_alerts_enabled', this.enabled.toString());

        // Check if this is a new setup or newly enabled
        const isNewSetup = (this.chatId !== previousChatId) ||
                         (this.enabled && !previousEnabled && this.chatId);

        if (typeof Notifications !== 'undefined') {
            Notifications.show(
                'Settings Saved',
                `Telegram alerts ${this.enabled ? 'enabled' : 'disabled'}`,
                'success',
                3000
            );
        }

        console.log('[INFO] Telegram alert settings saved');

        // Auto-send welcome message if newly enabled
        if (this.enabled && isNewSetup && this.chatId) {
            console.log('[INFO] Sending welcome message to verify setup...');
            await this.sendWelcomeMessage();
        }

        this.updateUIState();
    },

    // Update UI state
    updateUIState() {
        const chatIdInput = document.getElementById('telegram-chat-id-input');
        const testBtn = document.getElementById('test-telegram-btn');

        if (chatIdInput) {
            chatIdInput.disabled = !this.enabled;
        }

        if (testBtn) {
            testBtn.disabled = !this.enabled || !this.chatId;
        }
    },

    // Send welcome message
    async sendWelcomeMessage() {
        return this.sendAlert({
            alertType: 'System Setup',
            severity: 'info',
            message: 'Telegram alerts successfully configured! You will receive farm notifications here.',
            farmId: CONFIG.farmId || 'FARM-CM-001'
        });
    },

    // Send test message
    async sendTestMessage() {
        if (!this.enabled || !this.chatId) {
            if (typeof Notifications !== 'undefined') {
                Notifications.show(
                    'Test Failed',
                    'Please enable Telegram alerts and provide a chat ID first',
                    'error',
                    3000
                );
            }
            return;
        }

        console.log('[INFO] Sending test Telegram message...');

        try {
            await this.sendAlert({
                alertType: 'Test Alert',
                severity: 'info',
                message: 'This is a test message from AgriConnect. Your Telegram alerts are working correctly!',
                sensorData: {
                    air_temperature: 25.5,
                    air_humidity: 65.2,
                    soil_moisture: 450,
                    battery_level: 85
                },
                farmId: CONFIG.farmId || 'FARM-CM-001'
            });

            if (typeof Notifications !== 'undefined') {
                Notifications.show(
                    'Test Sent',
                    'Check your Telegram for the test message',
                    'success',
                    3000
                );
            }

        } catch (error) {
            console.error('[ERROR] Test message failed:', error);

            if (typeof Notifications !== 'undefined') {
                Notifications.show(
                    'Test Failed',
                    error.message || 'Could not send test message',
                    'error',
                    5000
                );
            }
        }
    },

    // Send alert via Telegram
    async sendAlert(alertData) {
        if (!this.enabled || !this.chatId) {
            console.warn('[WARN] Telegram alerts disabled or no chat ID configured');
            return;
        }

        console.log('[INFO] Sending Telegram alert:', alertData.alertType);

        try {
            const response = await fetch(this.supabaseFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.supabase.anonKey}`
                },
                body: JSON.stringify({
                    ...alertData,
                    chatId: this.chatId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send Telegram alert');
            }

            console.log('[SUCCESS] Telegram alert sent:', data.messageId);
            return data;

        } catch (error) {
            console.error('[ERROR] Failed to send Telegram alert:', error);
            throw error;
        }
    },

    // Send critical alert (high temperature, low moisture, etc.)
    async sendCriticalAlert(type, message, sensorData) {
        return this.sendAlert({
            alertType: type,
            severity: 'critical',
            message: message,
            sensorData: sensorData,
            farmId: CONFIG.farmId || 'FARM-CM-001'
        });
    },

    // Send warning alert
    async sendWarningAlert(type, message, sensorData) {
        return this.sendAlert({
            alertType: type,
            severity: 'warning',
            message: message,
            sensorData: sensorData,
            farmId: CONFIG.farmId || 'FARM-CM-001'
        });
    },

    // Send info alert
    async sendInfoAlert(type, message, sensorData) {
        return this.sendAlert({
            alertType: type,
            severity: 'info',
            message: message,
            sensorData: sensorData,
            farmId: CONFIG.farmId || 'FARM-CM-001'
        });
    }
};
