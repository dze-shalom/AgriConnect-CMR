/**
 * Disease Risk Analyzer Module
 * Analyzes environmental conditions to predict disease risks
 * Based on established disease models for tomato cultivation
 */

class DiseaseAnalyzer {
    constructor() {
        this.models = this.initializeModels();
    }
    
    initializeModels() {
        return {
            earlyBlight: {
                name: 'Early Blight (Alternaria solani)',
                conditions: {
                    tempMin: 24,
                    tempMax: 29,
                    humidityMin: 90,
                    leafWetnessHours: 2
                },
                severity: 'HIGH',
                actionThreshold: 0.7
            },
            lateBlight: {
                name: 'Late Blight (Phytophthora infestans)',
                conditions: {
                    tempMin: 10,
                    tempMax: 25,
                    humidityMin: 90,
                    leafWetnessHours: 10
                },
                severity: 'CRITICAL',
                actionThreshold: 0.6
            },
            septoriaLeafSpot: {
                name: 'Septoria Leaf Spot',
                conditions: {
                    tempMin: 15,
                    tempMax: 27,
                    humidityMin: 85,
                    leafWetnessHours: 48
                },
                severity: 'MEDIUM',
                actionThreshold: 0.7
            },
            powderyMildew: {
                name: 'Powdery Mildew',
                conditions: {
                    tempMin: 20,
                    tempMax: 30,
                    humidityMin: 50,
                    humidityMax: 70
                },
                severity: 'MEDIUM',
                actionThreshold: 0.6
            },
            bacterialSpot: {
                name: 'Bacterial Spot',
                conditions: {
                    tempMin: 24,
                    tempMax: 30,
                    humidityMin: 85
                },
                severity: 'HIGH',
                actionThreshold: 0.7
            },
            blossomEndRot: {
                name: 'Blossom End Rot (Physiological)',
                conditions: {
                    calciumDeficiency: true,
                    irregularWatering: true
                },
                severity: 'MEDIUM',
                actionThreshold: 0.5
            }
        };
    }
    
    analyze(sensorData) {
        const risks = [];
        
        // Check each disease model
        for (const [key, model] of Object.entries(this.models)) {
            const risk = this.evaluateDisease(key, model, sensorData);
            if (risk) {
                risks.push(risk);
            }
        }
        
        return risks;
    }
    
    evaluateDisease(diseaseKey, model, sensors) {
        const temp = sensors.airTemperature;
        const humidity = sensors.airHumidity;
        
        let probability = 0;
        let factorsMet = [];
        let factorsTotal = 0;
        
        // Temperature check
        if (model.conditions.tempMin !== undefined) {
            factorsTotal++;
            if (temp >= model.conditions.tempMin && temp <= model.conditions.tempMax) {
                factorsMet.push(`Temperature ${temp}C in risk range (${model.conditions.tempMin}-${model.conditions.tempMax}C)`);
                probability += 0.4;
            }
        }
        
        // Humidity check
        if (model.conditions.humidityMin !== undefined) {
            factorsTotal++;
            if (model.conditions.humidityMax) {
                // Range check (e.g., powdery mildew)
                if (humidity >= model.conditions.humidityMin && humidity <= model.conditions.humidityMax) {
                    factorsMet.push(`Humidity ${humidity}% in risk range (${model.conditions.humidityMin}-${model.conditions.humidityMax}%)`);
                    probability += 0.4;
                }
            } else {
                // Minimum check (most diseases)
                if (humidity >= model.conditions.humidityMin) {
                    factorsMet.push(`Humidity ${humidity}% above threshold (${model.conditions.humidityMin}%)`);
                    probability += 0.4;
                }
            }
        }
        
        // Leaf wetness estimation (based on high humidity duration)
        if (model.conditions.leafWetnessHours && humidity > 95) {
            factorsTotal++;
            factorsMet.push('Leaf wetness likely (humidity >95%)');
            probability += 0.2;
        }
        
        // Blossom End Rot special checks
        if (diseaseKey === 'blossomEndRot') {
            if (sensors.soilMoisture !== undefined) {
                factorsTotal++;
                // Check for irregular moisture (simplified - would need historical data)
                if (sensors.soilMoisture < 350 || sensors.soilMoisture > 600) {
                    factorsMet.push(`Soil moisture irregular (${sensors.soilMoisture})`);
                    probability += 0.5;
                }
            }
        }
        
        // Only return if probability exceeds action threshold
        if (probability >= model.actionThreshold) {
            return {
                disease: model.name,
                severity: model.severity,
                probability: Math.round(probability * 100),
                factorsMet: factorsMet,
                recommendation: this.getRecommendation(diseaseKey),
                timestamp: new Date().toISOString()
            };
        }
        
        return null;
    }
    
    getRecommendation(diseaseKey) {
        const recommendations = {
            earlyBlight: 'Apply copper-based fungicide. Remove affected leaves. Improve air circulation.',
            lateBlight: 'URGENT: Apply systemic fungicide immediately. Monitor surrounding zones. Consider preventive treatment.',
            septoriaLeafSpot: 'Apply fungicide. Remove lower leaves. Mulch to prevent soil splash.',
            powderyMildew: 'Apply sulfur or neem oil. Increase air circulation. Reduce humidity if possible.',
            bacterialSpot: 'Apply copper bactericide. Avoid overhead watering. Remove affected tissue.',
            blossomEndRot: 'Apply calcium spray. Maintain consistent watering schedule. Check soil pH (target 6.0-6.8).'
        };
        
        return recommendations[diseaseKey] || 'Consult agricultural extension for treatment options.';
    }
}

module.exports = DiseaseAnalyzer;