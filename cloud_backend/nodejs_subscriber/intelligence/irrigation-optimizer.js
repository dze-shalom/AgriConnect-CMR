/**
 * Irrigation Optimization Module
 * Provides intelligent irrigation recommendations based on
 * soil moisture, VPD, and environmental conditions
 */

class IrrigationOptimizer {
    constructor() {
        this.thresholds = {
            moistureCritical: 350,
            moistureLow: 400,
            moistureOptimal: 500,
            moistureHigh: 650,
            
            tempHigh: 30,
            vpdHigh: 1.5,
            vpdLow: 0.4
        };
    }
    
    optimize(sensors, systemStatus) {
        const moisture = sensors.soilMoisture;
        const temp = sensors.airTemperature;
        const humidity = sensors.airHumidity;
        
        // Calculate VPD (Vapor Pressure Deficit)
        const vpd = this.calculateVPD(temp, humidity);
        
        // Determine irrigation need
        let recommendation = 'NORMAL';
        let action = null;
        let reason = [];
        let duration = 0;
        
        // Critical low moisture
        if (moisture < this.thresholds.moistureCritical) {
            recommendation = 'URGENT';
            action = 'Irrigate immediately';
            duration = this.calculateDuration(moisture, this.thresholds.moistureOptimal);
            reason.push(`Soil moisture critically low (${moisture})`);
            
            if (temp > this.thresholds.tempHigh) {
                reason.push(`High temperature stress (${temp}C)`);
                duration += 5; // Extra time for heat
            }
        }
        // Low moisture
        else if (moisture < this.thresholds.moistureLow) {
            recommendation = 'NEEDED';
            
            // Check time of day (prefer evening watering)
            const hour = new Date().getHours();
            if (hour >= 6 && hour <= 16) {
                action = 'Schedule irrigation for evening (after 5 PM)';
                reason.push('Avoid midday evaporation');
            } else {
                action = 'Irrigate now';
            }
            
            duration = this.calculateDuration(moisture, this.thresholds.moistureOptimal);
            reason.push(`Soil moisture low (${moisture})`);
        }
        // Optimal moisture
        else if (moisture >= this.thresholds.moistureLow && moisture <= this.thresholds.moistureHigh) {
            recommendation = 'OPTIMAL';
            action = 'No irrigation needed';
            reason.push(`Soil moisture optimal (${moisture})`);
        }
        // High moisture
        else if (moisture > this.thresholds.moistureHigh) {
            recommendation = 'EXCESS';
            action = 'Do NOT water - risk of root rot';
            reason.push(`Soil moisture too high (${moisture})`);
        }
        
        // VPD considerations
        if (vpd > this.thresholds.vpdHigh) {
            reason.push(`High VPD (${vpd.toFixed(2)} kPa) - plants transpiring heavily`);
        } else if (vpd < this.thresholds.vpdLow) {
            reason.push(`Low VPD (${vpd.toFixed(2)} kPa) - reduced water uptake`);
        }
        
        return {
            recommendation: recommendation,
            action: action,
            duration: duration,
            reason: reason.join('. '),
            vpd: vpd.toFixed(2),
            currentMoisture: moisture,
            targetMoisture: this.thresholds.moistureOptimal,
            timestamp: new Date().toISOString()
        };
    }
    
    calculateVPD(temperature, relativeHumidity) {
        // Saturation vapor pressure (kPa)
        const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
        
        // Actual vapor pressure (kPa)
        const avp = svp * (relativeHumidity / 100);
        
        // VPD (kPa)
        const vpd = svp - avp;
        
        return vpd;
    }
    
    calculateDuration(currentMoisture, targetMoisture) {
        // Simplified calculation - assumes flow rate
        // In production, this would use actual system calibration
        const deficit = targetMoisture - currentMoisture;
        
        if (deficit <= 0) return 0;
        
        // Rough estimate: 1 minute per 10 units deficit
        // Adjust based on your actual system
        const minutes = Math.ceil(deficit / 10);
        
        return Math.min(minutes, 30); // Cap at 30 minutes
    }
}

module.exports = IrrigationOptimizer;