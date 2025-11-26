/**
 * Dashboard Module
 * Handles data loading and display
 */

const Dashboard = {
    refreshTimer: null,
    latestReadings: {},
    domCache: {}, // Cache for frequently accessed DOM elements

    // Initialize dashboard
    async init() {
        console.log('[INFO] Initializing dashboard...');

        // Cache frequently used DOM elements
        this.cacheDOMElements();

        // Load initial data
        await this.loadFarmInfo();
        await this.loadAlerts();
        await this.loadSensorData();
        await this.loadRecentReadings();

        // Start auto-refresh
        this.startAutoRefresh();

        // Initialize additional dashboard modules
        if (typeof window.initDashboardModules === 'function') {
            await window.initDashboardModules();
        }

        console.log('[SUCCESS] Dashboard initialized');
    },

    // Cache DOM elements to avoid repeated queries
    cacheDOMElements() {
        this.domCache = {
            farmName: document.getElementById('farm-name'),
            alertsContainer: document.getElementById('alerts-container'),
            alertsCount: document.getElementById('alerts-count'),
            sensorsGrid: document.getElementById('sensors-grid'),
            readingsTableBody: document.querySelector('#readings-table tbody'),
            lastUpdate: document.getElementById('last-update'),
            statusBadge: document.getElementById('status-badge'),
            // Cache sensor value elements
            airTempValue: document.getElementById('air-temp-value'),
            airHumidityValue: document.getElementById('air-humidity-value'),
            soilMoistureValue: document.getElementById('soil-moisture-value'),
            phValue: document.getElementById('ph-value'),
            ecValue: document.getElementById('ec-value'),
            batteryLevelValue: document.getElementById('battery-level-value')
        };
    },
    
    // Load farm information
    async loadFarmInfo() {
        try {
            const { data, error } = await window.supabase
                .from('farms')
                .select('name')
                .eq('farm_id', CONFIG.farmId)
                .single();

            if (error) throw error;

            const farmNameEl = this.domCache.farmName || document.getElementById('farm-name');
            if (farmNameEl) {
                farmNameEl.textContent = data ? data.name : CONFIG.farmId;
            }

        } catch (error) {
            console.error('[ERROR] Failed to load farm info:', error.message);
            const farmNameEl = this.domCache.farmName || document.getElementById('farm-name');
            if (farmNameEl) {
                farmNameEl.textContent = CONFIG.farmId;
            }
        }
    },
    
    // Load active alerts
    async loadAlerts() {
        try {
            const { data, error } = await window.supabase
                .from('alerts')
                .select('*')
                .eq('farm_id', CONFIG.farmId)
                .eq('acknowledged', false)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            const container = this.domCache.alertsContainer || document.getElementById('alerts-container');
            const countBadge = this.domCache.alertsCount || document.getElementById('alerts-count');

            if (!container) return;

            if (!data || data.length === 0) {
                container.innerHTML = '<div class="loading">No active alerts - all systems normal</div>';
                if (countBadge) countBadge.textContent = '0';
                return;
            }

            // Update count
            if (countBadge) countBadge.textContent = data.length;

            // Render alerts
            container.innerHTML = data.map(alert => this.renderAlert(alert)).join('');

        } catch (error) {
            console.error('[ERROR] Failed to load alerts:', error.message);
            const container = this.domCache.alertsContainer || document.getElementById('alerts-container');
            if (container) {
                container.innerHTML = '<div class="loading">Failed to load alerts</div>';
            }
        }
    },
    
    // Render single alert
    renderAlert(alert) {
        const time = new Date(alert.created_at).toLocaleString();
        const severity = alert.severity || 'info';
        
        return `
            <div class="alert-card ${severity}">
                <div class="alert-content">
                    <div class="alert-header">
                        <span class="alert-severity">${severity}</span>
                        <span class="alert-type">${this.formatAlertType(alert.alert_type)}</span>
                    </div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">Field ${alert.field_id} Zone ${alert.zone_id} - ${time}</div>
                </div>
            </div>
        `;
    },
    
    // Format alert type for display
    formatAlertType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },
    
    // Load latest sensor data
    async loadSensorData() {
        try {
            // Use MockData if available (handles hardware connection detection)
            let data, error;
            if (typeof MockData !== 'undefined') {
                const result = await MockData.getSensorData();
                data = result.data;
                error = result.error;
            } else {
                // Fallback to direct Supabase call
                const result = await window.supabase
                    .from('sensor_readings')
                    .select('*')
                    .order('reading_time', { ascending: false })
                    .limit(20);
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            const container = document.getElementById('sensors-grid');

            if (!data || data.length === 0) {
                container.innerHTML = '<div class="loading">No sensor data available</div>';
                return;
            }

            // Get most recent reading
            const latest = data[0];
            this.latestReadings = latest;

            // Render sensor cards
            container.innerHTML = this.renderSensorCards(latest);

            // Update last update time
            this.updateLastUpdateTime(latest.timestamp || latest.reading_time);

        } catch (error) {
            console.error('[ERROR] Failed to load sensor data:', error.message);
            document.getElementById('sensors-grid').innerHTML =
                '<div class="loading">Failed to load sensor data</div>';
        }
    },
    
    // Render sensor cards
    renderSensorCards(data) {
        const cards = [];
        
        // Air Temperature
        if (data.air_temperature !== null) {
            cards.push(this.createSensorCard(
                'Air Temperature',
                data.air_temperature,
                '°C',
                this.getSensorStatus(data.air_temperature, CONFIG.sensorThresholds.airTemperature)
            ));
        }
        
        // Air Humidity
        if (data.air_humidity !== null) {
            cards.push(this.createSensorCard(
                'Air Humidity',
                data.air_humidity,
                '%',
                this.getSensorStatus(data.air_humidity, CONFIG.sensorThresholds.airHumidity)
            ));
        }
        
        // Soil Moisture
        if (data.soil_moisture !== null) {
            cards.push(this.createSensorCard(
                'Soil Moisture',
                data.soil_moisture,
                '',
                this.getSensorStatus(data.soil_moisture, CONFIG.sensorThresholds.soilMoisture)
            ));
        }
        
        // Soil Temperature
        if (data.soil_temperature !== null) {
            cards.push(this.createSensorCard(
                'Soil Temperature',
                data.soil_temperature,
                '°C',
                'optimal'
            ));
        }
        
        // pH Value (support both field names)
        const phValue = data.ph_value !== undefined ? data.ph_value : data.ph;
        if (phValue !== null && phValue !== undefined) {
            cards.push(this.createSensorCard(
                'pH Level',
                phValue,
                '',
                this.getSensorStatus(phValue, CONFIG.sensorThresholds.phValue)
            ));
        }

        // EC Value (support both field names)
        const ecValue = data.ec_value !== undefined ? data.ec_value : data.ec;
        if (ecValue !== null && ecValue !== undefined) {
            cards.push(this.createSensorCard(
                'EC Level',
                ecValue,
                'mS/cm',
                this.getSensorStatus(ecValue, CONFIG.sensorThresholds.ecValue)
            ));
        }

        // NPK (support both field naming conventions)
        const nitrogen = data.nitrogen_ppm !== undefined ? data.nitrogen_ppm : data.nitrogen;
        const phosphorus = data.phosphorus_ppm !== undefined ? data.phosphorus_ppm : data.phosphorus;
        const potassium = data.potassium_ppm !== undefined ? data.potassium_ppm : data.potassium;

        if (nitrogen !== null && nitrogen !== undefined) {
            cards.push(this.createSensorCard('Nitrogen', nitrogen, 'ppm', 'optimal'));
        }
        if (phosphorus !== null && phosphorus !== undefined) {
            cards.push(this.createSensorCard('Phosphorus', phosphorus, 'ppm', 'optimal'));
        }
        if (potassium !== null && potassium !== undefined) {
            cards.push(this.createSensorCard('Potassium', potassium, 'ppm', 'optimal'));
        }

        // Water Tank Level
        if (data.water_tank_level !== null && data.water_tank_level !== undefined) {
            cards.push(this.createSensorCard(
                'Water Tank',
                data.water_tank_level,
                'L',
                data.water_tank_percentage > 30 ? 'optimal' : 'warning',
                data.water_tank_percentage ? `${data.water_tank_percentage.toFixed(1)}%` : null
            ));
        }

        // Irrigation Status
        if (data.irrigation_active !== undefined) {
            const irrigationStatus = data.irrigation_active ? 'Active' : 'Inactive';
            const activeZone = data.active_zone || 'None';
            cards.push(this.createSensorCard(
                'Irrigation',
                irrigationStatus,
                '',
                data.irrigation_active ? 'optimal' : 'normal',
                data.irrigation_active ? `Zone: ${activeZone}` : null
            ));
        }

        // Pump Status
        if (data.pump_status !== undefined) {
            cards.push(this.createSensorCard(
                'Pump',
                data.pump_status.toUpperCase(),
                '',
                data.pump_status === 'on' ? 'optimal' : 'normal'
            ));
        }

        // Disease Risk
        if (data.disease_risk_level !== undefined) {
            const riskColors = {
                'low': 'optimal',
                'moderate': 'normal',
                'high': 'warning',
                'critical': 'critical'
            };
            cards.push(this.createSensorCard(
                'Disease Risk',
                data.disease_risk_level.charAt(0).toUpperCase() + data.disease_risk_level.slice(1),
                '',
                riskColors[data.disease_risk_level] || 'normal',
                data.disease_risk_score ? `Score: ${data.disease_risk_score}` : null
            ));
        }
        
        // Light & PAR
        if (data.light_intensity !== null) {
            cards.push(this.createSensorCard('Light Intensity', data.light_intensity, 'Lux', 'optimal'));
        }
        if (data.par_value !== null) {
            cards.push(this.createSensorCard('PAR', data.par_value, 'µmol/m²/s', 'optimal'));
        }
        
        // Battery
        if (data.battery_level !== null) {
            cards.push(this.createSensorCard(
                'Battery',
                data.battery_level,
                '%',
                this.getSensorStatus(data.battery_level, CONFIG.sensorThresholds.batteryLevel)
            ));
        }
        
        return cards.join('');
    },
    
    // Create sensor card HTML
    createSensorCard(label, value, unit, status, subtitle = null) {
        // Handle non-numeric values (like "Active", "ON", "OFF", etc.)
        const displayValue = typeof value === 'number' ? value.toFixed(1) : value;
        const subtitleHTML = subtitle ? `<div class="sensor-subtitle">${subtitle}</div>` : '';

        return `
            <div class="sensor-card">
                <div class="sensor-label">${label}</div>
                <div class="sensor-value">
                    ${displayValue}
                    <span class="sensor-unit">${unit}</span>
                </div>
                ${subtitleHTML}
                <span class="sensor-status ${status}">${status}</span>
            </div>
        `;
    },
    
    // Get sensor status based on threshold
    getSensorStatus(value, threshold) {
        if (!threshold) return 'optimal';
        
        if (value < threshold.min) return 'critical';
        if (value > threshold.max) return 'critical';
        
        const margin = (threshold.max - threshold.min) * 0.1;
        if (value < threshold.min + margin || value > threshold.max - margin) {
            return 'warning';
        }
        
        return 'optimal';
    },
    
    // Load recent readings table
    async loadRecentReadings() {
        try {
            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('*')
                .order('reading_time', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            const tbody = document.querySelector('#readings-table tbody');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="loading">No readings available</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map(reading => this.renderReadingRow(reading)).join('');
            
        } catch (error) {
            console.error('[ERROR] Failed to load readings:', error.message);
            const tbody = document.querySelector('#readings-table tbody');
            tbody.innerHTML = '<tr><td colspan="9" class="loading">Failed to load readings</td></tr>';
        }
    },
    
    // Render single reading row
    renderReadingRow(reading) {
        const time = new Date(reading.reading_time).toLocaleString();
        const status = reading.data_valid ? 'online' : 'offline';
        
        return `
            <tr>
                <td>${time}</td>
                <td>${reading.field_id}</td>
                <td>${reading.zone_id}</td>
                <td>${reading.air_temperature ? reading.air_temperature.toFixed(1) : '-'}</td>
                <td>${reading.air_humidity ? reading.air_humidity.toFixed(1) : '-'}</td>
                <td>${reading.soil_moisture || '-'}</td>
                <td>${reading.ph_value ? reading.ph_value.toFixed(1) : '-'}</td>
                <td>${reading.battery_level || '-'}</td>
                <td><span class="status-dot ${status}"></span>${status}</td>
            </tr>
        `;
    },
    
    // Update last update time
    updateLastUpdateTime(timestamp) {
        const time = new Date(timestamp).toLocaleTimeString();
        document.getElementById('last-update').textContent = `Last update: ${time}`;
    },
    
    // Export data to Excel - Enhanced with multiple sheets
    async exportToCSV() {
        try {
            console.log('[INFO] Exporting comprehensive farm data to Excel...');

            // Use MockData if available (handles both mock and real data)
            let sensorData, pumpData, irrigationData;

            if (typeof MockData !== 'undefined') {
                // Get last 30 days of data from MockData (720 hours)
                const sensorResult = await MockData.getHistoricalData(720);
                sensorData = { data: sensorResult.data, error: sensorResult.error };

                // For pump and irrigation, try Supabase (fall back to empty if not available)
                try {
                    const [pumpResult, irrigationResult] = await Promise.all([
                        window.supabase
                            .from('pump_commands')
                            .select('*')
                            .order('executed_at', { ascending: false })
                            .limit(500),
                        window.supabase
                            .from('irrigation_logs')
                            .select('*')
                            .order('started_at', { ascending: false })
                            .limit(500)
                    ]);
                    pumpData = pumpResult;
                    irrigationData = irrigationResult;
                } catch (err) {
                    console.log('[INFO] Pump/irrigation data not available (using mock data mode)');
                    pumpData = { data: [], error: null };
                    irrigationData = { data: [], error: null };
                }
            } else {
                // Fallback to direct Supabase
                [sensorData, pumpData, irrigationData] = await Promise.all([
                    window.supabase
                        .from('sensor_readings')
                        .select('*')
                        .order('reading_time', { ascending: false })
                        .limit(1000),
                    window.supabase
                        .from('pump_commands')
                        .select('*')
                        .order('executed_at', { ascending: false })
                        .limit(500),
                    window.supabase
                        .from('irrigation_logs')
                        .select('*')
                        .order('started_at', { ascending: false })
                        .limit(500)
                ]);
            }

            if (sensorData.error || pumpData.error || irrigationData.error) {
                throw new Error('Failed to fetch data from database');
            }

            console.log(`[INFO] Excel Export - Sensor readings: ${sensorData.data ? sensorData.data.length : 0}`);
            console.log(`[INFO] Excel Export - Pump commands: ${pumpData.data ? pumpData.data.length : 0}`);
            console.log(`[INFO] Excel Export - Irrigation logs: ${irrigationData.data ? irrigationData.data.length : 0}`);

            // Check if SheetJS is available
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS library not loaded. Please refresh the page.');
            }

            // Create workbook
            const workbook = XLSX.utils.book_new();

            // ============================================
            // SHEET 1: Environmental Sensors
            // ============================================
            const envData = [];
            envData.push(['ENVIRONMENTAL SENSORS - Last 30 Days']);
            envData.push(['Location: Tole, Buea, Cameroon', '', 'Crop: Tomatoes']);
            envData.push([`Total Records: ${sensorData.data ? sensorData.data.length : 0}`]);
            envData.push([]); // Empty row

            envData.push(['Timestamp', 'Field', 'Zone', 'Air Temp (C)', 'Air Humidity (%)', 'Rainfall (mm)',
                         'Soil Moisture (%)', 'Soil Temp (C)', 'pH', 'EC (mS/cm)', 'N (ppm)', 'P (ppm)', 'K (ppm)']);

            if (sensorData.data && sensorData.data.length > 0) {
                sensorData.data.forEach(row => {
                    envData.push([
                        row.timestamp || row.reading_time,
                        row.field_number || row.field_id || '',
                        row.zone_id || `Zone ${row.zone_number}` || '',
                        row.air_temperature || '',
                        row.air_humidity || '',
                        row.rainfall_today || '0',
                        row.soil_moisture || '',
                        row.soil_temperature || '',
                        row.ph || row.ph_value || '',
                        row.ec || row.ec_value || '',
                        row.nitrogen || row.nitrogen_ppm || '',
                        row.phosphorus || row.phosphorus_ppm || '',
                        row.potassium || row.potassium_ppm || ''
                    ]);
                });
            }

            const envSheet = XLSX.utils.aoa_to_sheet(envData);
            XLSX.utils.book_append_sheet(workbook, envSheet, 'Environmental Sensors');

            // ============================================
            // SHEET 2: Water System Status
            // ============================================
            const waterData = [];
            waterData.push(['WATER SYSTEM & IRRIGATION STATUS']);
            waterData.push(['Last 30 Days']);
            waterData.push([`Total Records: ${sensorData.data ? sensorData.data.length : 0}`]);
            waterData.push([]); // Empty row

            waterData.push(['Timestamp', 'Field', 'Zone', 'Water Tank Level (L)', 'Tank Percentage (%)',
                           'Flow Rate (L/min)', 'Pump Status', 'Irrigation Active', 'Active Zone']);

            if (sensorData.data && sensorData.data.length > 0) {
                sensorData.data.forEach(row => {
                    waterData.push([
                        row.timestamp || row.reading_time,
                        row.field_number || row.field_id || '',
                        row.zone_id || `Zone ${row.zone_number}` || '',
                        row.water_tank_level || '',
                        row.water_tank_percentage || '',
                        row.water_flow_rate || '0',
                        row.pump_status || 'unknown',
                        row.irrigation_active ? 'Yes' : 'No',
                        row.active_zone || 'None'
                    ]);
                });
            }

            const waterSheet = XLSX.utils.aoa_to_sheet(waterData);
            XLSX.utils.book_append_sheet(workbook, waterSheet, 'Water System');

            // ============================================
            // SHEET 3: Disease Risk & Crop Management
            // ============================================
            const diseaseData = [];
            diseaseData.push(['DISEASE RISK & CROP MANAGEMENT']);
            diseaseData.push(['Critical for Buea high humidity environment']);
            diseaseData.push([`Total Records: ${sensorData.data ? sensorData.data.length : 0}`]);
            diseaseData.push([]); // Empty row

            diseaseData.push(['Timestamp', 'Field', 'Zone', 'Disease Risk Score', 'Disease Risk Level',
                             'Crop Type', 'Crop Age (days)', 'Growth Stage', 'Season Type']);

            if (sensorData.data && sensorData.data.length > 0) {
                sensorData.data.forEach(row => {
                    diseaseData.push([
                        row.timestamp || row.reading_time,
                        row.field_number || row.field_id || '',
                        row.zone_id || `Zone ${row.zone_number}` || '',
                        row.disease_risk_score || '0',
                        row.disease_risk_level || 'unknown',
                        row.crop_type || 'tomato',
                        row.crop_age_days || '',
                        row.growth_stage || '',
                        row.season_type || ''
                    ]);
                });
            }

            const diseaseSheet = XLSX.utils.aoa_to_sheet(diseaseData);
            XLSX.utils.book_append_sheet(workbook, diseaseSheet, 'Disease & Crop');

            // ============================================
            // SHEET 4: System Health
            // ============================================
            const healthData = [];
            healthData.push(['SYSTEM HEALTH & CONNECTIVITY']);
            healthData.push(['Battery and Signal Status']);
            healthData.push([`Total Records: ${sensorData.data ? sensorData.data.length : 0}`]);
            healthData.push([]); // Empty row

            healthData.push(['Timestamp', 'Field', 'Zone', 'Battery Level (%)', 'Status', 'Signal Strength']);

            if (sensorData.data && sensorData.data.length > 0) {
                sensorData.data.forEach(row => {
                    healthData.push([
                        row.timestamp || row.reading_time,
                        row.field_number || row.field_id || '',
                        row.zone_id || `Zone ${row.zone_number}` || '',
                        row.battery_level || '',
                        row.status || '',
                        row.signal_strength || ''
                    ]);
                });
            }

            const healthSheet = XLSX.utils.aoa_to_sheet(healthData);
            XLSX.utils.book_append_sheet(workbook, healthSheet, 'System Health');

            // ============================================
            // SHEET 5: Pump Commands
            // ============================================
            const pumpCommandData = [];
            pumpCommandData.push(['PUMP CONTROL COMMANDS']);
            pumpCommandData.push(['Command History']);
            pumpCommandData.push([`Total Commands: ${pumpData.data ? pumpData.data.length : 0}`]);
            pumpCommandData.push([]); // Empty row

            pumpCommandData.push(['Timestamp', 'Farm ID', 'Command', 'Requested By']);

            if (pumpData.data && pumpData.data.length > 0) {
                pumpData.data.forEach(row => {
                    pumpCommandData.push([
                        row.executed_at,
                        row.farm_id,
                        row.command.toUpperCase(),
                        row.requested_by || 'System'
                    ]);
                });
            } else {
                pumpCommandData.push(['No pump command history available']);
            }

            const pumpSheet = XLSX.utils.aoa_to_sheet(pumpCommandData);
            XLSX.utils.book_append_sheet(workbook, pumpSheet, 'Pump Commands');
            
            // ============================================
            // SHEET 6: Irrigation Logs
            // ============================================
            const irrigationLogData = [];
            irrigationLogData.push(['IRRIGATION LOGS']);
            irrigationLogData.push(['Irrigation Session History']);
            irrigationLogData.push([`Total Sessions: ${irrigationData.data ? irrigationData.data.length : 0}`]);
            irrigationLogData.push([]); // Empty row

            irrigationLogData.push(['Started At', 'Farm ID', 'Field ID', 'Zone ID',
                                   'Duration (min)', 'Started By', 'Completed']);

            if (irrigationData.data && irrigationData.data.length > 0) {
                irrigationData.data.forEach(row => {
                    irrigationLogData.push([
                        row.started_at,
                        row.farm_id,
                        row.field_id,
                        row.zone_id,
                        row.duration_minutes,
                        row.started_by || 'System',
                        row.completed ? 'Yes' : 'No'
                    ]);
                });
            } else {
                irrigationLogData.push(['No irrigation logs available']);
            }

            const irrigationSheet = XLSX.utils.aoa_to_sheet(irrigationLogData);
            XLSX.utils.book_append_sheet(workbook, irrigationSheet, 'Irrigation Logs');
            
            // ============================================
            // SHEET 7: Summary Statistics
            // ============================================
            const summaryData = [];
            summaryData.push(['SUMMARY STATISTICS']);
            summaryData.push(['Farm Data Overview']);
            summaryData.push([]); // Empty row

            // Calculate statistics
            const totalSensorReadings = sensorData.data?.length || 0;
            const totalPumpCommands = pumpData.data?.length || 0;
            const totalIrrigations = irrigationData.data?.length || 0;

            // Pump ON vs OFF count
            const pumpOnCount = pumpData.data?.filter(p => p.command === 'on').length || 0;
            const pumpOffCount = pumpData.data?.filter(p => p.command === 'off').length || 0;

            // Total irrigation time
            const totalIrrigationMinutes = irrigationData.data?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0;

            summaryData.push(['Metric', 'Value']);
            summaryData.push(['Total Sensor Readings', totalSensorReadings]);
            summaryData.push(['Total Pump Commands', totalPumpCommands]);
            summaryData.push(['  - Pump ON', pumpOnCount]);
            summaryData.push(['  - Pump OFF', pumpOffCount]);
            summaryData.push(['Total Irrigation Sessions', totalIrrigations]);
            summaryData.push(['Total Irrigation Time (minutes)', totalIrrigationMinutes]);
            summaryData.push(['Total Irrigation Time (hours)', (totalIrrigationMinutes / 60).toFixed(1)]);
            summaryData.push([]); // Empty row

            if (sensorData.data && sensorData.data.length > 0) {
                // Latest sensor readings
                const latest = sensorData.data[0];
                summaryData.push(['Latest Sensor Readings', '']);
                summaryData.push(['Air Temperature (C)', latest.air_temperature || 'N/A']);
                summaryData.push(['Air Humidity (%)', latest.air_humidity || 'N/A']);
                summaryData.push(['Soil Moisture', latest.soil_moisture || 'N/A']);
                summaryData.push(['pH', latest.ph || latest.ph_value || 'N/A']);
                summaryData.push(['EC (mS/cm)', latest.ec || latest.ec_value || 'N/A']);
            }

            summaryData.push([]); // Empty row
            summaryData.push(['End of Report']);

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

            // Download Excel file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            XLSX.writeFile(workbook, `AgriConnect_Farm_Data_${timestamp}.xlsx`);
            console.log('[SUCCESS] Excel file exported successfully');
            alert(`Export complete!\n\nIncluded:\n- ${totalSensorReadings} sensor readings\n- ${totalPumpCommands} pump commands\n- ${totalIrrigations} irrigation logs`);
            
        } catch (error) {
            console.error('[ERROR] Excel export failed:', error.message);
            alert(`Failed to export data: ${error.message}`);
        }
    },

    // Refresh all data
    async refresh() {
        console.log('[INFO] Refreshing dashboard data...');

        // Show loading notification
        if (typeof Notifications !== 'undefined') {
            Notifications.info('🔄 Refreshing', 'Updating dashboard data...');
        }

        await this.loadAlerts();
        await this.loadSensorData();
        await this.loadRecentReadings();

        // Refresh map if it exists
        if (typeof FarmMap !== 'undefined' && FarmMap.map) {
            await FarmMap.refresh();
        }

        // Use global refresh function if available
        if (typeof window.refreshAllModules === 'function') {
            await window.refreshAllModules();
        }
    },
    
    // Start auto-refresh timer
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, CONFIG.refreshInterval);
        
        console.log(`[INFO] Auto-refresh enabled (${CONFIG.refreshInterval / 1000}s interval)`);
    },
    
    // Stop auto-refresh timer
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('[INFO] Auto-refresh stopped');
        }
    },

    // Update dashboard with single new reading (for real-time updates)
    updateSingleReading(reading) {
        console.log('[REALTIME] Updating dashboard with new reading:', reading);

        // Batch DOM updates using requestAnimationFrame for better performance
        PerformanceUtils.batchDOMUpdates([
            () => {
                // Update sensor values using cached DOM elements
                const sensorMappings = [
                    { key: 'air_temperature', cache: 'airTempValue' },
                    { key: 'air_humidity', cache: 'airHumidityValue' },
                    { key: 'soil_moisture', cache: 'soilMoistureValue' },
                    { key: 'ph_value', cache: 'phValue' },
                    { key: 'ec_value', cache: 'ecValue' },
                    { key: 'battery_level', cache: 'batteryLevelValue' }
                ];

                sensorMappings.forEach(({ key, cache }) => {
                    if (reading[key] !== undefined && reading[key] !== null) {
                        const element = this.domCache[cache];
                        if (element) {
                            const unit = this.getSensorUnit(key);
                            element.textContent = `${reading[key]}${unit}`;

                            // Add flash animation
                            element.classList.add('flash-update');
                            setTimeout(() => element.classList.remove('flash-update'), 1000);
                        }
                    }
                });
            },
            () => {
                // Update last update time
                const lastUpdateEl = this.domCache.lastUpdate;
                if (lastUpdateEl) {
                    lastUpdateEl.textContent = new Date(reading.reading_time).toLocaleString();
                }
            },
            () => {
                // Update status badge
                const statusBadge = this.domCache.statusBadge;
                if (statusBadge) {
                    statusBadge.textContent = 'LIVE';
                    statusBadge.className = 'status-badge online';
                }
            }
        ]);
    },

    // Get sensor unit for display
    getSensorUnit(sensorKey) {
        const units = {
            air_temperature: '°C',
            air_humidity: '%',
            soil_moisture: '',
            ph_value: '',
            ec_value: ' mS/cm',
            battery_level: '%'
        };
        return units[sensorKey] || '';
    }
};