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
    generateReading(timestamp, fieldNum, zoneNum, zoneId) {
        const hour = timestamp.getHours();
        const dayOfYear = Math.floor((timestamp - new Date(timestamp.getFullYear(), 0, 0)) / 86400000);

        // Realistic variations based on time of day and season
        const tempBase = 25 + Math.sin((dayOfYear / 365) * 2 * Math.PI) * 5; // Seasonal variation
        const tempDailyVariation = 8 * Math.sin(((hour - 6) / 24) * 2 * Math.PI); // Daily cycle
        const airTemp = tempBase + tempDailyVariation + (Math.random() - 0.5) * 2;

        const humidityBase = 70 - Math.sin((dayOfYear / 365) * 2 * Math.PI) * 15;
        const humidityDailyVariation = -15 * Math.sin(((hour - 6) / 24) * 2 * Math.PI);
        const airHumidity = Math.max(20, Math.min(95, humidityBase + humidityDailyVariation + (Math.random() - 0.5) * 5));

        // Soil moisture decreases over time unless it's "irrigated" (simulated)
        const isIrrigationDay = dayOfYear % 3 === 0; // Irrigate every 3 days
        const soilMoistureBase = isIrrigationDay ? 70 : 50 - (dayOfYear % 3) * 8;
        const soilMoisture = Math.max(20, Math.min(80, soilMoistureBase + (Math.random() - 0.5) * 5));

        // pH relatively stable with slight zone variation
        const pH = 6.5 + (zoneNum * 0.2) + (Math.random() - 0.5) * 0.3;

        // EC varies by field
        const ec = (fieldNum === 1 ? 1.2 : 1.5) + (Math.random() - 0.5) * 0.2;

        // NPK levels with realistic variation
        const nitrogen = 45 + (Math.random() - 0.5) * 10;
        const phosphorus = 30 + (Math.random() - 0.5) * 8;
        const potassium = 50 + (Math.random() - 0.5) * 12;

        // Battery level decreases slowly, "recharges" during day
        const batteryBase = hour >= 10 && hour <= 16 ? 95 : 85;
        const batteryLevel = Math.max(70, Math.min(100, batteryBase + (Math.random() - 0.5) * 5));

        return {
            reading_id: `mock_${timestamp.getTime()}_${zoneId}`,
            farm_id: CONFIG.farmId,
            field_number: fieldNum,
            zone_number: zoneNum,
            zone_id: zoneId,
            timestamp: timestamp.toISOString(),
            air_temperature: parseFloat(airTemp.toFixed(1)),
            air_humidity: parseFloat(airHumidity.toFixed(1)),
            soil_moisture: parseFloat(soilMoisture.toFixed(1)),
            soil_temperature: parseFloat((airTemp - 2 + (Math.random() - 0.5)).toFixed(1)),
            ph: parseFloat(pH.toFixed(2)),
            ec: parseFloat(ec.toFixed(2)),
            nitrogen: parseFloat(nitrogen.toFixed(1)),
            phosphorus: parseFloat(phosphorus.toFixed(1)),
            potassium: parseFloat(potassium.toFixed(1)),
            battery_level: parseFloat(batteryLevel.toFixed(1)),
            status: batteryLevel > 20 ? 'online' : 'low_battery',
            signal_strength: Math.floor(70 + Math.random() * 30)
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
