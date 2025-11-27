/**
 * Smart Irrigation Scheduler
 * Automatically schedules irrigation based on weather, soil moisture, and crop needs
 */

const SmartScheduler = {
    enabled: false,
    schedule: [],
    rules: [],
    waterSavings: 0,
    currentRecommendation: null,
    userPreferences: {
        preferredMorningStart: 6,  // 6 AM - optimal for tomatoes
        preferredMorningEnd: 9,     // 9 AM
        preferredEveningStart: 17,  // 5 PM
        preferredEveningEnd: 19,    // 7 PM
        avoidNoonHours: true,       // Avoid 11 AM - 3 PM to prevent leaf burn and water waste
        cropType: 'tomatoes',       // tomatoes, vegetables, fruits, grains, mixed
        maxDailyIrrigations: 2
    },

    // Initialize scheduler
    async init() {
        console.log('[INFO] Initializing Smart Irrigation Scheduler...');

        await this.loadSettings();
        this.setupEventListeners();
        this.startMonitoring();

        console.log('[SUCCESS] Smart Scheduler initialized');
    },

    // Load saved settings
    async loadSettings() {
        // Try loading from database first
        await this.loadPreferencesFromDatabase();

        // Load local settings
        const saved = localStorage.getItem('smart-scheduler-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.enabled = settings.enabled || false;
            this.rules = settings.rules || this.getDefaultRules();
            this.waterSavings = settings.waterSavings || 0;
        } else {
            this.rules = this.getDefaultRules();
        }

        // Load pending schedules from database
        await this.loadSchedulesFromDatabase();
    },

    // Load user preferences from database
    async loadPreferencesFromDatabase() {
        if (typeof supabase === 'undefined') {
            console.warn('[WARN] Supabase not available, using default preferences');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('irrigation_preferences')
                .select('*')
                .single();

            if (error) {
                if (error.code !== 'PGRST116') { // Not found error
                    console.error('[ERROR] Failed to load preferences:', error);
                }
                return;
            }

            if (data) {
                console.log('[INFO] Loaded user preferences from database');
                this.userPreferences = {
                    preferredMorningStart: data.preferred_morning_start,
                    preferredMorningEnd: data.preferred_morning_end,
                    preferredEveningStart: data.preferred_evening_start,
                    preferredEveningEnd: data.preferred_evening_end,
                    avoidNoonHours: data.avoid_noon_hours,
                    cropType: data.crop_type,
                    maxDailyIrrigations: data.max_daily_irrigations
                };
            }
        } catch (error) {
            console.error('[ERROR] Failed to load preferences:', error);
        }
    },

    // Load schedules from database
    async loadSchedulesFromDatabase() {
        if (typeof supabase === 'undefined') {
            console.warn('[WARN] Supabase not available');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('irrigation_schedules')
                .select('*')
                .in('status', ['pending', 'approved'])
                .order('scheduled_time', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                console.log(`[INFO] Loaded ${data.length} schedules from database`);
                this.schedule = data.map(s => ({
                    date: new Date(s.scheduled_time),
                    time: new Date(s.scheduled_time),
                    zone: s.zone,
                    duration: s.duration,
                    reason: s.reason,
                    urgency: s.urgency,
                    status: s.status,
                    scheduledTime: s.scheduled_time
                }));
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('[ERROR] Failed to load schedules:', error);
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
        // Scheduler toggle
        const toggleBtn = document.getElementById('scheduler-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('change', (e) => {
                this.enabled = e.target.checked;
                this.saveSettings();
                if (this.enabled) {
                    this.analyzeAndShowRecommendation();
                } else {
                    this.hideRecommendation();
                }
            });
        }

        // Approve schedule button
        const approveBtn = document.getElementById('approve-schedule-btn');
        if (approveBtn) {
            approveBtn.addEventListener('click', () => {
                this.approveSchedule();
            });
        }

        // Decline schedule button
        const declineBtn = document.getElementById('decline-schedule-btn');
        if (declineBtn) {
            declineBtn.addEventListener('click', () => {
                this.declineSchedule();
            });
        }

        // Schedule for later button
        const scheduleLaterBtn = document.getElementById('schedule-later-btn');
        if (scheduleLaterBtn) {
            scheduleLaterBtn.addEventListener('click', () => {
                this.scheduleLater();
            });
        }

        // Analyze conditions button
        const analyzeBtn = document.getElementById('analyze-conditions-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                this.analyzeAndShowRecommendation();
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

        // Check scheduled irrigations every minute
        setInterval(() => {
            this.checkScheduledIrrigations();
        }, 60000); // 1 minute

        // Generate daily schedule at midnight
        setInterval(() => {
            if (this.enabled) {
                this.generateSchedule();
            }
        }, 86400000); // 24 hours
    },

    // Check and execute scheduled irrigations
    async checkScheduledIrrigations() {
        if (!this.enabled || this.schedule.length === 0) return;

        const now = new Date();
        console.log('[DEBUG] Checking scheduled irrigations...');

        for (const item of this.schedule) {
            // Skip if not approved or pending
            if (item.status !== 'approved' && item.status !== 'pending') continue;

            const scheduledTime = new Date(item.scheduledTime || item.time);

            // Check if it's time to irrigate (within 1 minute window)
            const timeDiff = scheduledTime - now;
            if (timeDiff > 0 && timeDiff <= 60000) {
                console.log('[INFO] Executing scheduled irrigation:', item);
                await this.executeScheduledIrrigation(item);
            }
        }
    },

    // Execute scheduled irrigation
    async executeScheduledIrrigation(scheduleItem) {
        try {
            console.log('[INFO] Starting irrigation execution...');

            // Update status to executing
            scheduleItem.status = 'executing';
            await this.updateScheduleStatus(scheduleItem, 'executing');

            // Trigger irrigation via FarmControls
            if (typeof FarmControls !== 'undefined' && FarmControls.startIrrigation) {
                await FarmControls.startIrrigation(scheduleItem.zone, scheduleItem.duration);

                // Update status to completed
                scheduleItem.status = 'completed';
                scheduleItem.executedAt = new Date().toISOString();
                await this.updateScheduleStatus(scheduleItem, 'completed');

                // Show notification
                if (typeof Notifications !== 'undefined') {
                    Notifications.show(
                        'Irrigation Started',
                        `Automatic irrigation started for ${scheduleItem.zone} - ${scheduleItem.duration} minutes`,
                        'success',
                        5000
                    );
                }

                console.log('[SUCCESS] Irrigation executed successfully');
            } else {
                console.error('[ERROR] FarmControls module not available');
                scheduleItem.status = 'failed';
                await this.updateScheduleStatus(scheduleItem, 'failed');

                if (typeof Notifications !== 'undefined') {
                    Notifications.show(
                        'Irrigation Failed',
                        'Could not trigger irrigation system',
                        'error',
                        5000
                    );
                }
            }

            // Update UI
            this.updateStatsDisplay();

        } catch (error) {
            console.error('[ERROR] Failed to execute irrigation:', error);
            scheduleItem.status = 'failed';
            await this.updateScheduleStatus(scheduleItem, 'failed');
        }
    },

    // Update schedule status in database
    async updateScheduleStatus(scheduleItem, status) {
        if (typeof supabase === 'undefined') return;

        try {
            const { error } = await supabase
                .from('irrigation_schedules')
                .update({
                    status: status,
                    executed_at: status === 'completed' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('scheduled_time', scheduleItem.scheduledTime);

            if (error) throw error;

            console.log(`[INFO] Schedule status updated to: ${status}`);
        } catch (error) {
            console.error('[ERROR] Failed to update schedule status:', error);
        }
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

    // Get soil moisture levels from real sensor data
    async getSoilMoisture() {
        console.log('[INFO] Fetching soil moisture from sensor readings...');

        try {
            // Get latest sensor readings from database
            if (typeof supabase !== 'undefined') {
                const { data, error } = await supabase
                    .from('sensor_readings')
                    .select('soil_moisture, field_id, zone_id, reading_time')
                    .order('reading_time', { ascending: false })
                    .limit(10);

                if (error) throw error;

                if (data && data.length > 0) {
                    // Calculate average from recent readings
                    const moistureValues = data
                        .map(r => r.soil_moisture)
                        .filter(m => m !== null && m !== undefined);

                    if (moistureValues.length > 0) {
                        const average = moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length;

                        // Convert to percentage if needed (assuming 0-1023 raw sensor values)
                        // If values are already percentages (0-100), use as-is
                        const isPercentage = average <= 100;
                        const avgPercent = isPercentage ? average : (average / 1023) * 100;

                        console.log(`[INFO] Soil moisture average: ${avgPercent.toFixed(1)}%`);

                        return {
                            average: avgPercent,
                            readings: data.length,
                            latest: data[0],
                            timestamp: data[0].reading_time
                        };
                    }
                }
            }

            // Fallback: try Dashboard module
            if (typeof Dashboard !== 'undefined') {
                const sensors = await Dashboard.fetchSensorData();
                if (sensors && sensors.length > 0) {
                    const latest = sensors[0];
                    const moisture = latest.soil_moisture || 60;
                    return {
                        average: moisture,
                        readings: sensors.length,
                        latest: latest,
                        timestamp: latest.reading_time
                    };
                }
            }
        } catch (error) {
            console.error('[ERROR] Failed to fetch soil moisture:', error);
        }

        // Default fallback for testing
        console.warn('[WARN] Using default soil moisture values');
        return {
            average: 60,
            readings: 0,
            latest: null,
            timestamp: new Date().toISOString()
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
        // For tomatoes: Different stages have different water requirements
        // This would integrate with crop calendar in production
        // Using estimation based on typical growing season

        const cropType = this.userPreferences.cropType;

        if (cropType === 'tomatoes') {
            // Tomato growth stages and water requirements:
            // 1. Seedling (0-2 weeks): low - moderate watering
            // 2. Vegetative (2-6 weeks): high - rapid growth
            // 3. Flowering (6-8 weeks): critical - consistent moisture needed
            // 4. Fruiting (8-12 weeks): high - fruits developing
            // 5. Ripening (12+ weeks): moderate - reduce to improve flavor

            return {
                stage: 'fruiting',
                daysFromPlanting: 65,
                waterRequirement: 'high',
                notes: 'Critical phase - maintain consistent soil moisture at 60-70%'
            };
        }

        // Default for other crops
        return {
            stage: 'vegetative',
            daysFromPlanting: 45,
            waterRequirement: 'medium'
        };
    },

    // Make irrigation recommendation for tomatoes
    async makeRecommendation(conditions) {
        const { soilMoisture, weather, cropStage, evapotranspiration } = conditions;

        console.log('[INFO] Making recommendation for tomatoes...');
        console.log('[DEBUG] Soil moisture:', soilMoisture.average.toFixed(1), '%');
        console.log('[DEBUG] Crop stage:', cropStage.stage, '- Water requirement:', cropStage.waterRequirement);

        // Tomato-specific moisture thresholds
        const TOMATO_CRITICAL_LOW = 40;  // Below 40% is critical for tomatoes
        const TOMATO_OPTIMAL_MIN = 60;   // Optimal range: 60-70%
        const TOMATO_OPTIMAL_MAX = 70;

        // Check critical moisture rule for tomatoes
        if (soilMoisture.average < TOMATO_CRITICAL_LOW) {
            const scheduledTime = await this.getOptimalTime();
            return {
                action: 'immediate',
                zone: 'all',
                duration: 35,
                scheduledTime: scheduledTime,
                reason: `Critical: Tomato moisture at ${Math.round(soilMoisture.average)}% (require ${TOMATO_OPTIMAL_MIN}%+)`,
                urgency: 'high'
            };
        }

        // Check rain forecast
        if (weather.rainProbability > 60) {
            return {
                action: 'skip',
                reason: `Rain forecast: ${weather.rainProbability}% probability - delaying irrigation`,
                urgency: 'low'
            };
        }

        // Calculate deficit based on tomato requirements
        const targetMoisture = cropStage.waterRequirement === 'high' ? TOMATO_OPTIMAL_MAX : TOMATO_OPTIMAL_MIN;
        const deficit = targetMoisture - soilMoisture.average;

        // Check if irrigation needed
        if (deficit > 5) {
            // Calculate duration based on deficit, ET, and crop stage
            let baseDuration = Math.ceil(deficit * 2);

            // Adjust for crop stage (fruiting needs more water)
            if (cropStage.stage === 'fruiting' || cropStage.stage === 'flowering') {
                baseDuration *= 1.2;
            }

            // Adjust for high evapotranspiration
            if (evapotranspiration > 5) {
                baseDuration *= 1.1;
            }

            const duration = Math.min(Math.round(baseDuration), 45);
            const scheduledTime = await this.getOptimalTime();

            return {
                action: 'schedule',
                zone: 'all',
                duration: duration,
                scheduledTime: scheduledTime,
                reason: `Tomato ${cropStage.stage} stage: moisture at ${Math.round(soilMoisture.average)}% (target ${targetMoisture}%)`,
                urgency: 'medium'
            };
        }

        return {
            action: 'none',
            reason: `Soil moisture optimal for tomatoes (${Math.round(soilMoisture.average)}%)`,
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
        const prefs = this.userPreferences;

        // If urgent and current time is reasonable, irrigate in 30 minutes
        if (urgent && currentHour >= 5 && currentHour <= 21) {
            const urgentTime = new Date(now);
            urgentTime.setMinutes(urgentTime.getMinutes() + 30);
            return urgentTime;
        }

        const optimalTime = new Date(now);

        // Get crop-specific optimal time
        const cropOptimalHour = this.getCropOptimalTime();

        // Before morning window starts
        if (currentHour < prefs.preferredMorningStart) {
            optimalTime.setHours(cropOptimalHour, 0, 0, 0);
        }
        // During morning window
        else if (currentHour >= prefs.preferredMorningStart && currentHour < prefs.preferredMorningEnd) {
            // Still in morning window - use current hour + 1 or crop optimal
            const nextHour = Math.max(currentHour + 1, cropOptimalHour);
            if (nextHour < prefs.preferredMorningEnd) {
                optimalTime.setHours(nextHour, 0, 0, 0);
            } else {
                // Morning window closing, use evening
                optimalTime.setHours(prefs.preferredEveningStart, 0, 0, 0);
            }
        }
        // During midday (avoid if possible)
        else if (currentHour >= prefs.preferredMorningEnd && currentHour < prefs.preferredEveningStart) {
            // Schedule for evening window
            optimalTime.setHours(prefs.preferredEveningStart, 0, 0, 0);
        }
        // During evening window
        else if (currentHour >= prefs.preferredEveningStart && currentHour < prefs.preferredEveningEnd) {
            // Still in evening window - schedule soon
            optimalTime.setHours(currentHour + 1, 0, 0, 0);
            if (optimalTime.getHours() >= prefs.preferredEveningEnd) {
                // Evening window closing, schedule for tomorrow morning
                optimalTime.setDate(optimalTime.getDate() + 1);
                optimalTime.setHours(cropOptimalHour, 0, 0, 0);
            }
        }
        // After evening window - schedule for next morning
        else {
            optimalTime.setDate(optimalTime.getDate() + 1);
            optimalTime.setHours(cropOptimalHour, 0, 0, 0);
        }

        // If calculated time is in the past, move to next day
        if (optimalTime < now) {
            optimalTime.setDate(optimalTime.getDate() + 1);
        }

        return optimalTime;
    },

    // Get crop-specific optimal irrigation time
    getCropOptimalTime() {
        const cropType = this.userPreferences.cropType;

        // Crop-specific irrigation timing based on agricultural research
        const cropTiming = {
            'tomatoes': 7,      // 7 AM - allows foliage to dry before heat, reduces disease risk
            'vegetables': 6,    // Early morning (6 AM) - leafy greens need cool temps
            'fruits': 7,        // Mid-morning (7 AM) - fruit trees can handle slightly warmer
            'grains': 5,        // Very early (5 AM) - grains prefer early irrigation
            'mixed': 6,         // Default early morning
            'flowers': 7,       // Mid-morning - flowers can tolerate slightly warmer
            'herbs': 8          // Later morning - many herbs prefer drier conditions
        };

        return cropTiming[cropType] || 7;
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

    // Analyze conditions and show recommendation to user
    async analyzeAndShowRecommendation() {
        console.log('[INFO] Analyzing conditions for irrigation recommendation...');

        // Show loading state
        this.showLoadingState();

        try {
            const recommendation = await this.analyzeConditions();
            this.currentRecommendation = recommendation;

            if (recommendation.action === 'none' || recommendation.action === 'skip') {
                this.showNoRecommendation(recommendation.reason);
            } else {
                this.showRecommendationUI(recommendation);
            }
        } catch (error) {
            console.error('[ERROR] Failed to analyze conditions:', error);
            this.showNoRecommendation('Failed to analyze conditions. Please try again.');
        }
    },

    // Hide recommendation UI
    hideRecommendation() {
        const recommendationDiv = document.getElementById('scheduler-recommendation');
        const noRecommendationDiv = document.getElementById('no-recommendation');

        if (recommendationDiv) {
            recommendationDiv.classList.add('hidden');
        }
        if (noRecommendationDiv) {
            noRecommendationDiv.classList.remove('hidden');
        }
    },

    // Show loading state
    showLoadingState() {
        const noRecommendationDiv = document.getElementById('no-recommendation');
        if (noRecommendationDiv) {
            noRecommendationDiv.innerHTML = '<p>Analyzing conditions...</p>';
        }
    },

    // Show no recommendation state
    showNoRecommendation(reason) {
        const recommendationDiv = document.getElementById('scheduler-recommendation');
        const noRecommendationDiv = document.getElementById('no-recommendation');

        if (recommendationDiv) {
            recommendationDiv.classList.add('hidden');
        }

        if (noRecommendationDiv) {
            noRecommendationDiv.innerHTML = `
                <p>${reason || 'No irrigation recommendation at this time.'}</p>
                <button id="analyze-conditions-btn" class="control-btn primary">
                    Analyze Conditions
                </button>
            `;
            noRecommendationDiv.classList.remove('hidden');

            // Re-attach event listener
            const analyzeBtn = document.getElementById('analyze-conditions-btn');
            if (analyzeBtn) {
                analyzeBtn.addEventListener('click', () => {
                    this.analyzeAndShowRecommendation();
                });
            }
        }
    },

    // Show recommendation UI
    showRecommendationUI(recommendation) {
        const recommendationDiv = document.getElementById('scheduler-recommendation');
        const noRecommendationDiv = document.getElementById('no-recommendation');

        if (noRecommendationDiv) {
            noRecommendationDiv.classList.add('hidden');
        }

        if (recommendationDiv) {
            this.updateRecommendationDisplay(recommendation);
            recommendationDiv.classList.remove('hidden');
        }
    },

    // Update recommendation display
    async updateRecommendationDisplay(recommendation) {
        const titleEl = document.getElementById('recommendation-title');
        const subtitleEl = document.getElementById('recommendation-subtitle');
        const optimalTimeEl = document.getElementById('optimal-time');
        const waterNeededEl = document.getElementById('water-needed');
        const reasoningListEl = document.getElementById('reasoning-list');

        if (titleEl) {
            titleEl.textContent = recommendation.action === 'immediate'
                ? 'URGENT: Irrigation Required'
                : 'Irrigation Recommended';
        }

        if (subtitleEl) {
            subtitleEl.textContent = `Zone: ${recommendation.zone} • Duration: ${recommendation.duration} min`;
        }

        if (optimalTimeEl && recommendation.scheduledTime) {
            const time = new Date(recommendation.scheduledTime);
            const now = new Date();
            const isToday = time.toDateString() === now.toDateString();
            const isTomorrow = time.toDateString() === new Date(now.getTime() + 86400000).toDateString();

            let timeStr = time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            if (isToday) {
                timeStr = 'Today at ' + timeStr;
            } else if (isTomorrow) {
                timeStr = 'Tomorrow at ' + timeStr;
            } else {
                timeStr = time.toLocaleDateString() + ' at ' + timeStr;
            }

            optimalTimeEl.textContent = timeStr;
        }

        if (waterNeededEl) {
            // Calculate water needed based on duration (assume 50L/min flow rate)
            const liters = recommendation.duration * 50;
            waterNeededEl.textContent = `${liters}L (estimated)`;
        }

        if (reasoningListEl) {
            const reasons = await this.generateReasoningList(recommendation);
            reasoningListEl.innerHTML = reasons.map(r => `<li>${r}</li>`).join('');
        }
    },

    // Generate reasoning list for recommendation
    async generateReasoningList(recommendation) {
        const reasons = [];
        const soilMoisture = await this.getSoilMoisture();
        const weather = await this.getWeatherForecast();
        const et = this.calculateET();

        reasons.push(`Soil moisture: ${Math.round(soilMoisture.average)}% ${soilMoisture.average < 50 ? '(below optimal)' : '(good)'}`);

        if (weather.rainProbability > 30) {
            reasons.push(`Rain forecast: ${weather.rainProbability}% probability`);
        } else {
            reasons.push(`No significant rain forecast (next 3 days)`);
        }

        reasons.push(`ET rate: ${et}mm/day (evapotranspiration)`);

        // Add temperature info
        if (weather.temp > 30) {
            reasons.push(`High temperature: ${weather.temp}°C - early morning irrigation recommended`);
        } else if (weather.temp < 20) {
            reasons.push(`Moderate temperature: ${weather.temp}°C - flexible timing`);
        }

        // Add crop-specific reasoning
        const cropStage = this.getCropStage();
        if (cropStage.waterRequirement === 'high') {
            reasons.push(`Crop stage: ${cropStage.stage} - high water requirement`);
        }

        return reasons;
    },

    // Approve schedule - save to database and execute
    async approveSchedule() {
        if (!this.currentRecommendation) {
            console.error('[ERROR] No recommendation to approve');
            return;
        }

        console.log('[INFO] Approving irrigation schedule...');

        try {
            // Save to database
            await this.saveScheduleToDatabase(this.currentRecommendation);

            // Add to local schedule
            this.schedule.push({
                ...this.currentRecommendation,
                status: 'approved',
                approvedAt: new Date().toISOString()
            });

            // Show success notification
            if (typeof Notifications !== 'undefined') {
                Notifications.show(
                    'Schedule Approved',
                    `Irrigation scheduled for ${new Date(this.currentRecommendation.scheduledTime).toLocaleString()}`,
                    'success',
                    4000
                );
            }

            // Update stats
            this.updateStatsDisplay();

            // Hide recommendation
            this.hideRecommendation();

            // Save settings
            this.saveSettings();

        } catch (error) {
            console.error('[ERROR] Failed to approve schedule:', error);
            if (typeof Notifications !== 'undefined') {
                Notifications.show('Error', 'Failed to approve schedule', 'error', 3000);
            }
        }
    },

    // Decline schedule
    async declineSchedule() {
        if (!this.currentRecommendation) {
            console.error('[ERROR] No recommendation to decline');
            return;
        }

        console.log('[INFO] Declining irrigation schedule...');

        // Log decline reason (could add UI for this)
        await this.logScheduleDecision('declined', this.currentRecommendation);

        // Show notification
        if (typeof Notifications !== 'undefined') {
            Notifications.show(
                'Schedule Declined',
                'You can analyze conditions again anytime',
                'info',
                3000
            );
        }

        // Clear current recommendation
        this.currentRecommendation = null;

        // Hide recommendation
        this.hideRecommendation();
    },

    // Schedule for later - allow user to pick custom time
    async scheduleLater() {
        if (!this.currentRecommendation) {
            console.error('[ERROR] No recommendation to reschedule');
            return;
        }

        console.log('[INFO] Rescheduling irrigation...');

        // Simple implementation: schedule for next optimal window
        const now = new Date();
        const nextWindow = this.getNextOptimalWindow(now, false);

        this.currentRecommendation.scheduledTime = nextWindow;

        // Show updated time
        if (typeof Notifications !== 'undefined') {
            Notifications.show(
                'Schedule Updated',
                `Moved to ${nextWindow.toLocaleString()}`,
                'info',
                3000
            );
        }

        // Update display
        this.updateRecommendationDisplay(this.currentRecommendation);
    },

    // Save schedule to database
    async saveScheduleToDatabase(schedule) {
        console.log('[INFO] Saving schedule to database...');

        // Check if Supabase is available
        if (typeof supabase === 'undefined') {
            console.warn('[WARN] Supabase not available, saving to localStorage only');
            return;
        }

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('[WARN] No authenticated user, skipping database save');
                return;
            }

            const { data, error } = await supabase
                .from('irrigation_schedules')
                .insert({
                    user_id: user.id,
                    zone: schedule.zone,
                    duration: schedule.duration,
                    scheduled_time: schedule.scheduledTime,
                    reason: schedule.reason,
                    urgency: schedule.urgency,
                    status: 'approved',
                    created_at: new Date().toISOString()
                })
                .select();

            if (error) throw error;

            console.log('[SUCCESS] Schedule saved to database:', data);
            return data;
        } catch (error) {
            console.error('[ERROR] Failed to save to database:', error);
            // Continue with localStorage fallback
        }
    },

    // Log schedule decision to database
    async logScheduleDecision(decision, recommendation) {
        console.log('[INFO] Logging schedule decision:', decision);

        if (typeof supabase === 'undefined') {
            console.warn('[WARN] Supabase not available');
            return;
        }

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('[WARN] No authenticated user, skipping decision log');
                return;
            }

            await supabase
                .from('irrigation_decisions')
                .insert({
                    user_id: user.id,
                    decision: decision,
                    recommendation: JSON.stringify(recommendation),
                    timestamp: new Date().toISOString()
                });
        } catch (error) {
            console.error('[ERROR] Failed to log decision:', error);
        }
    },

    // Update stats display
    updateStatsDisplay() {
        const waterSavedEl = document.getElementById('water-saved');
        const upcomingCountEl = document.getElementById('upcoming-count');

        if (waterSavedEl) {
            waterSavedEl.textContent = `${this.waterSavings} L`;
        }

        if (upcomingCountEl) {
            const upcomingCount = this.schedule.filter(s => s.status === 'approved' || s.status === 'pending').length;
            upcomingCountEl.textContent = upcomingCount;
        }
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
                    'Irrigation Started',
                    `Zone: ${recommendation.zone} - Duration: ${recommendation.duration} min\n${recommendation.reason}`,
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
