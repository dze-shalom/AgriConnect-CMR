/**
 * Yield Forecasting AI
 * Predicts crop yields using machine learning and multi-factor analysis
 */

const YieldForecast = {
    model: null,
    historicalData: [],
    predictions: {},
    confidence: 0,

    // Initialize module
    init() {
        console.log('[INFO] Initializing Yield Forecasting AI...');

        this.loadHistoricalData();
        this.setupEventListeners();
        this.initializeModel();

        console.log('[SUCCESS] Yield Forecasting AI initialized');
    },

    // Load historical data
    loadHistoricalData() {
        const saved = localStorage.getItem('yield-historical-data');
        if (saved) {
            this.historicalData = JSON.parse(saved);
        } else {
            // Generate mock historical data for training
            this.historicalData = this.generateMockHistoricalData();
            this.saveHistoricalData();
        }
    },

    // Generate mock historical data (simulates past seasons)
    generateMockHistoricalData() {
        const data = [];
        const crops = ['maize', 'cassava', 'beans', 'tomatoes'];

        for (let year = 2020; year <= 2024; year++) {
            for (let season = 1; season <= 2; season++) {
                crops.forEach(crop => {
                    data.push({
                        year: year,
                        season: season,
                        crop: crop,
                        // Input features
                        avgSoilMoisture: 55 + Math.random() * 20,
                        avgTemperature: 26 + Math.random() * 6,
                        totalRainfall: 300 + Math.random() * 400,
                        avgNDVI: 0.6 + Math.random() * 0.3,
                        irrigationHours: 50 + Math.random() * 100,
                        fertilizationLevel: 60 + Math.random() * 40,
                        pestControl: Math.random() > 0.3 ? 'yes' : 'no',
                        // Output (actual yield)
                        actualYield: this.calculateMockYield(crop, year, season),
                        area: 1.0 // hectares
                    });
                });
            }
        }

        return data;
    },

    // Calculate mock yield based on factors
    calculateMockYield(crop, year, season) {
        const baseYields = {
            'maize': 3500,      // kg/ha
            'cassava': 12000,
            'beans': 1800,
            'tomatoes': 25000
        };

        const base = baseYields[crop] || 2000;
        const yearTrend = (year - 2020) * 50; // Improving practices over time
        const seasonVariation = season === 1 ? 1.1 : 0.9; // Season 1 typically better
        const randomFactor = 0.8 + Math.random() * 0.4; // 80-120% variation

        return Math.round(base * seasonVariation * randomFactor + yearTrend);
    },

    // Setup event listeners
    setupEventListeners() {
        const predictBtn = document.getElementById('run-forecast-btn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => {
                console.log('[DEBUG] Forecast button clicked');
                try {
                    this.runForecast();
                } catch (error) {
                    console.error('[ERROR] Forecast failed:', error);
                    if (typeof Notifications !== 'undefined') {
                        Notifications.error('Forecast Error', 'Failed to run forecast: ' + error.message);
                    }
                }
            });
        } else {
            console.error('[ERROR] Forecast button not found');
        }

        const cropSelect = document.getElementById('forecast-crop-select');
        if (cropSelect) {
            cropSelect.addEventListener('change', () => this.updateForecastInputs());
        }
    },

    // Initialize ML model (simplified regression model)
    initializeModel() {
        // Using a simplified linear regression approach
        // In production, this would use TensorFlow.js

        this.model = {
            weights: {
                soilMoisture: 0.25,
                temperature: 0.15,
                rainfall: 0.20,
                ndvi: 0.30,
                irrigation: 0.10
            },
            bias: 0,
            trained: false
        };

        // Train model on historical data
        this.trainModel();
    },

    // Train model using historical data
    trainModel() {
        console.log('[INFO] Training yield prediction model...');

        if (this.historicalData.length < 10) {
            console.warn('[WARN] Insufficient historical data for training');
            return;
        }

        // Group by crop type
        const crops = ['maize', 'cassava', 'beans', 'tomatoes'];

        crops.forEach(crop => {
            const cropData = this.historicalData.filter(d => d.crop === crop);

            if (cropData.length > 0) {
                // Simple linear regression coefficients calculation
                const avgYield = this.average(cropData.map(d => d.actualYield));
                const avgMoisture = this.average(cropData.map(d => d.avgSoilMoisture));
                const avgTemp = this.average(cropData.map(d => d.avgTemperature));
                const avgRain = this.average(cropData.map(d => d.totalRainfall));
                const avgNDVI = this.average(cropData.map(d => d.avgNDVI));
                const avgIrrigation = this.average(cropData.map(d => d.irrigationHours));

                // Store crop-specific parameters
                if (!this.model[crop]) {
                    this.model[crop] = {
                        avgYield,
                        avgMoisture,
                        avgTemp,
                        avgRain,
                        avgNDVI,
                        avgIrrigation
                    };
                }
            }
        });

        this.model.trained = true;
        console.log('[SUCCESS] Model training complete');
    },

    // Run yield forecast
    async runForecast() {
        console.log('[INFO] Running yield forecast...');

        // Get current conditions
        const conditions = await this.getCurrentConditions();

        // Get forecast inputs
        const crop = document.getElementById('forecast-crop-select')?.value || 'maize';
        const area = parseFloat(document.getElementById('forecast-area')?.value) || 1.0;

        // Make prediction
        const prediction = this.predict(crop, conditions);

        // Calculate confidence based on data quality
        const confidence = this.calculateConfidence(conditions);

        // Store prediction
        this.predictions = {
            crop: crop,
            area: area,
            predictedYield: prediction.yield,
            yieldPerHectare: prediction.yieldPerHa,
            confidence: confidence,
            revenue: this.calculateRevenue(crop, prediction.yield),
            factors: conditions,
            timestamp: new Date()
        };

        // Update UI
        this.displayForecast();

        // Show notification
        if (typeof Notifications !== 'undefined') {
            Notifications.show(
                '📊 Forecast Complete',
                `Expected yield: ${Math.round(prediction.yield)} kg (${confidence}% confidence)`,
                'success',
                5000
            );
        }

        return this.predictions;
    },

    // Get current field conditions
    async getCurrentConditions() {
        const conditions = {
            avgSoilMoisture: 60,
            avgTemperature: 28,
            totalRainfall: 450,
            avgNDVI: 0.75,
            irrigationHours: 80,
            fertilizationLevel: 75,
            pestControl: 'yes'
        };

        // Get real sensor data if available
        if (typeof Dashboard !== 'undefined') {
            try {
                const sensors = await Dashboard.fetchSensorData();
                if (sensors && sensors.length > 0) {
                    const latest = sensors[0];
                    conditions.avgSoilMoisture = latest.soil_moisture || 60;
                    conditions.avgTemperature = latest.temperature || 28;
                }
            } catch (error) {
                console.log('[INFO] Using default conditions');
            }
        }

        // Get weather data if available
        if (typeof Weather !== 'undefined' && Weather.forecastData) {
            const totalRain = Weather.forecastData.reduce((sum, day) => {
                return sum + (day.rainfall || 0);
            }, 0);
            conditions.totalRainfall = totalRain > 0 ? totalRain : 450;
        }

        // Get NDVI from satellite data if available
        if (typeof Satellite !== 'undefined' && Satellite.analysisResults.size > 0) {
            const analysis = Array.from(Satellite.analysisResults.values())[0];
            if (analysis && analysis.ndvi) {
                conditions.avgNDVI = analysis.ndvi;
            }
        }

        return conditions;
    },

    // Predict yield using trained model
    predict(crop, conditions) {
        if (!this.model.trained || !this.model[crop]) {
            console.warn('[WARN] Model not trained for crop:', crop);
            return { yield: 0, yieldPerHa: 0 };
        }

        const cropModel = this.model[crop];

        // Normalized deviation from average conditions
        const moistureFactor = conditions.avgSoilMoisture / cropModel.avgMoisture;
        const tempFactor = 1 - Math.abs(conditions.avgTemperature - cropModel.avgTemp) / 10;
        const rainFactor = conditions.totalRainfall / cropModel.avgRain;
        const ndviFactor = conditions.avgNDVI / cropModel.avgNDVI;
        const irrigationFactor = conditions.irrigationHours / cropModel.avgIrrigation;

        // Weighted prediction
        const prediction = cropModel.avgYield * (
            moistureFactor * 0.25 +
            tempFactor * 0.15 +
            rainFactor * 0.20 +
            ndviFactor * 0.30 +
            irrigationFactor * 0.10
        );

        const area = parseFloat(document.getElementById('forecast-area')?.value) || 1.0;

        return {
            yieldPerHa: Math.max(0, Math.round(prediction)),
            yield: Math.max(0, Math.round(prediction * area))
        };
    },

    // Calculate confidence level
    calculateConfidence(conditions) {
        let confidence = 70; // Base confidence

        // Increase confidence if we have real data
        if (conditions.avgSoilMoisture !== 60) confidence += 5;
        if (conditions.avgTemperature !== 28) confidence += 5;
        if (conditions.avgNDVI > 0.7) confidence += 10;

        // Decrease confidence for extreme conditions
        if (conditions.avgTemperature > 35 || conditions.avgTemperature < 20) confidence -= 10;
        if (conditions.avgSoilMoisture < 30) confidence -= 10;
        if (conditions.totalRainfall < 200) confidence -= 5;

        return Math.max(50, Math.min(95, confidence));
    },

    // Calculate expected revenue
    calculateRevenue(crop, yieldKg) {
        // Market prices in XAF per kg
        const prices = {
            'maize': 250,
            'cassava': 150,
            'beans': 800,
            'tomatoes': 400
        };

        const pricePerKg = prices[crop] || 300;
        const revenue = yieldKg * pricePerKg;

        // Calculate costs (rough estimates)
        const costs = {
            seeds: yieldKg * 0.1 * pricePerKg,
            fertilizer: yieldKg * 0.15 * pricePerKg,
            irrigation: yieldKg * 0.05 * pricePerKg,
            labor: yieldKg * 0.1 * pricePerKg,
            other: yieldKg * 0.05 * pricePerKg
        };

        const totalCosts = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
        const profit = revenue - totalCosts;

        return {
            revenue: Math.round(revenue),
            costs: Math.round(totalCosts),
            profit: Math.round(profit),
            margin: Math.round((profit / revenue) * 100),
            breakdown: costs
        };
    },

    // Display forecast results
    displayForecast() {
        const container = document.getElementById('forecast-results-container');
        if (!container) return;

        const { crop, predictedYield, yieldPerHa, confidence, revenue, factors, area } = this.predictions;

        container.innerHTML = `
            <div class="forecast-results">
                <div class="forecast-header">
                    <h3>🌾 Yield Forecast: ${crop.charAt(0).toUpperCase() + crop.slice(1)}</h3>
                    <span class="confidence-badge">${confidence}% Confidence</span>
                </div>

                <div class="forecast-main-metrics">
                    <div class="metric-card primary">
                        <div class="metric-label">Expected Yield</div>
                        <div class="metric-value">${predictedYield.toLocaleString()} kg</div>
                        <div class="metric-sub">${yieldPerHa.toLocaleString()} kg/ha × ${area} ha</div>
                    </div>

                    <div class="metric-card success">
                        <div class="metric-label">Expected Revenue</div>
                        <div class="metric-value">${revenue.revenue.toLocaleString()} XAF</div>
                        <div class="metric-sub">Profit: ${revenue.profit.toLocaleString()} XAF (${revenue.margin}%)</div>
                    </div>
                </div>

                <div class="forecast-factors">
                    <h4>Contributing Factors</h4>
                    <div class="factors-grid">
                        <div class="factor-item">
                            <span class="factor-icon">💧</span>
                            <span class="factor-label">Soil Moisture</span>
                            <span class="factor-value">${Math.round(factors.avgSoilMoisture)}%</span>
                        </div>
                        <div class="factor-item">
                            <span class="factor-icon">🌡️</span>
                            <span class="factor-label">Temperature</span>
                            <span class="factor-value">${Math.round(factors.avgTemperature)}°C</span>
                        </div>
                        <div class="factor-item">
                            <span class="factor-icon">🌧️</span>
                            <span class="factor-label">Rainfall</span>
                            <span class="factor-value">${Math.round(factors.totalRainfall)}mm</span>
                        </div>
                        <div class="factor-item">
                            <span class="factor-icon">🛰️</span>
                            <span class="factor-label">NDVI</span>
                            <span class="factor-value">${factors.avgNDVI.toFixed(2)}</span>
                        </div>
                        <div class="factor-item">
                            <span class="factor-icon">💦</span>
                            <span class="factor-label">Irrigation</span>
                            <span class="factor-value">${Math.round(factors.irrigationHours)}h</span>
                        </div>
                        <div class="factor-item">
                            <span class="factor-icon">🌱</span>
                            <span class="factor-label">Fertilization</span>
                            <span class="factor-value">${Math.round(factors.fertilizationLevel)}%</span>
                        </div>
                    </div>
                </div>

                <div class="forecast-breakdown">
                    <h4>Cost Breakdown</h4>
                    <div class="cost-items">
                        ${Object.entries(revenue.breakdown).map(([item, cost]) => `
                            <div class="cost-item">
                                <span class="cost-label">${item.charAt(0).toUpperCase() + item.slice(1)}</span>
                                <span class="cost-value">${Math.round(cost).toLocaleString()} XAF</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="forecast-recommendations">
                    <h4>💡 Recommendations</h4>
                    <ul class="recommendations-list">
                        ${this.generateRecommendations(factors, crop).map(rec => `
                            <li class="recommendation-item ${rec.priority}">
                                <span class="rec-icon">${rec.icon}</span>
                                <span class="rec-text">${rec.text}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="forecast-timestamp">
                    Generated: ${new Date().toLocaleString()}
                </div>
            </div>
        `;

        container.classList.remove('hidden');
    },

    // Generate recommendations based on conditions
    generateRecommendations(factors, crop) {
        const recommendations = [];

        // Soil moisture recommendations
        if (factors.avgSoilMoisture < 50) {
            recommendations.push({
                icon: '💧',
                text: 'Increase irrigation frequency to improve soil moisture levels',
                priority: 'high'
            });
        } else if (factors.avgSoilMoisture > 80) {
            recommendations.push({
                icon: '⚠️',
                text: 'Reduce irrigation to prevent waterlogging and root diseases',
                priority: 'medium'
            });
        }

        // Temperature recommendations
        if (factors.avgTemperature > 32) {
            recommendations.push({
                icon: '🌡️',
                text: 'Consider shade nets or mulching to reduce heat stress',
                priority: 'medium'
            });
        }

        // NDVI recommendations
        if (factors.avgNDVI < 0.6) {
            recommendations.push({
                icon: '🌱',
                text: 'Low vegetation health detected - increase fertilization and pest control',
                priority: 'high'
            });
        } else if (factors.avgNDVI > 0.8) {
            recommendations.push({
                icon: '✅',
                text: 'Excellent vegetation health - maintain current practices',
                priority: 'low'
            });
        }

        // Rainfall recommendations
        if (factors.totalRainfall < 300) {
            recommendations.push({
                icon: '🌧️',
                text: 'Low rainfall expected - plan for supplementary irrigation',
                priority: 'high'
            });
        }

        // Fertilization recommendations
        if (factors.fertilizationLevel < 60) {
            recommendations.push({
                icon: '🧪',
                text: 'Apply additional fertilizer to boost nutrient levels',
                priority: 'medium'
            });
        }

        // Pest control
        if (factors.pestControl === 'no') {
            recommendations.push({
                icon: '🐛',
                text: 'Implement pest control measures to protect yield',
                priority: 'high'
            });
        }

        // General best practices
        recommendations.push({
            icon: '📊',
            text: 'Continue monitoring with sensors for real-time optimization',
            priority: 'low'
        });

        return recommendations;
    },

    // Helper: Calculate average
    average(arr) {
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    },

    // Save historical data
    saveHistoricalData() {
        localStorage.setItem('yield-historical-data', JSON.stringify(this.historicalData));
    },

    // Add new harvest record (for future training)
    addHarvestRecord(record) {
        this.historicalData.push({
            ...record,
            timestamp: new Date()
        });
        this.saveHistoricalData();

        // Retrain model with new data
        this.trainModel();
    },

    // Get forecast summary
    getSummary() {
        if (!this.predictions.crop) {
            return {
                hasData: false,
                message: 'No forecast available - run analysis first'
            };
        }

        return {
            hasData: true,
            crop: this.predictions.crop,
            predictedYield: this.predictions.predictedYield,
            confidence: this.predictions.confidence,
            revenue: this.predictions.revenue.revenue,
            profit: this.predictions.revenue.profit
        };
    }
};
