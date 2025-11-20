/**
 * Anomaly Detection Module
 * Identifies unusual sensor readings that may indicate
 * sensor malfunction or genuine environmental issues
 */

class AnomalyDetector {
    constructor() {
        // Define normal ranges for sensors
        this.normalRanges = {
            airTemperature: { min: 5, max: 45, name: 'Air Temperature' },
            airHumidity: { min: 10, max: 100, name: 'Air Humidity' },
            soilMoisture: { min: 100, max: 900, name: 'Soil Moisture' },
            soilTemperature: { min: 10, max: 40, name: 'Soil Temperature' },
            phValue: { min: 3.0, max: 10.0, name: 'pH' },
            ecValue: { min: 0.5, max: 8.0, name: 'EC' },
            nitrogenPPM: { min: 0, max: 500, name: 'Nitrogen' },
            phosphorusPPM: { min: 0, max: 200, name: 'Phosphorus' },
            potassiumPPM: { min: 0, max: 800, name: 'Potassium' },
            lightIntensity: { min: 0, max: 120000, name: 'Light Intensity' },
            parValue: { min: 0, max: 2000, name: 'PAR' },
            batteryLevel: { min: 0, max: 100, name: 'Battery' }
        };
        
        // Optimal ranges (stricter)
        this.optimalRanges = {
            airTemperature: { min: 18, max: 30 },
            airHumidity: { min: 60, max: 80 },
            soilMoisture: { min: 400, max: 600 },
            phValue: { min: 6.0, max: 7.0 },
            ecValue: { min: 2.0, max: 3.5 }
        };
    }
    
    detect(sensors, context) {
        const anomalies = [];
        
        // Check each sensor against normal ranges
        for (const [sensor, range] of Object.entries(this.normalRanges)) {
            const value = sensors[sensor];
            
            if (value === undefined || value === null) continue;
            
            // Out of normal range - likely sensor error
            if (value < range.min || value > range.max) {
                anomalies.push({
                    sensor: range.name,
                    value: value,
                    expected: `${range.min} - ${range.max}`,
                    severity: 'CRITICAL',
                    type: 'OUT_OF_RANGE',
                    message: `${range.name} reading ${value} is outside valid range`,
                    diagnosis: 'Possible sensor malfunction or calibration error',
                    action: `Check ${range.name} sensor connections and calibration`,
                    context: context
                });
            }
            // Within normal but outside optimal
            else if (this.optimalRanges[sensor]) {
                const optimal = this.optimalRanges[sensor];
                if (value < optimal.min || value > optimal.max) {
                    anomalies.push({
                        sensor: range.name,
                        value: value,
                        expected: `${optimal.min} - ${optimal.max} (optimal)`,
                        severity: 'WARNING',
                        type: 'SUBOPTIMAL',
                        message: `${range.name} reading ${value} is suboptimal`,
                        diagnosis: 'Within safe range but not ideal for plant growth',
                        action: this.getOptimizationAdvice(sensor, value, optimal),
                        context: context
                    });
                }
            }
        }
        
        // Cross-sensor validation
        const crossChecks = this.crossValidate(sensors);
        anomalies.push(...crossChecks);
        
        return anomalies;
    }
    
    crossValidate(sensors) {
        const issues = [];
        
        // Check 1: Soil temp should be close to air temp (within 10C)
        if (sensors.airTemperature && sensors.soilTemperature) {
            const diff = Math.abs(sensors.airTemperature - sensors.soilTemperature);
            if (diff > 15) {
                issues.push({
                    sensor: 'Temperature Correlation',
                    value: `Air: ${sensors.airTemperature}C, Soil: ${sensors.soilTemperature}C`,
                    severity: 'WARNING',
                    type: 'CORRELATION',
                    message: `Unusual temperature difference: ${diff.toFixed(1)}C`,
                    diagnosis: 'Soil and air temperatures normally differ by <10C',
                    action: 'Check both temperature sensors for accuracy'
                });
            }
        }
        
        // Check 2: High humidity + high temp = disease risk (already flagged elsewhere)
        // This is validation, not duplicate alert
        
        // Check 3: Low battery warning
        if (sensors.batteryLevel !== undefined && sensors.batteryLevel < 20) {
            issues.push({
                sensor: 'Battery',
                value: `${sensors.batteryLevel}%`,
                severity: 'WARNING',
                type: 'LOW_BATTERY',
                message: `Battery level critically low: ${sensors.batteryLevel}%`,
                diagnosis: 'Node may shut down soon',
                action: 'Replace or recharge battery within 24 hours'
            });
        }
        
        // Check 4: Impossible NPK combinations
        if (sensors.nitrogenPPM && sensors.phosphorusPPM && sensors.potassiumPPM) {
            const total = sensors.nitrogenPPM + sensors.phosphorusPPM + sensors.potassiumPPM;
            if (total > 1000) {
                issues.push({
                    sensor: 'NPK Sensor',
                    value: `Total: ${total} ppm`,
                    severity: 'WARNING',
                    type: 'SUSPICIOUS',
                    message: 'Unusually high total NPK reading',
                    diagnosis: 'May indicate sensor calibration issue',
                    action: 'Recalibrate NPK sensor or verify with soil test'
                });
            }
        }
        
        return issues;
    }
    
    getOptimizationAdvice(sensor, currentValue, optimal) {
        const advice = {
            airTemperature: currentValue < optimal.min 
                ? 'Consider adding heating or improving insulation'
                : 'Improve ventilation or add shading',
            airHumidity: currentValue < optimal.min
                ? 'Increase misting or reduce ventilation'
                : 'Improve air circulation or reduce watering frequency',
            soilMoisture: currentValue < optimal.min
                ? 'Increase irrigation frequency or duration'
                : 'Reduce watering or improve drainage',
            phValue: currentValue < optimal.min
                ? 'Add lime to raise pH'
                : 'Add sulfur to lower pH',
            ecValue: currentValue < optimal.min
                ? 'Increase fertilizer concentration'
                : 'Flush soil with water to reduce salt buildup'
        };
        
        return advice[sensor] || 'Adjust conditions to reach optimal range';
    }
}

module.exports = AnomalyDetector;