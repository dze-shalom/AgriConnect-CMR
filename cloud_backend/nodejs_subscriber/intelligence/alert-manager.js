/**
 * Alert Management Module
 * Processes all insights and generates prioritized alerts
 * Stores alerts in database and prevents duplicate alerts
 */

class AlertManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.recentAlerts = new Map(); // For deduplication
        this.alertCooldown = 3600000; // 1 hour in milliseconds
    }
    
    async processInsights(insights, context) {
        const alerts = [];
        
        // Process disease risks
        for (const disease of insights.diseases) {
            const alert = {
                farm_id: context.farmId,
                gateway_id: context.gatewayId,
                field_id: context.fieldId,
                zone_id: context.zoneId,
                alert_type: 'disease_risk',
                severity: this.mapSeverity(disease.severity),
                message: `${disease.disease} detected (${disease.probability}% probability). ${disease.recommendation}`,
                acknowledged: false
            };
            
            if (this.shouldCreateAlert(alert)) {
                alerts.push(alert);
            }
        }
        
        // Process irrigation recommendations
        if (insights.irrigation && insights.irrigation.recommendation === 'URGENT') {
            const alert = {
                farm_id: context.farmId,
                gateway_id: context.gatewayId,
                field_id: context.fieldId,
                zone_id: context.zoneId,
                alert_type: 'irrigation_urgent',
                severity: 'critical',
                message: `Urgent irrigation needed: ${insights.irrigation.reason}. ${insights.irrigation.action}`,
                acknowledged: false
            };
            
            if (this.shouldCreateAlert(alert)) {
                alerts.push(alert);
            }
        }
        
        // Process anomalies
        for (const anomaly of insights.anomalies) {
            const alert = {
                farm_id: context.farmId,
                gateway_id: context.gatewayId,
                field_id: context.fieldId,
                zone_id: context.zoneId,
                alert_type: anomaly.type.toLowerCase(),
                severity: this.mapSeverity(anomaly.severity),
                message: `${anomaly.message}. ${anomaly.action}`,
                acknowledged: false
            };
            
            if (this.shouldCreateAlert(alert)) {
                alerts.push(alert);
            }
        }
        
        // Process nutrient issues
        for (const nutrient of insights.nutrients) {
            const alert = {
                farm_id: context.farmId,
                gateway_id: context.gatewayId,
                field_id: context.fieldId,
                zone_id: context.zoneId,
                alert_type: 'nutrient_deficiency',
                severity: this.mapSeverity(nutrient.severity),
                message: `${nutrient.nutrient} level ${nutrient.status}: ${nutrient.current} ppm (target: ${nutrient.target})`,
                acknowledged: false
            };
            
            if (this.shouldCreateAlert(alert)) {
                alerts.push(alert);
            }
        }
        
        // Store alerts in database
        if (alerts.length > 0) {
            await this.storeAlerts(alerts);
            console.log(`[ALERT] ${alerts.length} alert(s) generated and stored`);
        } else {
            console.log('[INFO] No alerts generated - conditions normal');
        }
    }
    
    shouldCreateAlert(alert) {
        // Create unique key for deduplication
        const key = `${alert.farm_id}_${alert.gateway_id}_${alert.field_id}_${alert.zone_id}_${alert.alert_type}`;
        
        const now = Date.now();
        const lastAlert = this.recentAlerts.get(key);
        
        // Check cooldown period
        if (lastAlert && (now - lastAlert) < this.alertCooldown) {
            return false; // Skip duplicate alert
        }
        
        // Update last alert time
        this.recentAlerts.set(key, now);
        
        return true;
    }
    
    async storeAlerts(alerts) {
        try {
            const { data, error } = await this.supabase
                .from('alerts')
                .insert(alerts)
                .select();
            
            if (error) {
                console.error('[ERROR] Failed to store alerts:', error.message);
                return false;
            }
            
            // Log each alert
            data.forEach(alert => {
                const severity = alert.severity.toUpperCase();
                const prefix = severity === 'CRITICAL' ? '[CRITICAL]' : 
                              severity === 'WARNING' ? '[WARNING]' : '[INFO]';
                console.log(`${prefix} ${alert.message}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('[ERROR] Exception storing alerts:', error.message);
            return false;
        }
    }
    
    mapSeverity(inputSeverity) {
        const severityMap = {
            'CRITICAL': 'critical',
            'HIGH': 'critical',
            'MEDIUM': 'warning',
            'WARNING': 'warning',
            'LOW': 'info',
            'INFO': 'info'
        };
        
        return severityMap[inputSeverity] || 'info';
    }
    
    // Clean up old alerts from memory (run periodically)
    cleanupOldAlerts() {
        const now = Date.now();
        for (const [key, timestamp] of this.recentAlerts.entries()) {
            if (now - timestamp > this.alertCooldown) {
                this.recentAlerts.delete(key);
            }
        }
    }
}

module.exports = AlertManager;