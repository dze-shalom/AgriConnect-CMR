/**
 * Unified Alerts Manager
 * Coordinates all alert channels (Email, SMS, Telegram, WhatsApp)
 */

const AlertsManager = {
    enabledChannels: [],
    settings: {
        email: { address: '' },
        sms: { phone: '' },
        telegram: { chatId: '' },
        whatsapp: { phone: '' }
    },

    // Initialize alerts manager
    init() {
        console.log('[INFO] Initializing Alerts Manager...');

        this.loadSettings();
        this.setupEventListeners();
        this.initializeModules();

        console.log('[SUCCESS] Alerts Manager initialized');
    },

    // Load settings from localStorage
    loadSettings() {
        const saved = localStorage.getItem('alerts-manager-settings');
        if (saved) {
            const data = JSON.parse(saved);
            this.enabledChannels = data.enabledChannels || [];
            this.settings = data.settings || this.settings;
        }

        this.updateUI();
    },

    // Save settings to localStorage
    saveSettings() {
        localStorage.setItem('alerts-manager-settings', JSON.stringify({
            enabledChannels: this.enabledChannels,
            settings: this.settings
        }));
    },

    // Setup event listeners
    setupEventListeners() {
        // Alert channels selector
        const channelsSelect = document.getElementById('alert-channels-select');
        if (channelsSelect) {
            channelsSelect.addEventListener('change', (e) => {
                const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
                this.enabledChannels = selectedOptions;
                this.updateUI();
                this.saveSettings();
            });
        }

        // Save alert settings button
        const saveBtn = document.getElementById('save-alert-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveChannelSettings();
            });
        }

        // Test alerts button
        const testBtn = document.getElementById('test-alerts-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.sendTestAlerts();
            });
        }
    },

    // Initialize alert modules based on enabled channels
    initializeModules() {
        this.enabledChannels.forEach(channel => {
            switch(channel) {
                case 'email':
                    if (typeof EmailAlerts !== 'undefined') {
                        EmailAlerts.enabled = true;
                        EmailAlerts.recipientEmail = this.settings.email.address;
                    }
                    break;
                case 'sms':
                    if (typeof SMSAlerts !== 'undefined') {
                        SMSAlerts.enabled = true;
                        SMSAlerts.recipientPhone = this.settings.sms.phone;
                    }
                    break;
                case 'telegram':
                    if (typeof TelegramAlerts !== 'undefined') {
                        TelegramAlerts.enabled = true;
                        TelegramAlerts.chatId = this.settings.telegram.chatId;
                    }
                    break;
                case 'whatsapp':
                    // WhatsApp bot initialization
                    if (typeof WhatsAppBot !== 'undefined') {
                        WhatsAppBot.enabled = true;
                        WhatsAppBot.phoneNumber = this.settings.whatsapp.phone;
                    }
                    break;
            }
        });
    },

    // Update UI based on enabled channels
    updateUI() {
        // Update multi-select
        const channelsSelect = document.getElementById('alert-channels-select');
        if (channelsSelect) {
            Array.from(channelsSelect.options).forEach(option => {
                option.selected = this.enabledChannels.includes(option.value);
            });
        }

        // Show/hide channel-specific settings
        const emailSettings = document.getElementById('email-settings');
        const smsSettings = document.getElementById('sms-settings');
        const telegramSettings = document.getElementById('telegram-settings');
        const whatsappSettings = document.getElementById('whatsapp-settings');

        if (emailSettings) {
            emailSettings.style.display = this.enabledChannels.includes('email') ? 'block' : 'none';
        }
        if (smsSettings) {
            smsSettings.style.display = this.enabledChannels.includes('sms') ? 'block' : 'none';
        }
        if (telegramSettings) {
            telegramSettings.style.display = this.enabledChannels.includes('telegram') ? 'block' : 'none';
        }
        if (whatsappSettings) {
            whatsappSettings.style.display = this.enabledChannels.includes('whatsapp') ? 'block' : 'none';
        }

        // Populate existing settings
        const emailInput = document.getElementById('alert-email-input');
        const smsInput = document.getElementById('alert-sms-input');
        const telegramInput = document.getElementById('alert-telegram-input');
        const whatsappInput = document.getElementById('alert-whatsapp-input');

        if (emailInput) emailInput.value = this.settings.email.address;
        if (smsInput) smsInput.value = this.settings.sms.phone;
        if (telegramInput) telegramInput.value = this.settings.telegram.chatId;
        if (whatsappInput) whatsappInput.value = this.settings.whatsapp.phone;
    },

    // Save channel-specific settings
    saveChannelSettings() {
        const emailInput = document.getElementById('alert-email-input');
        const smsInput = document.getElementById('alert-sms-input');
        const telegramInput = document.getElementById('alert-telegram-input');
        const whatsappInput = document.getElementById('alert-whatsapp-input');

        if (emailInput) this.settings.email.address = emailInput.value.trim();
        if (smsInput) this.settings.sms.phone = smsInput.value.trim();
        if (telegramInput) this.settings.telegram.chatId = telegramInput.value.trim();
        if (whatsappInput) this.settings.whatsapp.phone = whatsappInput.value.trim();

        this.saveSettings();
        this.initializeModules();

        if (typeof Notifications !== 'undefined') {
            Notifications.show(
                'Settings Saved',
                `Alert channels updated: ${this.enabledChannels.join(', ')}`,
                'success',
                3000
            );
        }

        console.log('[INFO] Alert settings saved');
    },

    // Send test alerts to all enabled channels
    async sendTestAlerts() {
        console.log('[INFO] Sending test alerts to enabled channels...');

        const testData = {
            alertType: 'Test Alert',
            severity: 'info',
            message: 'This is a test alert from AgriConnect. Your alert system is working correctly!',
            sensorData: {
                air_temperature: 25.5,
                air_humidity: 65.2,
                soil_moisture: 450,
                battery_level: 85
            },
            farmId: CONFIG.farmId || 'FARM-CM-001'
        };

        let successCount = 0;
        let failCount = 0;

        for (const channel of this.enabledChannels) {
            try {
                switch(channel) {
                    case 'email':
                        if (typeof EmailAlerts !== 'undefined' && this.settings.email.address) {
                            await EmailAlerts.sendAlert(testData);
                            successCount++;
                        }
                        break;
                    case 'sms':
                        if (typeof SMSAlerts !== 'undefined' && this.settings.sms.phone) {
                            await SMSAlerts.sendAlert({
                                ...testData,
                                recipientPhone: this.settings.sms.phone
                            });
                            successCount++;
                        }
                        break;
                    case 'telegram':
                        if (typeof TelegramAlerts !== 'undefined' && this.settings.telegram.chatId) {
                            await TelegramAlerts.sendAlert(testData);
                            successCount++;
                        }
                        break;
                    case 'whatsapp':
                        if (typeof WhatsAppBot !== 'undefined' && this.settings.whatsapp.phone) {
                            // WhatsApp implementation
                            successCount++;
                        }
                        break;
                }
            } catch (error) {
                console.error(`[ERROR] Failed to send ${channel} alert:`, error);
                failCount++;
            }
        }

        if (typeof Notifications !== 'undefined') {
            if (successCount > 0) {
                Notifications.show(
                    'Test Alerts Sent',
                    `Successfully sent to ${successCount} channel(s)`,
                    'success',
                    4000
                );
            } else {
                Notifications.show(
                    'Test Failed',
                    'Failed to send test alerts. Check your settings.',
                    'error',
                    4000
                );
            }
        }
    },

    // Send alert to all enabled channels
    async sendAlert(alertData) {
        if (this.enabledChannels.length === 0) {
            console.warn('[WARN] No alert channels enabled');
            return;
        }

        console.log('[INFO] Sending alert to enabled channels:', this.enabledChannels);

        const promises = [];

        this.enabledChannels.forEach(channel => {
            switch(channel) {
                case 'email':
                    if (typeof EmailAlerts !== 'undefined' && this.settings.email.address) {
                        promises.push(
                            EmailAlerts.sendAlert({
                                ...alertData,
                                recipientEmail: this.settings.email.address
                            })
                        );
                    }
                    break;
                case 'sms':
                    if (typeof SMSAlerts !== 'undefined' && this.settings.sms.phone) {
                        promises.push(
                            SMSAlerts.sendAlert({
                                ...alertData,
                                recipientPhone: this.settings.sms.phone
                            })
                        );
                    }
                    break;
                case 'telegram':
                    if (typeof TelegramAlerts !== 'undefined' && this.settings.telegram.chatId) {
                        promises.push(
                            TelegramAlerts.sendAlert(alertData)
                        );
                    }
                    break;
                case 'whatsapp':
                    // WhatsApp implementation
                    break;
            }
        });

        try {
            await Promise.allSettled(promises);
            console.log('[SUCCESS] Alerts sent to all enabled channels');
        } catch (error) {
            console.error('[ERROR] Failed to send some alerts:', error);
        }
    },

    // Send critical alert
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
