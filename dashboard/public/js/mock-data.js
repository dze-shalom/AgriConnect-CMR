/**
 * Mock Data Generator
 * Generates realistic 30-day historical sensor data for development/demo
 * Only used when hardware is not connected
 */

const MockData = {
    // Configuration
    config: {
        daysOfHistory: 30,
        readingsPerDay: 48, // Every 30 minutes
        zones: ['field1-zone1', 'field1-zone2', 'field1-zone3', 'field2-zone1', 'field2-zone2']
    },

    // Cached data to avoid regeneration
    historicalData: null,
    hardwareConnected: null,
    lastConnectionCheck: null,

    // Initialize mock data system
    async init() {
        console.log('[INFO] Initializing mock data system...');

        // Check hardware connection
        await this.checkHardwareConnection();

        // Generate historical data if hardware not connected
        if (!this.hardwareConnected) {
            console.log('[INFO] Hardware not connected - generating mock data');
            this.generateHistoricalData();

            // Continue generating current day data
            this.startLiveDataGeneration();
        } else {
            console.log('[INFO] Hardware connected - using real data');
        }

        // Periodically check hardware connection (every 30 seconds)
        setInterval(() => this.checkHardwareConnection(), 30000);

        console.log('[SUCCESS] Mock data system initialized');
    },

    // Check if hardware is connected
    async checkHardwareConnection() {
        try {
            // Try to fetch recent sensor data from Supabase
            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('reading_id')
                .eq('farm_id', CONFIG.farmId)
                .order('timestamp', { ascending: false })
                .limit(1);

            // If we have real data from last 5 minutes, hardware is connected
            if (data && data.length > 0) {
                this.hardwareConnected = true;
                this.lastConnectionCheck = new Date();
                return true;
            } else {
                this.hardwareConnected = false;
                this.lastConnectionCheck = new Date();
                return false;
            }
        } catch (error) {
            console.log('[INFO] Database connection check failed - assuming no hardware');
            this.hardwareConnected = false;
            this.lastConnectionCheck = new Date();
            return false;
        }
    },

    // Generate 30 days of historical sensor data
    generateHistoricalData() {
        console.log('[INFO] Generating 30-day historical data...');

        const data = [];
        const now = new Date();
        const { daysOfHistory, readingsPerDay, zones } = this.config;

        // Generate data for past 30 days
        for (let day = daysOfHistory; day >= 0; day--) {
            for (let reading = 0; reading < readingsPerDay; reading++) {
                const timestamp = new Date(now);
                timestamp.setDate(timestamp.getDate() - day);
                timestamp.setHours(0, reading * 30, 0, 0); // Every 30 minutes

                // Generate data for each zone
                zones.forEach((zone, index) => {
                    const fieldNum = zone.includes('field1') ? 1 : 2;
                    const zoneNum = parseInt(zone.match(/zone(\d)/)[1]);

                    data.push(this.generateReading(timestamp, fieldNum, zoneNum, zone));
                });
            }
        }

        this.historicalData = data;
        console.log(`[SUCCESS] Generated ${data.length} historical readings`);

        return data;
    },

    // Generate a single realistic sensor reading
    // Optimized for tomato farming in Tole, Buea, Cameroon
    generateReading(timestamp, fieldNum, zoneNum, zoneId) {
        const hour = timestamp.getHours();
        const dayOfYear = Math.floor((timestamp - new Date(timestamp.getFullYear(), 0, 0)) / 86400000);
        const month = timestamp.getMonth() + 1; // 1-12

        // TOLE, BUEA CLIMATE REALITY
        // Rainy season: March-October (high rainfall, high humidity)
        // Dry season: November-February (less rain, better for tomatoes)
        const isRainySeason = month >= 3 && month <= 10;
        const isOptimalSeason = month >= 11 || month <= 2; // Dry season = tomato planting time

        // Temperature: 18-28°C (cooler due to elevation ~500m on Mt. Cameroon)
        // Cooler at night, warmer midday
        const tempBase = isRainySeason ? 22 : 24; // Slightly cooler in rainy season
        const tempDailyVariation = 6 * Math.sin(((hour - 6) / 24) * 2 * Math.PI); // Peak at 2pm
        const airTemp = Math.max(18, Math.min(28, tempBase + tempDailyVariation + (Math.random() - 0.5) * 1.5));

        // Humidity: 75-95% (ONE OF WETTEST PLACES IN AFRICA!)
        // Challenge for tomatoes - high disease pressure
        const humidityBase = isRainySeason ? 88 : 78; // Very high in rainy season
        const humidityDailyVariation = -10 * Math.sin(((hour - 6) / 24) * 2 * Math.PI); // Lower at midday
        const airHumidity = Math.max(70, Math.min(95, humidityBase + humidityDailyVariation + (Math.random() - 0.5) * 3));

        // Rainfall simulation (mm/day)
        const rainfallProbability = isRainySeason ? 0.7 : 0.2;
        const hasRainToday = Math.random() < rainfallProbability;
        const rainfallToday = hasRainToday ? (isRainySeason ? 15 + Math.random() * 40 : 2 + Math.random() * 8) : 0;

        // Soil moisture for tomatoes: Target 60-80%
        // Affected by rainfall and irrigation
        const isIrrigationTime = hour === 6 || hour === 7; // Early morning irrigation (avoid disease)
        let soilMoistureBase = 65;
        if (hasRainToday) soilMoistureBase += 15; // Rain increases moisture
        if (isIrrigationTime) soilMoistureBase += 10; // Irrigation increases moisture
        const hoursSinceLastWater = (hour > 7 ? hour - 7 : 24 - 7 + hour);
        const evaporation = hoursSinceLastWater * 1.2; // Moisture decreases over day
        const soilMoisture = Math.max(45, Math.min(85, soilMoistureBase - evaporation + (Math.random() - 0.5) * 5));

        // pH for tomatoes: Target 6.0-6.8 (volcanic soil in Buea tends slightly acidic)
        const pH = 6.2 + (zoneNum * 0.1) + (Math.random() - 0.5) * 0.4;

        // EC for tomatoes: Target 2.0-3.5 mS/cm
        const ec = 2.4 + (fieldNum === 1 ? 0 : 0.3) + (Math.random() - 0.5) * 0.4;

        // NPK levels for tomato growth
        // High P and K during fruiting, high N during vegetative growth
        const cropAgeDays = (dayOfYear % 90); // 90-day crop cycle
        const isVegetative = cropAgeDays < 30;
        const isFruiting = cropAgeDays >= 50;

        const nitrogen = isVegetative ? 60 + Math.random() * 20 : 35 + Math.random() * 15;
        const phosphorus = isFruiting ? 45 + Math.random() * 15 : 25 + Math.random() * 10;
        const potassium = isFruiting ? 70 + Math.random() * 20 : 40 + Math.random() * 15;

        // Battery level (solar charged during day)
        const batteryBase = hour >= 9 && hour <= 17 ? 92 : 80;
        const batteryLevel = Math.max(65, Math.min(100, batteryBase + (Math.random() - 0.5) * 8));

        // WATER TANK STATUS (critical sensor!)
        // 5000L tank, consumption varies by irrigation
        const waterTankCapacity = 5000;
        const isIrrigating = isIrrigationTime && hour === 6; // Simulate irrigation at 6am
        const waterTankLevel = isIrrigating ?
            3200 + Math.random() * 1000 : // During irrigation
            3800 + Math.random() * 800;   // Normal level
        const waterTankPercentage = (waterTankLevel / waterTankCapacity) * 100;

        // PUMP & IRRIGATION STATUS
        const pumpStatus = isIrrigating ? 'on' : 'off';
        const irrigationActive = isIrrigating;
        const activeZone = isIrrigating ? zoneId : null;
        const waterFlowRate = isIrrigating ? (15 + Math.random() * 5) : 0; // L/min when irrigating

        // DISEASE RISK CALCULATION (CRITICAL FOR BUEA!)
        // Late blight risk: High when humidity > 85% and temp 18-27°C
        let diseaseRiskScore = 0;
        if (airHumidity > 90) diseaseRiskScore += 3;
        else if (airHumidity > 85) diseaseRiskScore += 2;
        else if (airHumidity > 80) diseaseRiskScore += 1;

        if (airTemp >= 18 && airTemp <= 27) diseaseRiskScore += 2; // Optimal for blight
        if (hasRainToday && hour < 10) diseaseRiskScore += 2; // Wet leaves in morning = high risk
        if (soilMoisture > 80) diseaseRiskScore += 1; // Too wet

        const diseaseRiskLevel = diseaseRiskScore >= 6 ? 'critical' :
                                 diseaseRiskScore >= 4 ? 'high' :
                                 diseaseRiskScore >= 2 ? 'moderate' : 'low';

        // Growth stage tracking
        const growthStage = cropAgeDays < 20 ? 'seedling' :
                           cropAgeDays < 40 ? 'vegetative' :
                           cropAgeDays < 70 ? 'flowering' : 'fruiting';

        return {
            reading_id: `mock_${timestamp.getTime()}_${zoneId}`,
            farm_id: CONFIG.farmId,
            field_number: fieldNum,
            zone_number: zoneNum,
            zone_id: zoneId,
            timestamp: timestamp.toISOString(),

            // Environmental sensors
            air_temperature: parseFloat(airTemp.toFixed(1)),
            air_humidity: parseFloat(airHumidity.toFixed(1)),
            soil_moisture: parseFloat(soilMoisture.toFixed(1)),
            soil_temperature: parseFloat((airTemp - 1.5 + (Math.random() - 0.5) * 0.8).toFixed(1)),
            rainfall_today: parseFloat(rainfallToday.toFixed(1)),

            // Soil chemistry
            ph: parseFloat(pH.toFixed(2)),
            ec: parseFloat(ec.toFixed(2)),
            nitrogen: parseFloat(nitrogen.toFixed(1)),
            phosphorus: parseFloat(phosphorus.toFixed(1)),
            potassium: parseFloat(potassium.toFixed(1)),

            // Water system sensors
            water_tank_level: Math.round(waterTankLevel),
            water_tank_capacity: waterTankCapacity,
            water_tank_percentage: parseFloat(waterTankPercentage.toFixed(1)),
            water_flow_rate: parseFloat(waterFlowRate.toFixed(1)),

            // Irrigation status
            pump_status: pumpStatus,
            irrigation_active: irrigationActive,
            active_zone: activeZone,

            // System health
            battery_level: parseFloat(batteryLevel.toFixed(1)),
            status: batteryLevel > 20 ? 'online' : 'low_battery',
            signal_strength: Math.floor(70 + Math.random() * 30),

            // Disease risk (CRITICAL for Buea!)
            disease_risk_score: diseaseRiskScore,
            disease_risk_level: diseaseRiskLevel,

            // Crop management
            crop_type: 'tomato',
            crop_age_days: cropAgeDays,
            growth_stage: growthStage,
            season_type: isOptimalSeason ? 'optimal_dry' : 'challenging_rainy'
        };
    },

    // Start generating live data for current day
    startLiveDataGeneration() {
        // Generate new reading every 30 minutes
        setInterval(() => {
            if (!this.hardwareConnected) {
                const { zones } = this.config;
                const now = new Date();

                zones.forEach((zone, index) => {
                    const fieldNum = zone.includes('field1') ? 1 : 2;
                    const zoneNum = parseInt(zone.match(/zone(\d)/)[1]);

                    const newReading = this.generateReading(now, fieldNum, zoneNum, zone);

                    // Add to historical data
                    if (this.historicalData) {
                        this.historicalData.push(newReading);
                    }

                    console.log(`[MOCK] Generated reading for ${zone}`);
                });

                // Trigger dashboard refresh
                if (typeof Dashboard !== 'undefined' && Dashboard.loadSensorData) {
                    Dashboard.loadSensorData();
                }
            }
        }, 30 * 60 * 1000); // Every 30 minutes
    },

    // Get sensor data (used by dashboard)
    async getSensorData() {
        if (this.hardwareConnected) {
            // Use real data from Supabase
            return await this.getRealData();
        } else {
            // Use mock data
            return this.getMockSensorData();
        }
    },

    // Get mock sensor data (latest from each zone)
    getMockSensorData() {
        if (!this.historicalData) {
            this.generateHistoricalData();
        }

        // Get latest reading for each zone
        const latestByZone = {};

        this.historicalData.forEach(reading => {
            const zone = reading.zone_id;
            if (!latestByZone[zone] || new Date(reading.timestamp) > new Date(latestByZone[zone].timestamp)) {
                latestByZone[zone] = reading;
            }
        });

        return {
            data: Object.values(latestByZone),
            error: null
        };
    },

    // Get historical data for charts
    async getHistoricalData(hours = 168) {
        if (this.hardwareConnected) {
            return await this.getRealHistoricalData(hours);
        } else {
            return this.getMockHistoricalData(hours);
        }
    },

    // Get mock historical data
    getMockHistoricalData(hours) {
        if (!this.historicalData) {
            this.generateHistoricalData();
        }

        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - hours);

        const filtered = this.historicalData.filter(reading =>
            new Date(reading.timestamp) >= cutoffTime
        );

        return {
            data: filtered,
            error: null
        };
    },

    // Get real data from Supabase
    async getRealData() {
        try {
            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('*')
                .eq('farm_id', CONFIG.farmId)
                .order('timestamp', { ascending: false })
                .limit(10);

            return { data, error };
        } catch (error) {
            console.error('[ERROR] Failed to fetch real data:', error);
            return { data: null, error };
        }
    },

    // Get real historical data
    async getRealHistoricalData(hours) {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hours);

            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('*')
                .eq('farm_id', CONFIG.farmId)
                .gte('timestamp', cutoffTime.toISOString())
                .order('timestamp', { ascending: true });

            return { data, error };
        } catch (error) {
            console.error('[ERROR] Failed to fetch real historical data:', error);
            return { data: null, error };
        }
    },

    // Check if using mock data
    isUsingMockData() {
        return !this.hardwareConnected;
    }
};
