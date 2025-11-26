/**
 * WhatsApp Bot Integration
 * Allows farmers to control their farm via WhatsApp messages
 */

const WhatsAppBot = {
    enabled: false,
    phoneNumber: null,
    sessionActive: false,
    messageHistory: [],
    commands: {},
    waterTank: {
        capacity: 5000, // liters
        currentLevel: 5000, // liters
        minLevel: 500, // minimum safe level
        lastCheck: null,
        lowLevelAlertSent: false,
        activeZone: null, // Currently irrigating zone
        lastConsumptionUpdate: null
    },

    // Zone configurations (area in hectares, flow rate in L/min/ha)
    zones: {
        'field1-zone1': { name: 'Field 1, Zone 1', area: 0.5, flowRate: 30 }, // 15 L/min total
        'field1-zone2': { name: 'Field 1, Zone 2', area: 0.3, flowRate: 30 }, // 9 L/min total
        'field1-zone3': { name: 'Field 1, Zone 3', area: 0.4, flowRate: 30 }, // 12 L/min total
        'field2-zone1': { name: 'Field 2, Zone 1', area: 0.6, flowRate: 30 }, // 18 L/min total
        'field2-zone2': { name: 'Field 2, Zone 2', area: 0.5, flowRate: 30 }  // 15 L/min total
    },

    alertsSent: new Set(), // Track which alerts have been sent to avoid spam

    // Initialize module
    init() {
        console.log('[INFO] Initializing WhatsApp Bot...');

        this.loadSettings();
        this.setupCommands();
        this.setupEventListeners();
        this.checkConnection();
        this.startMonitoring();

        console.log('[SUCCESS] WhatsApp Bot initialized');
    },

    // Load saved settings
    loadSettings() {
        const saved = localStorage.getItem('whatsapp-bot-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.enabled = settings.enabled || false;
            this.phoneNumber = settings.phoneNumber || null;
        }
    },

    // Setup available commands
    setupCommands() {
        this.commands = {
            // Status commands
            'status': {
                keywords: ['status', 'état', 'how is', 'comment va'],
                handler: () => this.handleStatusQuery(),
                description: 'Get farm status overview'
            },
            'sensors': {
                keywords: ['sensors', 'capteurs', 'readings', 'mesures'],
                handler: () => this.handleSensorsQuery(),
                description: 'Get latest sensor readings'
            },
            'weather': {
                keywords: ['weather', 'météo', 'forecast', 'prévisions'],
                handler: () => this.handleWeatherQuery(),
                description: 'Get weather forecast'
            },

            // Control commands
            'water': {
                keywords: ['water', 'irrigate', 'irrigation', 'arroser'],
                handler: (params) => this.handleWaterCommand(params),
                description: 'Start irrigation (e.g., "water zone 1 for 15 minutes")'
            },
            'pump on': {
                keywords: ['pump on', 'start pump', 'pompe allumée', 'démarrer pompe'],
                handler: () => this.handlePumpCommand('on'),
                description: 'Turn water pump on'
            },
            'pump off': {
                keywords: ['pump off', 'stop pump', 'pompe éteinte', 'arrêter pompe'],
                handler: () => this.handlePumpCommand('off'),
                description: 'Turn water pump off'
            },

            // Information commands
            'help': {
                keywords: ['help', 'aide', 'commands', 'commandes'],
                handler: () => this.handleHelpCommand(),
                description: 'Show available commands'
            },
            'alerts': {
                keywords: ['alerts', 'alertes', 'warnings', 'avertissements'],
                handler: () => this.handleAlertsQuery(),
                description: 'Check active alerts'
            },

            // Smart features
            'schedule': {
                keywords: ['schedule', 'planning', 'when will', 'quand va'],
                handler: () => this.handleScheduleQuery(),
                description: 'Check irrigation schedule'
            },
            'yield': {
                keywords: ['yield', 'forecast', 'rendement', 'prévision'],
                handler: () => this.handleYieldQuery(),
                description: 'Get yield forecast'
            }
        };
    },

    // Setup event listeners
    setupEventListeners() {
        // Enable/disable toggle
        const toggleBtn = document.getElementById('whatsapp-bot-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('change', (e) => {
                this.enabled = e.target.checked;
                this.saveSettings();

                if (this.enabled) {
                    this.activateBot();
                } else {
                    this.deactivateBot();
                }
            });
        }

        // Phone number setup
        const phoneInput = document.getElementById('whatsapp-phone-number');
        const saveBtn = document.getElementById('save-whatsapp-number');

        if (saveBtn && phoneInput) {
            saveBtn.addEventListener('click', () => {
                this.phoneNumber = phoneInput.value;
                this.saveSettings();

                if (typeof Notifications !== 'undefined') {
                    Notifications.show(
                        '✅ Number Saved',
                        'WhatsApp notifications will be sent to this number',
                        'success',
                        3000
                    );
                }
            });
        }

        // Listen for farm events to send notifications
        document.addEventListener('pump-activated', () => {
            this.sendNotification('💧 Water pump is now ON');
        });

        document.addEventListener('pump-deactivated', () => {
            this.sendNotification('💧 Water pump is now OFF');
        });

        document.addEventListener('irrigation-started', (e) => {
            const zoneId = e.detail.zoneId || 'field1-zone1'; // Default zone if not specified
            const zone = this.zones[zoneId];

            // Set active zone for water consumption tracking
            this.waterTank.activeZone = zoneId;
            this.waterTank.lastConsumptionUpdate = new Date();

            // Calculate water needed
            const waterNeeded = this.calculateWaterNeeded(zoneId, e.detail.duration || 15);
            const zoneName = zone ? zone.name : e.detail.zone;

            this.sendNotification(
                `💦 Irrigation started: ${zoneName}, ${e.detail.duration || 15} min\n` +
                `Water needed: ~${waterNeeded}L`
            );

            console.log(`[INFO] Active irrigation zone set: ${zoneName} (${waterNeeded}L needed)`);
        });

        // Update tank display every 5 seconds
        setInterval(() => this.updateTankDisplay(), 5000);

        // Initial display update
        setTimeout(() => this.updateTankDisplay(), 1000);
    },

    // Update tank visual display
    updateTankDisplay() {
        const status = this.getWaterTankStatus();

        const tankFill = document.getElementById('tank-fill');
        const tankPercentage = document.getElementById('tank-percentage');
        const tankCurrent = document.getElementById('tank-current');
        const tankStatus = document.getElementById('tank-status');
        const tankConsumption = document.getElementById('tank-consumption');

        if (tankFill) {
            tankFill.style.height = `${status.percentage}%`;

            // Update color based on level
            tankFill.classList.remove('low', 'critical');
            if (status.status === 'critical') {
                tankFill.classList.add('critical');
            } else if (status.status === 'low') {
                tankFill.classList.add('low');
            }
        }

        if (tankPercentage) {
            tankPercentage.textContent = `${status.percentage}%`;
        }

        if (tankCurrent) {
            tankCurrent.textContent = `${status.currentLevel}L`;
        }

        if (tankStatus) {
            tankStatus.textContent = status.status.charAt(0).toUpperCase() + status.status.slice(1);
            tankStatus.className = `sensor-status ${status.status}`;
        }

        if (tankConsumption) {
            if (status.activeZone && status.consumptionRate > 0) {
                tankConsumption.textContent = `${status.consumptionRate.toFixed(1)} L/min (${status.activeZone})`;
            } else {
                tankConsumption.textContent = '0 L/min';
            }
        }
    },

    // Check connection to backend
    async checkConnection() {
        if (!this.enabled) return;

        try {
            const response = await fetch('/api/whatsapp/status');
            if (response.ok) {
                const data = await response.json();
                this.sessionActive = data.active;
                console.log('[SUCCESS] WhatsApp bot connected');
            }
        } catch (error) {
            console.log('[INFO] WhatsApp backend not configured - using simulation mode');
            this.sessionActive = false;
        }
    },

    // Activate bot
    async activateBot() {
        console.log('[INFO] Activating WhatsApp bot...');

        if (!this.phoneNumber) {
            if (typeof Notifications !== 'undefined') {
                Notifications.show(
                    '⚠️ Setup Required',
                    'Please enter your phone number first',
                    'warning',
                    4000
                );
            }
            return;
        }

        try {
            // Register with backend
            const response = await fetch('/api/whatsapp/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: this.phoneNumber
                })
            });

            if (response.ok) {
                this.sessionActive = true;
                this.sendWelcomeMessage();
            }
        } catch (error) {
            console.log('[INFO] Using simulation mode - backend not available');
            this.sessionActive = true;
            this.sendWelcomeMessage();
        }
    },

    // Deactivate bot
    async deactivateBot() {
        console.log('[INFO] Deactivating WhatsApp bot...');

        try {
            await fetch('/api/whatsapp/deactivate', { method: 'POST' });
        } catch (error) {
            console.log('[INFO] Simulation mode - no backend to deactivate');
        }

        this.sessionActive = false;
    },

    // Send welcome message
    sendWelcomeMessage() {
        const message = `🌾 *AgriConnect Bot Activated*\n\n` +
            `Your farm is now connected! You can control your farm by sending commands via WhatsApp.\n\n` +
            `Try: "status", "sensors", "water zone 1", "pump on"\n\n` +
            `Send "help" for full command list.`;

        this.sendMessage(message);
    },

    // Process incoming message
    async processMessage(messageText) {
        console.log('[INFO] Processing WhatsApp message:', messageText);

        const text = messageText.toLowerCase().trim();

        // Store in history
        this.messageHistory.push({
            text: messageText,
            timestamp: new Date(),
            direction: 'incoming'
        });

        // Find matching command
        for (const [cmdName, cmd] of Object.entries(this.commands)) {
            for (const keyword of cmd.keywords) {
                if (text.includes(keyword)) {
                    // Extract parameters
                    const params = this.extractParameters(text);

                    try {
                        const response = await cmd.handler(params);
                        this.sendMessage(response);
                        return;
                    } catch (error) {
                        console.error('[ERROR] Command handler failed:', error);
                        this.sendMessage('❌ Sorry, something went wrong executing that command.');
                        return;
                    }
                }
            }
        }

        // No command matched
        this.sendMessage(
            `❓ I didn't understand that command.\n\nSend "help" to see available commands.`
        );
    },

    // Extract parameters from message
    extractParameters(text) {
        const params = {};

        // Extract zone number
        const zoneMatch = text.match(/zone\s*(\d+)/i);
        if (zoneMatch) {
            params.zone = zoneMatch[1];
        }

        // Extract duration
        const durationMatch = text.match(/(\d+)\s*(minute|min|hour|hr)/i);
        if (durationMatch) {
            const value = parseInt(durationMatch[1]);
            const unit = durationMatch[2];
            params.duration = unit.includes('hour') || unit.includes('hr') ? value * 60 : value;
        }

        return params;
    },

    // Command handlers
    async handleStatusQuery() {
        let status = '🌾 *Farm Status Overview*\n\n';

        // Pump status
        const pumpStatus = document.getElementById('pump-status-indicator')?.textContent || 'Unknown';
        status += `💧 Water Pump: ${pumpStatus}\n`;

        // Sensor data
        if (typeof Dashboard !== 'undefined') {
            try {
                const sensors = await Dashboard.fetchSensorData();
                if (sensors && sensors.length > 0) {
                    const latest = sensors[0];
                    status += `🌡️ Temperature: ${Math.round(latest.temperature)}°C\n`;
                    status += `💦 Soil Moisture: ${Math.round(latest.soil_moisture)}%\n`;
                    status += `💨 Humidity: ${Math.round(latest.humidity)}%\n`;
                }
            } catch (error) {
                status += '⚠️ Sensor data unavailable\n';
            }
        }

        // Alerts
        const alertsCount = document.getElementById('alerts-count')?.textContent || '0';
        status += `\n🔔 Active Alerts: ${alertsCount}\n`;

        status += `\n✅ All systems operational`;

        return status;
    },

    async handleSensorsQuery() {
        let response = '📊 *Latest Sensor Readings*\n\n';

        if (typeof Dashboard !== 'undefined') {
            try {
                const sensors = await Dashboard.fetchSensorData();
                if (sensors && sensors.length > 0) {
                    sensors.slice(0, 3).forEach((sensor, i) => {
                        response += `*Sensor ${i + 1}*\n`;
                        response += `🌡️ Temp: ${Math.round(sensor.temperature)}°C\n`;
                        response += `💦 Moisture: ${Math.round(sensor.soil_moisture)}%\n`;
                        response += `💨 Humidity: ${Math.round(sensor.humidity)}%\n`;
                        response += `🔋 Battery: ${Math.round(sensor.battery)}%\n\n`;
                    });
                } else {
                    response += '⚠️ No sensor data available';
                }
            } catch (error) {
                response += '❌ Failed to fetch sensor data';
            }
        } else {
            response += '⚠️ Sensor system not initialized';
        }

        return response;
    },

    async handleWeatherQuery() {
        let response = '🌤️ *Weather Forecast*\n\n';

        if (typeof Weather !== 'undefined' && Weather.forecastData) {
            const forecast = Weather.forecastData.slice(0, 3);

            forecast.forEach((day, i) => {
                const date = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `Day ${i + 1}`;
                response += `*${date}*\n`;
                response += `🌡️ ${Math.round(day.temp)}°C | ${day.condition}\n`;
                response += `💧 Rain: ${day.rain_probability}% | ${day.rainfall}mm\n\n`;
            });
        } else {
            response += '⚠️ Weather data unavailable';
        }

        return response;
    },

    async handleWaterCommand(params) {
        const zone = params.zone || 'all';
        const duration = params.duration || 15;

        if (typeof FarmControls !== 'undefined') {
            try {
                await FarmControls.startIrrigation(zone, duration);
                return `✅ *Irrigation Started*\n\nZone: ${zone}\nDuration: ${duration} minutes\n\nYou'll receive a notification when complete.`;
            } catch (error) {
                return `❌ Failed to start irrigation: ${error.message}`;
            }
        } else {
            return '⚠️ Irrigation system not available';
        }
    },

    async handlePumpCommand(action) {
        if (typeof FarmControls !== 'undefined') {
            try {
                if (action === 'on') {
                    await FarmControls.activatePump();
                    return '✅ *Water Pump Activated*\n\nPump is now running';
                } else {
                    await FarmControls.deactivatePump();
                    return '✅ *Water Pump Deactivated*\n\nPump has been turned off';
                }
            } catch (error) {
                return `❌ Failed to control pump: ${error.message}`;
            }
        } else {
            return '⚠️ Pump control system not available';
        }
    },

    handleHelpCommand() {
        let help = '📖 *Available Commands*\n\n';

        help += '*Status & Information:*\n';
        help += '• status - Farm overview\n';
        help += '• sensors - Sensor readings\n';
        help += '• weather - Weather forecast\n';
        help += '• alerts - Active alerts\n\n';

        help += '*Controls:*\n';
        help += '• water zone [1/2/3] - Start irrigation\n';
        help += '• water zone 1 for 20 min - Custom duration\n';
        help += '• pump on - Activate pump\n';
        help += '• pump off - Deactivate pump\n\n';

        help += '*Smart Features:*\n';
        help += '• schedule - Irrigation schedule\n';
        help += '• yield - Crop yield forecast\n\n';

        help += 'Example: "water zone 2 for 30 minutes"';

        return help;
    },

    async handleAlertsQuery() {
        const alertsCount = parseInt(document.getElementById('alerts-count')?.textContent || '0');

        if (alertsCount === 0) {
            return '✅ *No Active Alerts*\n\nAll systems normal';
        }

        let response = `🔔 *Active Alerts* (${alertsCount})\n\n`;

        // Get alert details if available
        const alertsList = document.querySelectorAll('.alert-item');
        if (alertsList.length > 0) {
            alertsList.forEach((alert, i) => {
                if (i < 5) { // Limit to 5 alerts
                    const text = alert.textContent.trim();
                    response += `${i + 1}. ${text}\n`;
                }
            });
        }

        return response;
    },

    async handleScheduleQuery() {
        if (typeof SmartScheduler !== 'undefined' && SmartScheduler.enabled) {
            const status = SmartScheduler.getStatus();

            let response = '📅 *Irrigation Schedule*\n\n';

            if (status.upcomingIrrigations > 0) {
                response += `Upcoming: ${status.upcomingIrrigations} irrigation(s)\n`;

                if (status.nextScheduled) {
                    response += `Next: ${status.nextScheduled.toLocaleString()}\n`;
                }

                response += `\n💧 Water Saved: ${status.waterSaved}L this month`;
            } else {
                response += 'No irrigations scheduled\n\nSmart scheduler will analyze conditions and schedule as needed.';
            }

            return response;
        } else {
            return '⚠️ Smart Scheduler is not enabled';
        }
    },

    async handleYieldQuery() {
        if (typeof YieldForecast !== 'undefined') {
            const summary = YieldForecast.getSummary();

            if (summary.hasData) {
                let response = '📊 *Yield Forecast*\n\n';
                response += `Crop: ${summary.crop}\n`;
                response += `Expected: ${summary.predictedYield.toLocaleString()} kg\n`;
                response += `Confidence: ${summary.confidence}%\n\n`;
                response += `💰 Revenue: ${summary.revenue.toLocaleString()} XAF\n`;
                response += `💵 Profit: ${summary.profit.toLocaleString()} XAF\n`;

                return response;
            } else {
                return '⚠️ No yield forecast available\n\nRun forecast analysis from dashboard first';
            }
        } else {
            return '⚠️ Yield Forecasting not initialized';
        }
    },

    // Send message via WhatsApp
    async sendMessage(text) {
        console.log('[INFO] Sending WhatsApp message:', text);

        // Store in history
        this.messageHistory.push({
            text: text,
            timestamp: new Date(),
            direction: 'outgoing'
        });

        try {
            // Send via backend API
            const response = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: this.phoneNumber,
                    message: text
                })
            });

            if (response.ok) {
                console.log('[SUCCESS] Message sent via WhatsApp');
                return true;
            }
        } catch (error) {
            // Backend not available - show in UI instead
            console.log('[INFO] Simulation mode - displaying message locally');
            this.showSimulatedMessage(text);
        }

        return false;
    },

    // Send notification
    async sendNotification(text) {
        if (!this.enabled || !this.sessionActive) return;

        await this.sendMessage(text);
    },

    // Show simulated message (for testing without backend)
    showSimulatedMessage(text) {
        if (typeof Notifications !== 'undefined') {
            Notifications.show(
                '📱 WhatsApp Bot',
                text.substring(0, 100),
                'info',
                5000
            );
        }

        // Update message history UI if available
        const historyContainer = document.getElementById('whatsapp-message-history');
        if (historyContainer) {
            const messageEl = document.createElement('div');
            messageEl.className = 'whatsapp-message outgoing';
            messageEl.innerHTML = `
                <div class="message-text">${text.replace(/\n/g, '<br>')}</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
            historyContainer.appendChild(messageEl);
            historyContainer.scrollTop = historyContainer.scrollHeight;
        }
    },

    // Save settings
    saveSettings() {
        localStorage.setItem('whatsapp-bot-settings', JSON.stringify({
            enabled: this.enabled,
            phoneNumber: this.phoneNumber
        }));
    },

    // Get status
    getStatus() {
        return {
            enabled: this.enabled,
            sessionActive: this.sessionActive,
            phoneNumber: this.phoneNumber,
            messageCount: this.messageHistory.length
        };
    },

    // Start monitoring for automated alerts
    startMonitoring() {
        if (!this.enabled) return;

        console.log('[INFO] Starting WhatsApp alert monitoring...');

        // Check water tank every 30 seconds
        setInterval(() => this.checkWaterTank(), 30000);

        // Check critical sensors every minute
        setInterval(() => this.checkCriticalSensors(), 60000);

        // Check equipment health every 5 minutes
        setInterval(() => this.checkEquipmentHealth(), 300000);

        // Check upcoming irrigation vs water level every hour
        setInterval(() => this.checkIrrigationReadiness(), 3600000);

        // Initial checks
        setTimeout(() => {
            this.checkWaterTank();
            this.checkCriticalSensors();
        }, 5000);
    },

    // Check water tank level
    async checkWaterTank() {
        if (!this.enabled || !this.sessionActive) return;

        // Simulate zone-aware water consumption (in real system, this would come from sensors)
        // Decrease water level based on pump usage and active zone
        if (typeof FarmControls !== 'undefined') {
            const pumpStatus = document.getElementById('pump-status-indicator')?.textContent;
            if (pumpStatus === 'ON' && this.waterTank.activeZone) {
                const zone = this.zones[this.waterTank.activeZone];
                if (zone) {
                    // Calculate consumption: area (ha) × flow rate (L/min/ha) × time elapsed (min)
                    const now = new Date();
                    const lastUpdate = this.waterTank.lastConsumptionUpdate || now;
                    const minutesElapsed = (now - lastUpdate) / 60000; // Convert ms to minutes

                    const consumptionRate = zone.area * zone.flowRate; // L/min
                    const waterUsed = consumptionRate * minutesElapsed;

                    this.waterTank.currentLevel = Math.max(0, this.waterTank.currentLevel - waterUsed);
                    this.waterTank.lastConsumptionUpdate = now;

                    console.log(`[INFO] Zone ${zone.name} consuming ${consumptionRate.toFixed(1)} L/min (${waterUsed.toFixed(1)}L used)`);
                }
            } else if (pumpStatus === 'OFF') {
                this.waterTank.activeZone = null;
                this.waterTank.lastConsumptionUpdate = null;
            }
        }

        this.waterTank.lastCheck = new Date();

        // Check if water is low
        const percentageRemaining = (this.waterTank.currentLevel / this.waterTank.capacity) * 100;

        // Critical low level (< 10%)
        if (percentageRemaining < 10 && !this.waterTank.lowLevelAlertSent) {
            const alertKey = `water-critical-${new Date().toDateString()}`;
            if (!this.alertsSent.has(alertKey)) {
                // Send via global alert system (Email, SMS, WhatsApp)
                if (typeof GlobalAlerts !== 'undefined') {
                    await GlobalAlerts.sendAlert({
                        alertType: 'Critical Water Tank Level',
                        severity: 'critical',
                        message: `Water tank almost empty! Current level: ${Math.round(this.waterTank.currentLevel)}L (${Math.round(percentageRemaining)}%). IMMEDIATE REFILL REQUIRED to avoid irrigation disruptions.`,
                        sensorData: {
                            current_level: `${Math.round(this.waterTank.currentLevel)}L`,
                            percentage: `${Math.round(percentageRemaining)}%`,
                            capacity: `${this.waterTank.capacity}L`
                        }
                    });
                }
                this.alertsSent.add(alertKey);
                this.waterTank.lowLevelAlertSent = true;
            }
        }
        // Low level warning (< 20%)
        else if (percentageRemaining < 20 && percentageRemaining >= 10) {
            const alertKey = `water-low-${new Date().toDateString()}`;
            if (!this.alertsSent.has(alertKey)) {
                // Send via global alert system
                if (typeof GlobalAlerts !== 'undefined') {
                    await GlobalAlerts.sendAlert({
                        alertType: 'Water Tank Low',
                        severity: 'warning',
                        message: `Water tank running low. Current level: ${Math.round(this.waterTank.currentLevel)}L (${Math.round(percentageRemaining)}%). Please plan to refill soon.`,
                        sensorData: {
                            current_level: `${Math.round(this.waterTank.currentLevel)}L`,
                            percentage: `${Math.round(percentageRemaining)}%`
                        }
                    });
                }
                this.alertsSent.add(alertKey);
            }
        }
        // Tank refilled - reset alert flag
        else if (percentageRemaining > 50) {
            this.waterTank.lowLevelAlertSent = false;
        }

        // Check if enough water for next scheduled irrigation
        await this.checkIrrigationReadiness();
    },

    // Check if enough water for next irrigation
    async checkIrrigationReadiness() {
        if (!this.enabled || !this.sessionActive) return;
        if (typeof SmartScheduler === 'undefined' || !SmartScheduler.enabled) return;

        const status = SmartScheduler.getStatus();
        if (!status.nextScheduled) return;

        // Estimate water needed (assume 500L per 15-minute irrigation)
        const waterNeededPerIrrigation = 500;
        const upcomingCount = status.upcomingIrrigations || 0;
        const totalWaterNeeded = waterNeededPerIrrigation * upcomingCount;

        if (this.waterTank.currentLevel < totalWaterNeeded) {
            const alertKey = `irrigation-insufficient-${new Date().toDateString()}`;
            if (!this.alertsSent.has(alertKey)) {
                const deficit = totalWaterNeeded - this.waterTank.currentLevel;

                await this.sendAlert(
                    '💧 *Insufficient Water for Scheduled Irrigation*\n\n' +
                    `Upcoming Irrigations: ${upcomingCount}\n` +
                    `Water Needed: ${totalWaterNeeded}L\n` +
                    `Current Level: ${Math.round(this.waterTank.currentLevel)}L\n` +
                    `Shortage: ${Math.round(deficit)}L\n\n` +
                    '📋 *Action Required:*\n' +
                    `Please refill the tank with at least ${Math.round(deficit)}L to complete scheduled irrigations.\n\n` +
                    `Next irrigation: ${new Date(status.nextScheduled).toLocaleString()}`,
                    'warning'
                );
                this.alertsSent.add(alertKey);
            }
        }
    },

    // Check critical sensor conditions
    async checkCriticalSensors() {
        if (!this.enabled || !this.sessionActive) return;
        if (typeof Dashboard === 'undefined') return;

        try {
            const sensors = await Dashboard.fetchSensorData();
            if (!sensors || sensors.length === 0) return;

            sensors.forEach(async (sensor, index) => {
                // Critical battery level (< 15%)
                if (sensor.battery < 15) {
                    const alertKey = `battery-low-sensor${index}-${new Date().toDateString()}`;
                    if (!this.alertsSent.has(alertKey)) {
                        await this.sendAlert(
                            `🔋 *Sensor Battery Critical*\n\n` +
                            `Sensor #${index + 1}\n` +
                            `Battery: ${Math.round(sensor.battery)}%\n\n` +
                            '⚠️ Sensor may stop reporting soon. Please replace battery.',
                            'warning'
                        );
                        this.alertsSent.add(alertKey);
                    }
                }

                // Critical soil moisture (< 25% - drought stress)
                if (sensor.soil_moisture < 25) {
                    const alertKey = `drought-sensor${index}-${new Date().toDateString()}`;
                    if (!this.alertsSent.has(alertKey)) {
                        await this.sendAlert(
                            `🌵 *Severe Drought Detected*\n\n` +
                            `Sensor #${index + 1}\n` +
                            `Soil Moisture: ${Math.round(sensor.soil_moisture)}%\n\n` +
                            '💧 Immediate irrigation recommended to prevent crop damage.',
                            'critical'
                        );
                        this.alertsSent.add(alertKey);
                    }
                }

                // Extreme temperature (> 38°C)
                if (sensor.temperature > 38) {
                    const alertKey = `heat-sensor${index}-${new Date().toDateString()}`;
                    if (!this.alertsSent.has(alertKey)) {
                        await this.sendAlert(
                            `🌡️ *Extreme Heat Alert*\n\n` +
                            `Sensor #${index + 1}\n` +
                            `Temperature: ${Math.round(sensor.temperature)}°C\n\n` +
                            '⚠️ High heat stress on crops. Consider additional irrigation or shade.',
                            'warning'
                        );
                        this.alertsSent.add(alertKey);
                    }
                }
            });
        } catch (error) {
            console.error('[ERROR] Failed to check sensors:', error);
        }
    },

    // Check equipment health
    async checkEquipmentHealth() {
        if (!this.enabled || !this.sessionActive) return;
        if (typeof PredictiveMaintenance === 'undefined') return;

        const tasks = PredictiveMaintenance.getMaintenanceTasks();

        tasks.forEach(async (task) => {
            if (task.priority === 'high') {
                const alertKey = `maintenance-${task.equipment}-${task.reason}`;
                if (!this.alertsSent.has(alertKey)) {
                    await this.sendAlert(
                        `🔧 *Urgent Maintenance Required*\n\n` +
                        `Equipment: ${task.equipment}\n` +
                        `Issue: ${task.reason}\n` +
                        `Priority: ${task.priority.toUpperCase()}\n\n` +
                        '⚠️ Please schedule maintenance to prevent equipment failure.',
                        'warning'
                    );
                    this.alertsSent.add(alertKey);
                }
            }
        });

        // Check pump health
        const pumpHealth = PredictiveMaintenance.equipment.pump;
        if (pumpHealth.health < 50) {
            const alertKey = `pump-health-${new Date().toDateString()}`;
            if (!this.alertsSent.has(alertKey)) {
                await this.sendAlert(
                    `💧 *Water Pump Health Declining*\n\n` +
                    `Health Score: ${pumpHealth.health}%\n` +
                    `Runtime: ${pumpHealth.runtime} hours\n\n` +
                    '🔧 Service recommended to prevent breakdown.',
                    'warning'
                );
                this.alertsSent.add(alertKey);
            }
        }
    },

    // Send alert (unified interface compatible with Email/SMS)
    async sendAlert({ alertType, severity, message, sensorData = null }) {
        if (!this.enabled || !this.sessionActive) {
            console.log('[INFO] WhatsApp alerts disabled, skipping send');
            return;
        }

        if (!this.phoneNumber) {
            console.log('[WARNING] No WhatsApp phone number configured');
            return;
        }

        // Map severity to icon
        let icon = 'ℹ️';
        if (severity === 'critical') icon = '🚨';
        else if (severity === 'warning') icon = '⚠️';
        else if (severity === 'success' || severity === 'info') icon = '✅';

        // Format message
        const timestamp = new Date().toLocaleTimeString();
        let formattedMessage = `${icon} *AgriConnect Alert*\n${timestamp}\n\n*${alertType}*\n\n${message}`;

        // Add sensor data if present
        if (sensorData) {
            formattedMessage += '\n\n📊 *Sensor Data:*\n';
            Object.entries(sensorData).forEach(([key, value]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                formattedMessage += `• ${label}: ${value}\n`;
            });
        }

        await this.sendMessage(formattedMessage);

        console.log(`[ALERT] ${severity.toUpperCase()} WhatsApp alert sent: ${alertType}`);
    },

    // Legacy alert method (for backward compatibility)
    async sendLegacyAlert(message, priority = 'info') {
        await this.sendAlert({
            alertType: 'System Alert',
            severity: priority,
            message: message
        });
    },

    // Manual water tank refill (called when user refills)
    refillWaterTank(amount) {
        this.waterTank.currentLevel = Math.min(
            this.waterTank.currentLevel + amount,
            this.waterTank.capacity
        );

        const percentage = (this.waterTank.currentLevel / this.waterTank.capacity) * 100;

        if (this.enabled && this.sessionActive) {
            this.sendAlert(
                `💧 *Water Tank Refilled*\n\n` +
                `Added: ${amount}L\n` +
                `Current Level: ${Math.round(this.waterTank.currentLevel)}L (${Math.round(percentage)}%)\n\n` +
                '✅ Tank is ready for irrigation.',
                'success'
            );
        }

        // Clear low level alerts
        this.waterTank.lowLevelAlertSent = false;

        console.log('[INFO] Water tank refilled:', amount, 'L');
    },

    // Calculate water needed for a zone and duration
    calculateWaterNeeded(zoneId, durationMinutes) {
        const zone = this.zones[zoneId];
        if (!zone) return 0;

        // Water needed = area (ha) × flow rate (L/min/ha) × duration (min)
        const waterNeeded = zone.area * zone.flowRate * durationMinutes;
        return Math.round(waterNeeded);
    },

    // Get current consumption rate
    getCurrentConsumptionRate() {
        if (!this.waterTank.activeZone) return 0;

        const zone = this.zones[this.waterTank.activeZone];
        if (!zone) return 0;

        return zone.area * zone.flowRate; // L/min
    },

    // Get water tank status
    getWaterTankStatus() {
        const percentage = (this.waterTank.currentLevel / this.waterTank.capacity) * 100;
        const consumptionRate = this.getCurrentConsumptionRate();

        return {
            currentLevel: Math.round(this.waterTank.currentLevel),
            capacity: this.waterTank.capacity,
            percentage: Math.round(percentage),
            lastCheck: this.waterTank.lastCheck,
            status: percentage < 10 ? 'critical' : percentage < 20 ? 'low' : percentage < 50 ? 'medium' : 'good',
            activeZone: this.waterTank.activeZone ? this.zones[this.waterTank.activeZone]?.name : null,
            consumptionRate: consumptionRate
        };
    }
};
