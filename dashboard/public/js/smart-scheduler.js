/**
 * Smart Irrigation Scheduler
 * Automatically schedules irrigation based on weather, soil moisture, and crop needs
 */

const SmartScheduler = {
    enabled: false,
    schedule: [],
    rules: [],
    waterSavings: 0,

    // Initialize scheduler
    init() {
        console.log('[INFO] Initializing Smart Irrigation Scheduler...');

        this.loadSettings();
        this.setupEventListeners();
        this.startMonitoring();

        console.log('[SUCCESS] Smart Scheduler initialized');
    },

    // Load saved settings
    loadSettings() {
        const saved = localStorage.getItem('smart-scheduler-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.enabled = settings.enabled || false;
            this.rules = settings.rules || this.getDefaultRules();
        } else {
            this.rules = this.getDefaultRules();
        }
    },

    // Default scheduling rules
    getDefaultRules() {
        return [
            {
                id: 'avoid-rain',
                name: 'Avoid irrigation before rain',
                enabled: true,
                condition: (weather) => weather.rainProbability > 60,
                action: 'skip'
            },
            {
                id: 'night-irrigation',
                name: 'Prefer night irrigation (cheaper electricity)',
                enabled: true,
                condition: (time) => time.getHours() >= 22 || time.getHours() <= 6,
                action: 'schedule'
            },
            {
                id: 'critical-moisture',
                name: 'Emergency irrigation if critically low',
                enabled: true,
                condition: (moisture) => moisture < 30,
                action: 'immediate'
            },
            {
                id: 'optimal-moisture',
                name: 'Maintain optimal moisture (50-70%)',
                enabled: true,
                targetMin: 50,
                targetMax: 70,
                action: 'maintain'
            }
        ];
    },

    // Setup event listeners
    setupEventListeners() {
        const toggleBtn = document.getElementById('smart-scheduler-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('change', (e) => {
                this.enabled = e.target.checked;
                this.saveSettings();
                if (this.enabled) {
                    this.generateSchedule();
                }
            });
        }
    },

    // Start monitoring conditions
    startMonitoring() {
        // Check conditions every hour
        setInterval(() => {
            if (this.enabled) {
                this.analyzeConditions();
            }
        }, 3600000); // 1 hour

        // Generate daily schedule at midnight
        setInterval(() => {
            if (this.enabled) {
                this.generateSchedule();
            }
        }, 86400000); // 24 hours
    },

    // Analyze current conditions
    async analyzeConditions() {
        console.log('[INFO] Analyzing irrigation conditions...');

        const conditions = {
            soilMoisture: await this.getSoilMoisture(),
            weather: await this.getWeatherForecast(),
            cropStage: this.getCropStage(),
            evapotranspiration: this.calculateET()
        };

        const recommendation = this.makeRecommendation(conditions);

        if (recommendation.action === 'immediate') {
            this.executeIrrigation(recommendation);
        }

        return recommendation;
    },

    // Get soil moisture levels
    async getSoilMoisture() {
        // Get latest sensor data
        if (typeof Dashboard !== 'undefined') {
            const sensors = await Dashboard.fetchSensorData();
            if (sensors && sensors.length > 0) {
                const latest = sensors[0];
                return {
                    zone1: latest.soil_moisture || 65,
                    zone2: latest.soil_moisture ? latest.soil_moisture - 5 : 60,
                    zone3: latest.soil_moisture ? latest.soil_moisture - 10 : 55,
                    average: latest.soil_moisture || 60
                };
            }
        }

        // Mock data if not available
        return {
            zone1: 65,
            zone2: 60,
            zone3: 55,
            average: 60
        };
    },

    // Get weather forecast
    async getWeatherForecast() {
        if (typeof Weather !== 'undefined' && Weather.forecastData) {
            const today = Weather.forecastData[0];
            return {
                temp: today?.temp || 28,
                humidity: today?.humidity || 65,
                rainProbability: today?.rain_probability || 20,
                rainfall: today?.rainfall || 0
            };
        }

        // Mock data
        return {
            temp: 28,
            humidity: 65,
            rainProbability: 20,
            rainfall: 0
        };
    },

    // Calculate evapotranspiration (ET)
    calculateET() {
        // Simplified Penman-Monteith equation
        // ET = (Δ(Rn - G) + ρaCp(es - ea)/ra) / (Δ + γ(1 + rs/ra))
        // For simplicity, use temperature-based estimation

        const temp = 28; // Get from weather
        const humidity = 65;

        // Simplified ET calculation (mm/day)
        const et = 0.0023 * (temp + 17.8) * Math.sqrt(100 - humidity);

        return Math.round(et * 10) / 10;
    },

    // Get crop growth stage
    getCropStage() {
        // This would integrate with crop calendar
        // For now, return mock stage
        return {
            stage: 'vegetative',
            daysFromPlanting: 45,
            waterRequirement: 'medium' // low, medium, high
        };
    },

    // Make irrigation recommendation
    makeRecommendation(conditions) {
        const { soilMoisture, weather, cropStage, evapotranspiration } = conditions;

        // Check critical moisture rule
        if (soilMoisture.average < 30) {
            return {
                action: 'immediate',
                zone: 'all',
                duration: 30,
                reason: 'Critical low moisture detected',
                urgency: 'high'
            };
        }

        // Check rain forecast
        if (weather.rainProbability > 60) {
            return {
                action: 'skip',
                reason: `Rain forecast: ${weather.rainProbability}% probability`,
                urgency: 'low'
            };
        }

        // Check if irrigation needed based on ET and moisture
        const targetMoisture = 60;
        const deficit = targetMoisture - soilMoisture.average;

        if (deficit > 10) {
            // Calculate duration based on deficit and ET
            const duration = Math.min(Math.ceil(deficit * 2), 45);

            // Get intelligent optimal time based on weather and conditions
            const scheduledTime = await this.getOptimalTime();

            return {
                action: 'schedule',
                zone: 'all',
                duration: duration,
                scheduledTime: scheduledTime,
                reason: `Moisture deficit: ${Math.round(deficit)}%`,
                urgency: 'medium'
            };
        }

        return {
            action: 'none',
            reason: 'Soil moisture optimal',
            urgency: 'low'
        };
    },

    // Get optimal irrigation time based on weather, soil moisture, and environmental conditions
    async getOptimalTime() {
        const now = new Date();
        const currentHour = now.getHours();

        console.log('[INFO] Calculating optimal irrigation time...');

        // Get current conditions
        const soilMoisture = await this.getSoilMoisture();
        const weather = await this.getWeatherForecast();

        console.log('[DEBUG] Soil moisture:', soilMoisture.average, '%');
        console.log('[DEBUG] Weather:', weather);

        // Check if rain is expected in next 24 hours
        const rainExpected = this.isRainExpected(weather);
        if (rainExpected) {
            console.log('[INFO] Rain expected - delaying irrigation by 24 hours');
            const delayedTime = new Date(now);
            delayedTime.setDate(delayedTime.getDate() + 1);
            delayedTime.setHours(6, 0, 0, 0);
            return delayedTime;
        }

        // Critical moisture - irrigate at next available optimal window
        if (soilMoisture.average < 30) {
            console.log('[WARN] Critical soil moisture - scheduling urgent irrigation');
            return this.getNextOptimalWindow(now, true); // urgent = true
        }

        // Determine optimal time based on temperature and evaporation
        const optimalTime = this.calculateOptimalWindow(now, weather);
        console.log('[INFO] Optimal irrigation time:', optimalTime.toLocaleString());

        return optimalTime;
    },

    // Check if rain is expected based on weather forecast
    isRainExpected(weather) {
        // Check rain probability
        if (weather.rainProbability && weather.rainProbability > 60) {
            return true;
        }

        // Check if weather description indicates rain
        if (weather.rainfall && weather.rainfall > 5) {
            return true;
        }

        // Check Weather.forecastData for upcoming rain
        if (typeof Weather !== 'undefined' && Weather.forecastData) {
            const nextDay = Weather.forecastData[1]; // Tomorrow's forecast
            if (nextDay) {
                // Check if description contains rain keywords
                const rainKeywords = ['rain', 'rainy', 'thunderstorm', 'storm', 'drizzle'];
                const desc = (nextDay.desc || '').toLowerCase();
                if (rainKeywords.some(keyword => desc.includes(keyword))) {
                    return true;
                }
            }
        }

        return false;
    },

    // Get next optimal irrigation window
    getNextOptimalWindow(now, urgent = false) {
        const currentHour = now.getHours();

        // Optimal windows:
        // - Early morning: 5 AM - 7 AM (best for absorption, minimal evaporation)
        // - Late afternoon/evening: 5 PM - 7 PM (secondary option)
        // - Avoid: 10 AM - 4 PM (high evaporation, water waste)

        const optimalTime = new Date(now);

        // If urgent and current time is reasonable (5 AM - 9 PM), irrigate in 30 minutes
        if (urgent && currentHour >= 5 && currentHour <= 21) {
            optimalTime.setMinutes(optimalTime.getMinutes() + 30);
            return optimalTime;
        }

        // Early morning window (5 AM - 7 AM)
        if (currentHour < 5) {
            // Before 5 AM - schedule for 6 AM today
            optimalTime.setHours(6, 0, 0, 0);
        } else if (currentHour >= 5 && currentHour < 10) {
            // Morning window still available - schedule for 6 AM today
            optimalTime.setHours(6, 0, 0, 0);
        } else if (currentHour >= 10 && currentHour < 17) {
            // Midday heat - schedule for late afternoon (6 PM)
            optimalTime.setHours(18, 0, 0, 0);
        } else if (currentHour >= 17 && currentHour < 19) {
            // Late afternoon window - schedule for 6 PM today
            optimalTime.setHours(18, 0, 0, 0);
        } else {
            // After evening window - schedule for next morning (6 AM)
            optimalTime.setDate(optimalTime.getDate() + 1);
            optimalTime.setHours(6, 0, 0, 0);
        }

        // If calculated time is in the past, move to next day
        if (optimalTime < now) {
            optimalTime.setDate(optimalTime.getDate() + 1);
        }

        return optimalTime;
    },

    // Calculate optimal window based on weather conditions
    calculateOptimalWindow(now, weather) {
        const currentHour = now.getHours();
        const temp = weather.temp || 28;
        const humidity = weather.humidity || 65;

        console.log('[DEBUG] Temp:', temp, '°C, Humidity:', humidity, '%');

        // High temperature (>30°C) - prefer early morning only
        if (temp > 30) {
            console.log('[INFO] High temperature detected - scheduling early morning only');
            const morningTime = new Date(now);
            morningTime.setHours(5, 30, 0, 0);
            if (morningTime < now) {
                morningTime.setDate(morningTime.getDate() + 1);
            }
            return morningTime;
        }

        // Low humidity (<50%) - high evaporation risk, prefer early morning
        if (humidity < 50) {
            console.log('[INFO] Low humidity - scheduling early morning to minimize evaporation');
            const morningTime = new Date(now);
            morningTime.setHours(6, 0, 0, 0);
            if (morningTime < now) {
                morningTime.setDate(morningTime.getDate() + 1);
            }
            return morningTime;
        }

        // Moderate conditions - use standard optimal window
        return this.getNextOptimalWindow(now, false);
    },

    // Generate 7-day schedule
    async generateSchedule() {
        console.log('[INFO] Generating 7-day irrigation schedule...');

        const schedule = [];

        for (let day = 0; day < 7; day++) {
            const date = new Date();
            date.setDate(date.getDate() + day);

            // Analyze conditions for each day
            const conditions = await this.analyzeConditions();

            if (conditions.action === 'schedule' || conditions.action === 'immediate') {
                schedule.push({
                    date: date,
                    time: conditions.scheduledTime || this.getOptimalTime(),
                    zone: conditions.zone,
                    duration: conditions.duration,
                    reason: conditions.reason,
                    status: 'pending'
                });
            }
        }

        this.schedule = schedule;
        this.updateUI();
        this.saveSettings();

        return schedule;
    },

    // Execute irrigation
    async executeIrrigation(recommendation) {
        console.log('[INFO] Executing smart irrigation:', recommendation);

        if (typeof FarmControls !== 'undefined') {
            // Activate irrigation
            await FarmControls.startIrrigation(recommendation.zone, recommendation.duration);

            // Track water savings
            const baseline = 45; // Average manual irrigation duration
            const savings = baseline - recommendation.duration;
            if (savings > 0) {
                this.waterSavings += savings * 50; // 50L per minute estimate
                this.saveSettings();
            }

            // Show notification
            if (typeof Notifications !== 'undefined') {
                Notifications.show(
                    '💧 Smart Irrigation',
                    `${recommendation.zone} - ${recommendation.duration} min\n${recommendation.reason}`,
                    'success',
                    5000
                );
            }
        }
    },

    // Update UI with schedule
    updateUI() {
        const container = document.getElementById('smart-schedule-container');
        if (!container) return;

        container.innerHTML = this.schedule.map(item => `
            <div class="schedule-item ${item.status}">
                <div class="schedule-date">
                    ${item.date.toLocaleDateString()} ${item.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div class="schedule-details">
                    <strong>Zone ${item.zone}</strong> - ${item.duration} minutes
                    <div class="schedule-reason">${item.reason}</div>
                </div>
                <div class="schedule-status">${item.status}</div>
            </div>
        `).join('');

        // Update savings display
        const savingsEl = document.getElementById('water-savings');
        if (savingsEl) {
            savingsEl.textContent = `${this.waterSavings}L saved this month`;
        }
    },

    // Save settings to localStorage
    saveSettings() {
        localStorage.setItem('smart-scheduler-settings', JSON.stringify({
            enabled: this.enabled,
            rules: this.rules,
            waterSavings: this.waterSavings
        }));
    },

    // Get status summary
    getStatus() {
        return {
            enabled: this.enabled,
            upcomingIrrigations: this.schedule.filter(s => s.status === 'pending').length,
            waterSaved: this.waterSavings,
            nextScheduled: this.schedule.length > 0 ? this.schedule[0].time : null
        };
    }
};
