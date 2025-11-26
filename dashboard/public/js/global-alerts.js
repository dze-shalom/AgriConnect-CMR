/**
 * Global Alerts Module
 * Central alert dispatcher that sends notifications to ALL enabled channels:
 * - Email
 * - SMS
 * - WhatsApp
 */

const GlobalAlerts = {
    // Send alert to all enabled channels
    async sendAlert({ alertType, severity, message, sensorData = null }) {
        console.log(`[GLOBAL ALERT] Dispatching ${severity} alert: ${alertType}`);

        const results = {
            email: null,
            sms: null,
            whatsapp: null
        };

        // Send to Email if enabled
        if (typeof EmailAlerts !== 'undefined' && EmailAlerts.enabled) {
            try {
                results.email = await EmailAlerts.sendAlert({
                    alertType,
                    severity,
                    message,
                    sensorData
                });
                console.log('[SUCCESS] Email alert sent');
            } catch (error) {
                console.error('[ERROR] Email alert failed:', error);
            }
        }

        // Send to SMS if enabled
        if (typeof SMSAlerts !== 'undefined' && SMSAlerts.enabled) {
            try {
                results.sms = await SMSAlerts.sendAlert({
                    alertType,
                    severity,
                    message,
                    sensorData
                });
                console.log('[SUCCESS] SMS alert sent');
            } catch (error) {
                console.error('[ERROR] SMS alert failed:', error);
            }
        }

        // Send to WhatsApp if enabled
        if (typeof WhatsAppBot !== 'undefined' && WhatsAppBot.enabled && WhatsAppBot.sessionActive) {
            try {
                results.whatsapp = await WhatsAppBot.sendAlert({
                    alertType,
                    severity,
                    message,
                    sensorData
                });
                console.log('[SUCCESS] WhatsApp alert sent');
            } catch (error) {
                console.error('[ERROR] WhatsApp alert failed:', error);
            }
        }

        return results;
    },

    // Convenience methods for specific alert types
    async sendCriticalTemperatureAlert(temperature, threshold) {
        await this.sendAlert({
            alertType: 'Critical Temperature Alert',
            severity: 'critical',
            message: `Temperature has reached ${temperature.toFixed(1)}°C, exceeding the threshold of ${threshold}°C. Immediate attention required!`,
            sensorData: { air_temperature: `${temperature.toFixed(1)}°C` }
        });
    },

    async sendLowBatteryAlert(batteryLevel, nodeId) {
        await this.sendAlert({
            alertType: 'Low Battery Alert',
            severity: 'warning',
            message: `Sensor node ${nodeId} battery is critically low at ${batteryLevel}%. Please replace batteries soon to avoid data loss.`,
            sensorData: {
                battery_level: `${batteryLevel}%`,
                node_id: nodeId
            }
        });
    },

    async sendDrySoilAlert(soilMoisture, threshold) {
        await this.sendAlert({
            alertType: 'Dry Soil Alert',
            severity: 'warning',
            message: `Soil moisture has dropped to ${soilMoisture}, below the optimal threshold of ${threshold}. Irrigation recommended.`,
            sensorData: {
                soil_moisture: soilMoisture,
                threshold: threshold
            }
        });
    },

    async sendEquipmentAlert(equipment, issue, priority) {
        await this.sendAlert({
            alertType: `${equipment} Maintenance Required`,
            severity: priority === 'high' ? 'critical' : 'warning',
            message: `${equipment}: ${issue}. Please schedule maintenance to prevent equipment failure.`,
            sensorData: {
                equipment: equipment,
                issue: issue,
                priority: priority
            }
        });
    },

    async sendWeatherAlert(condition, details) {
        await this.sendAlert({
            alertType: 'Weather Alert',
            severity: 'warning',
            message: `${condition}: ${details}`,
            sensorData: {
                weather_condition: condition
            }
        });
    }
};
