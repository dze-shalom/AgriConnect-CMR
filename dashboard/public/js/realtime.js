/**
 * Real-time Updates Module
 * Uses Supabase Realtime for live sensor data updates
 */

const Realtime = {
    channel: null,
    isConnected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    audioContext: null, // Reuse AudioContext
    updateQueue: [], // Batch updates
    isProcessingQueue: false,

    // Initialize real-time subscriptions
    init() {
        console.log('[INFO] Initializing real-time updates...');

        if (!window.supabase) {
            console.error('[ERROR] Supabase client not initialized');
            return;
        }

        // Create shared AudioContext
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Create throttled update functions
        this.throttledDashboardUpdate = PerformanceUtils.rafThrottle(
            (reading) => this._updateDashboard(reading)
        );
        this.throttledChartUpdate = PerformanceUtils.throttle(
            (reading) => this._updateCharts(reading),
            2000 // Update charts max once per 2 seconds
        );
        this.throttledMapUpdate = PerformanceUtils.rafThrottle(
            (reading) => this._updateMap(reading)
        );

        this.subscribeToSensorReadings();
        this.subscribeToAlerts();
        this.subscribeToControlCommands();

        console.log('[SUCCESS] Real-time module initialized');
    },

    // Subscribe to sensor readings table
    subscribeToSensorReadings() {
        console.log('[INFO] Subscribing to sensor readings...');

        // Create channel for sensor_readings table
        this.channel = window.supabase
            .channel('sensor_readings_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'sensor_readings'
                },
                (payload) => this.handleNewSensorReading(payload.new)
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'sensor_readings'
                },
                (payload) => this.handleUpdatedSensorReading(payload.new)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    console.log('[SUCCESS] Subscribed to sensor readings');

                    if (typeof Notifications !== 'undefined') {
                        Notifications.success(
                            'Real-time Connected',
                            'Live sensor updates active'
                        );
                    }
                } else if (status === 'CLOSED') {
                    this.isConnected = false;
                    console.log('[WARNING] Real-time connection closed');
                    this.handleDisconnect();
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[ERROR] Real-time channel error');
                    this.handleError();
                }
            });
    },

    // Subscribe to alerts table
    subscribeToAlerts() {
        console.log('[INFO] Subscribing to alerts...');

        window.supabase
            .channel('alerts_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'alerts'
                },
                (payload) => this.handleNewAlert(payload.new)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[SUCCESS] Subscribed to alerts');
                }
            });
    },

    // Subscribe to control commands table
    subscribeToControlCommands() {
        console.log('[INFO] Subscribing to control commands...');

        window.supabase
            .channel('pump_commands_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pump_control_commands'
                },
                (payload) => this.handleControlCommand(payload)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[SUCCESS] Subscribed to control commands');
                }
            });
    },

    // Handle new sensor reading
    handleNewSensorReading(reading) {
        console.log('[REALTIME] New sensor reading received:', reading);

        // Use throttled updates to prevent performance issues
        this.throttledDashboardUpdate(reading);
        this.throttledChartUpdate(reading);
        this.throttledMapUpdate(reading);

        // Check for threshold violations (throttled)
        if (!this._throttledThresholdCheck) {
            this._throttledThresholdCheck = PerformanceUtils.throttle(
                (r) => this.checkThresholds(r),
                5000 // Check thresholds max once per 5 seconds
            );
        }
        this._throttledThresholdCheck(reading);

        // Show live indicator (throttled)
        if (!this._throttledLiveIndicator) {
            this._throttledLiveIndicator = PerformanceUtils.throttle(
                () => this.showLiveIndicator(),
                1000
            );
        }
        this._throttledLiveIndicator();
    },

    // Helper: Update dashboard (called by throttled function)
    _updateDashboard(reading) {
        if (typeof Dashboard !== 'undefined') {
            Dashboard.updateSingleReading(reading);
        }
    },

    // Helper: Update charts (called by throttled function)
    _updateCharts(reading) {
        if (typeof Charts !== 'undefined' && typeof Charts.addDataPoint === 'function') {
            Charts.addDataPoint(reading);
        }
    },

    // Helper: Update map (called by throttled function)
    _updateMap(reading) {
        if (typeof FarmMap !== 'undefined') {
            FarmMap.updateNodeStatus(reading);
        }
    },

    // Handle updated sensor reading
    handleUpdatedSensorReading(reading) {
        console.log('[REALTIME] Sensor reading updated:', reading);

        // Same handling as new reading
        this.handleNewSensorReading(reading);
    },

    // Handle new alert
    handleNewAlert(alert) {
        console.log('[REALTIME] New alert received:', alert);

        // Show toast notification
        if (typeof Notifications !== 'undefined') {
            const severity = alert.severity || 'warning';
            const icon = severity === 'critical' ? 'alert-triangle' :
                        severity === 'warning' ? 'alert-circle' : 'info';

            Notifications[severity === 'critical' ? 'error' : 'warning'](
                `${alert.alert_type} Alert`,
                alert.message
            );
        }

        // Update alerts badge
        if (typeof Navigation !== 'undefined') {
            Navigation.incrementAlertsBadge();
        }

        // Trigger browser push notification
        if (CONFIG.pushNotifications.enabled && Notification.permission === 'granted') {
            this.sendBrowserNotification(
                `${alert.alert_type} Alert`,
                alert.message,
                'alert'
            );
        }

        // Play alert sound
        this.playAlertSound(alert.severity);
    },

    // Handle control command updates
    handleControlCommand(payload) {
        console.log('[REALTIME] Control command update:', payload);

        // Refresh controls display
        if (typeof FarmControls !== 'undefined') {
            FarmControls.refreshCommands();
        }
    },

    // Check sensor thresholds
    checkThresholds(reading) {
        const thresholds = CONFIG.sensorThresholds;
        const violations = [];

        // Check air temperature
        if (reading.air_temperature) {
            if (reading.air_temperature < thresholds.airTemperature.min) {
                violations.push(`Low temperature: ${reading.air_temperature}°C`);

                // Send email for critical temperature
                if (reading.air_temperature < 15 && typeof EmailAlerts !== 'undefined') {
                    EmailAlerts.sendCriticalTemperatureAlert(reading.air_temperature, 15);
                }

                // Send SMS for extreme temperature
                if (reading.air_temperature < 10 && typeof SMSAlerts !== 'undefined') {
                    SMSAlerts.sendCriticalTemperatureAlert(reading.air_temperature, 10);
                }
            } else if (reading.air_temperature > thresholds.airTemperature.max) {
                violations.push(`High temperature: ${reading.air_temperature}°C`);

                // Send email for critical temperature
                if (reading.air_temperature > 35 && typeof EmailAlerts !== 'undefined') {
                    EmailAlerts.sendCriticalTemperatureAlert(reading.air_temperature, 35);
                }

                // Send SMS for extreme temperature
                if (reading.air_temperature > 40 && typeof SMSAlerts !== 'undefined') {
                    SMSAlerts.sendCriticalTemperatureAlert(reading.air_temperature, 40);
                }
            }
        }

        // Check air humidity
        if (reading.air_humidity) {
            if (reading.air_humidity < thresholds.airHumidity.min) {
                violations.push(`Low humidity: ${reading.air_humidity}%`);
            } else if (reading.air_humidity > thresholds.airHumidity.max) {
                violations.push(`High humidity: ${reading.air_humidity}%`);
            }
        }

        // Check soil moisture
        if (reading.soil_moisture) {
            if (reading.soil_moisture < thresholds.soilMoisture.min) {
                violations.push(`Low soil moisture: ${reading.soil_moisture}`);

                // Send email for critically dry soil
                if (reading.soil_moisture < 300 && typeof EmailAlerts !== 'undefined') {
                    EmailAlerts.sendDrySoilAlert(reading.soil_moisture, thresholds.soilMoisture.min);
                }

                // Send SMS for severely dry soil
                if (reading.soil_moisture < 250 && typeof SMSAlerts !== 'undefined') {
                    SMSAlerts.sendDrySoilAlert(reading.soil_moisture, 250);
                }
            } else if (reading.soil_moisture > thresholds.soilMoisture.max) {
                violations.push(`High soil moisture: ${reading.soil_moisture}`);
            }
        }

        // Check battery level
        if (reading.battery_level && reading.battery_level < 15) {
            violations.push(`Low battery: ${reading.battery_level}%`);

            // Send email for low battery
            if (typeof EmailAlerts !== 'undefined') {
                const nodeId = `Field ${reading.field_id} - Zone ${reading.zone_id}`;
                EmailAlerts.sendLowBatteryAlert(reading.battery_level, nodeId);
            }

            // Send SMS for critical battery
            if (reading.battery_level < 10 && typeof SMSAlerts !== 'undefined') {
                const nodeId = `Field ${reading.field_id} - Zone ${reading.zone_id}`;
                SMSAlerts.sendLowBatteryAlert(reading.battery_level, nodeId);
            }
        }

        // Show notifications for violations (with rate limiting)
        if (violations.length > 0) {
            violations.forEach(violation => {
                const notificationKey = `threshold_${violation.substring(0, 20)}`;
                if (typeof Notifications !== 'undefined' &&
                    PerformanceUtils.NotificationLimiter.canNotify(notificationKey, 60000)) {
                    Notifications.warning('Threshold Alert', violation);
                }
            });
        }
    },

    // Check if notification should be sent
    checkForNotification(reading) {
        const thresholds = CONFIG.sensorThresholds;
        let shouldNotify = false;
        let title = 'Sensor Alert';
        let message = '';

        // Critical temperature
        if (reading.air_temperature) {
            if (reading.air_temperature > thresholds.airTemperature.max + 5) {
                shouldNotify = true;
                title = 'Critical Temperature Alert';
                message = `Extreme high temperature: ${reading.air_temperature}°C`;
            } else if (reading.air_temperature < thresholds.airTemperature.min - 5) {
                shouldNotify = true;
                title = 'Critical Temperature Alert';
                message = `Extreme low temperature: ${reading.air_temperature}°C`;
            }
        }

        // Critical soil moisture
        if (reading.soil_moisture && reading.soil_moisture < thresholds.soilMoisture.min - 100) {
            shouldNotify = true;
            title = 'Critical Soil Moisture Alert';
            message = `Very dry soil detected: ${reading.soil_moisture}`;
        }

        // Low battery
        if (reading.battery_level && reading.battery_level < 15) {
            shouldNotify = true;
            title = 'Low Battery Alert';
            message = `Sensor battery low: ${reading.battery_level}%`;
        }

        if (shouldNotify && Notification.permission === 'granted') {
            this.sendBrowserNotification(title, message, 'warning');
        }
    },

    // Send browser push notification
    sendBrowserNotification(title, body, type = 'info') {
        if (Notification.permission !== 'granted') return;

        const icon = type === 'alert' ? '[ALERT]' : type === 'warning' ? '[WARNING]' : '[INFO]';

        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `agriconnect-${type}`,
            renotify: true,
            requireInteraction: type === 'alert',
            vibrate: type === 'alert' ? [200, 100, 200] : [100]
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    },

    // Play alert sound (using shared AudioContext)
    playAlertSound(severity = 'warning') {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Set frequency based on severity
            oscillator.frequency.value = severity === 'critical' ? 800 : 600;
            oscillator.type = 'sine';

            // Set volume
            gainNode.gain.value = 0.3;

            // Play sound
            const now = this.audioContext.currentTime;
            oscillator.start(now);
            oscillator.stop(now + 0.2);

            // Play again for critical alerts
            if (severity === 'critical') {
                setTimeout(() => {
                    const osc2 = this.audioContext.createOscillator();
                    const gain2 = this.audioContext.createGain();
                    osc2.connect(gain2);
                    gain2.connect(this.audioContext.destination);
                    osc2.frequency.value = 800;
                    osc2.type = 'sine';
                    gain2.gain.value = 0.3;
                    osc2.start(this.audioContext.currentTime);
                    osc2.stop(this.audioContext.currentTime + 0.2);
                }, 300);
            }
        } catch (error) {
            console.error('[ERROR] Failed to play alert sound:', error);
        }
    },

    // Show live indicator
    showLiveIndicator() {
        const indicator = document.getElementById('live-indicator');
        if (!indicator) return;

        indicator.classList.add('pulse');
        setTimeout(() => {
            indicator.classList.remove('pulse');
        }, 1000);
    },

    // Handle disconnect
    handleDisconnect() {
        console.log('[WARNING] Real-time connection lost. Attempting to reconnect...');

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.init();
            }, 5000 * this.reconnectAttempts); // Exponential backoff
        } else {
            if (typeof Notifications !== 'undefined') {
                Notifications.error(
                    'Connection Lost',
                    'Real-time updates unavailable. Refresh the page.'
                );
            }
        }
    },

    // Handle errors
    handleError() {
        console.error('[ERROR] Real-time channel error occurred');
        this.handleDisconnect();
    },

    // Cleanup
    destroy() {
        if (this.channel) {
            window.supabase.removeChannel(this.channel);
            this.channel = null;
            this.isConnected = false;
            console.log('[INFO] Real-time subscriptions closed');
        }
    }
};
