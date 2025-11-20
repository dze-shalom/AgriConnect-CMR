/**
 * Mock Data Generator
 * Generates realistic sensor data for testing without hardware
 */

const MockData = {
    isEnabled: false,
    generationInterval: null,
    lastGeneratedTime: Date.now(),

    // Enable mock data generation
    enable() {
        if (this.isEnabled) {
            console.log('[MOCK] Already enabled');
            return;
        }

        console.log('[MOCK] Enabling mock data generation...');
        this.isEnabled = true;

        // Update button state
        const btn = document.getElementById('mock-data-toggle-btn');
        if (btn) {
            btn.classList.add('active');
            btn.textContent = '🟢 Mock Data ON';
        }

        // Generate initial batch of historical data (reduced for faster loading)
        this.generateHistoricalData(20);

        // Start generating new readings every 30 seconds
        this.generationInterval = setInterval(() => {
            this.generateReading();
        }, 30000); // Every 30 seconds

        console.log('[SUCCESS] Mock data generation enabled');

        // Notification removed to reduce UI spam
        // Data is being generated in background silently
    },

    // Disable mock data generation
    disable() {
        if (!this.isEnabled) return;

        console.log('[MOCK] Disabling mock data generation...');
        this.isEnabled = false;

        // Update button state
        const btn = document.getElementById('mock-data-toggle-btn');
        if (btn) {
            btn.classList.remove('active');
            btn.textContent = '🔧 Mock Data OFF';
        }

        if (this.generationInterval) {
            clearInterval(this.generationInterval);
            this.generationInterval = null;
        }

        console.log('[SUCCESS] Mock data generation disabled');

        // Notification removed to reduce UI spam
    },

    // Generate historical data in batches (non-blocking)
    async generateHistoricalData(count = 20) {
        console.log(`[MOCK] Generating ${count} historical readings from yesterday to now...`);

        const readings = [];
        const now = Date.now();
        const intervalMs = 30 * 60 * 1000; // 30 minutes between readings (yesterday to today)

        // Generate readings from yesterday to now
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        for (let i = 0; i < count; i++) {
            const timestamp = new Date(oneDayAgo + ((now - oneDayAgo) / count) * i);
            readings.push(this.createReading(timestamp));
        }

        // Insert in batches of 10 to avoid blocking
        const batchSize = 10;
        let isFirstBatch = true;

        try {
            for (let i = 0; i < readings.length; i += batchSize) {
                const batch = readings.slice(i, i + batchSize);

                const { error } = await window.supabase
                    .from('sensor_readings')
                    .insert(batch);

                if (error) {
                    console.error('[MOCK] Failed to insert batch:', error);
                }

                // Load charts immediately after first batch so users see something right away
                if (isFirstBatch) {
                    isFirstBatch = false;
                    console.log('[MOCK] First batch inserted, loading charts...');

                    if (typeof Charts !== 'undefined') {
                        await Charts.loadCharts();
                    }
                    if (typeof Dashboard !== 'undefined') {
                        await Dashboard.loadSensorData();
                    }
                }

                // Small delay between batches to keep UI responsive
                if (i + batchSize < readings.length) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            console.log(`[SUCCESS] Generated ${count} historical readings`);

            // Final refresh after all batches complete
            setTimeout(async () => {
                if (typeof Dashboard !== 'undefined') {
                    await Dashboard.loadRecentReadings();
                }

                if (typeof Charts !== 'undefined') {
                    await Charts.loadCharts();
                }
            }, 200);

        } catch (error) {
            console.error('[MOCK] Error generating historical data:', error);
        }
    },

    // Generate single reading
    async generateReading() {
        if (!this.isEnabled) return;

        console.log('[MOCK] Generating new sensor reading...');

        const reading = this.createReading();

        try {
            const { error } = await window.supabase
                .from('sensor_readings')
                .insert([reading]);

            if (error) {
                console.error('[MOCK] Failed to insert reading:', error);
            } else {
                console.log('[SUCCESS] Generated mock reading');

                // Trigger real-time update simulation
                if (typeof Realtime !== 'undefined') {
                    Realtime.handleNewSensorReading(reading);
                }
            }
        } catch (error) {
            console.error('[MOCK] Error generating reading:', error);
        }
    },

    // Create a realistic sensor reading
    createReading(timestamp = new Date()) {
        // Simulate daily temperature variation
        const hour = timestamp.getHours();
        const baseTemp = 24; // Base temperature in °C
        const tempVariation = 4 * Math.sin((hour - 6) * Math.PI / 12); // Peak at ~14:00

        // Add some random noise
        const temp = baseTemp + tempVariation + (Math.random() * 2 - 1);
        const humidity = 70 + (Math.random() * 20 - 10); // 60-80%
        const soilMoisture = 500 + (Math.random() * 100 - 50); // 450-550

        // pH should be stable around 6.5
        const ph = 6.5 + (Math.random() * 0.6 - 0.3); // 6.2-6.8

        // EC varies with nutrients
        const ec = 1.8 + (Math.random() * 0.4 - 0.2); // 1.6-2.0

        // NPK values
        const nitrogen = 180 + (Math.random() * 40 - 20); // 160-200 ppm
        const phosphorus = 60 + (Math.random() * 20 - 10); // 50-70 ppm
        const potassium = 280 + (Math.random() * 40 - 20); // 260-300 ppm

        // Battery level slowly decreases
        const batteryBase = 85 - (Date.now() - this.lastGeneratedTime) / (1000 * 60 * 60 * 24 * 7); // Decrease over week
        const battery = Math.max(20, Math.min(100, batteryBase + (Math.random() * 10 - 5)));

        // Random field and zone
        const field = Math.floor(Math.random() * 3) + 1; // Fields 1-3
        const zone = Math.floor(Math.random() * 4) + 1;  // Zones 1-4

        return {
            farm_id: CONFIG.farmId,
            field_id: field,
            zone_id: zone,
            reading_time: timestamp.toISOString(),
            air_temperature: parseFloat(temp.toFixed(1)),
            air_humidity: parseFloat(humidity.toFixed(1)),
            soil_moisture: parseInt(soilMoisture),
            ph_value: parseFloat(ph.toFixed(2)),
            ec_value: parseFloat(ec.toFixed(2)),
            nitrogen_ppm: parseInt(nitrogen),
            phosphorus_ppm: parseInt(phosphorus),
            potassium_ppm: parseInt(potassium),
            battery_level: parseFloat(battery.toFixed(1))
        };
    },

    // Toggle mock data on/off
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
};

// Show mock data button
MockData.showButton = function() {
    const btn = document.getElementById('mock-data-toggle-btn');
    if (btn) {
        btn.style.display = 'flex';
    }
};

// Auto-enable mock data if no real data exists
window.addEventListener('load', async () => {
    // Wait a bit for other modules to initialize
    setTimeout(async () => {
        try {
            // Show the toggle button
            MockData.showButton();

            // Check if we have any recent sensor data
            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('reading_id')
                .gte('reading_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(1);

            if (error) {
                console.error('[MOCK] Failed to check for existing data:', error);
                // Enable mock data by default on error
                console.log('[MOCK] Enabling mock data mode due to database error');
                MockData.enable();
                return;
            }

            // If no data in last 24 hours, enable mock data
            if (!data || data.length === 0) {
                console.log('[MOCK] No recent data found, auto-enabling mock data mode');
                MockData.enable();
            } else {
                console.log('[MOCK] Recent data found, mock mode available but not auto-enabled');
            }
        } catch (error) {
            console.error('[MOCK] Error checking for data:', error);
            // Enable mock data by default on error
            MockData.enable();
        }
    }, 1000); // Wait 1 second after page load for faster startup
});
