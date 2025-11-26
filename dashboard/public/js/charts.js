/**
 * Charts Module - Historical Data Visualization
 * Uses Chart.js for beautiful data charts
 */

const Charts = {
    charts: {},
    timeRange: 168, // Default to 7 days to match HTML select

    // Initialize charts
    async init() {
        console.log('[INFO] Initializing charts module...');

        try {
            // Verify Chart.js is loaded
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js library not loaded');
            }

            // Read initial timeRange from select element
            const timeRangeSelect = document.getElementById('chart-timerange');
            if (timeRangeSelect) {
                this.timeRange = parseInt(timeRangeSelect.value);
                console.log(`[INFO] Chart timeRange set to ${this.timeRange} hours`);
            }

            // Setup event listeners
            this.setupEventListeners();

            // Load and render charts
            await this.loadCharts();

            console.log('[SUCCESS] Charts initialized');
        } catch (error) {
            console.error('[ERROR] Charts initialization failed:', error);
            if (typeof Notifications !== 'undefined') {
                Notifications.error('Charts Error', 'Failed to initialize charts: ' + error.message);
            }
        }
    },

    // Setup event listeners
    setupEventListeners() {
        const timeRangeSelect = document.getElementById('chart-timerange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.timeRange = parseInt(e.target.value);
                this.loadCharts();
            });
        }
    },

    // Aggregate data and create smart labels based on time period
    processDataForTimeRange(data) {
        const hours = this.timeRange;

        // 24 hours: Show hourly data
        if (hours === 24) {
            return this.aggregateByHour(data);
        }
        // 7 days: Show daily data with day names
        else if (hours === 168) {
            return this.aggregateByDay(data, true); // true = use day names
        }
        // 30 days: Show weekly data
        else if (hours === 720) {
            return this.aggregateByWeek(data);
        }
        // 90 days: Show monthly data
        else if (hours === 2160) {
            return this.aggregateByMonth(data);
        }
        // Default: return as-is with Date objects as labels
        else {
            return {
                labels: data.map(d => new Date(d.timestamp || d.reading_time)),
                data: data
            };
        }
    },

    // Aggregate by hour (for 24-hour view)
    aggregateByHour(data) {
        const hourlyData = {};

        data.forEach(reading => {
            const date = new Date(reading.timestamp || reading.reading_time);
            // Round to the nearest hour
            const hourKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0);

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = [];
            }
            hourlyData[hourKey].push(reading);
        });

        // Sort by timestamp
        const sortedKeys = Object.keys(hourlyData).sort((a, b) => new Date(a) - new Date(b));
        const labels = sortedKeys.map(key => new Date(key));
        const aggregated = sortedKeys.map(key => this.averageReadings(hourlyData[key]));

        return { labels, data: aggregated };
    },

    // Aggregate by day (for 7-day view)
    aggregateByDay(data, useDayNames = false) {
        const dailyData = {};

        data.forEach(reading => {
            const date = new Date(reading.timestamp || reading.reading_time);
            const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!dailyData[dayKey]) {
                dailyData[dayKey] = {
                    readings: [],
                    date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0) // Noon of that day
                };
            }
            dailyData[dayKey].readings.push(reading);
        });

        const sortedDays = Object.keys(dailyData).sort();
        const labels = sortedDays.map(key => dailyData[key].date);
        const aggregated = sortedDays.map(key => this.averageReadings(dailyData[key].readings));

        return { labels, data: aggregated };
    },

    // Aggregate by week (for 30-day view)
    aggregateByWeek(data) {
        const weeklyData = {};

        data.forEach(reading => {
            const date = new Date(reading.timestamp || reading.reading_time);
            const weekNumber = this.getWeekNumber(date);
            const year = date.getFullYear();
            const weekKey = `${year}-W${weekNumber}`;

            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    readings: [],
                    // Use the first day of the week as the timestamp
                    date: this.getFirstDayOfWeek(date)
                };
            }
            weeklyData[weekKey].readings.push(reading);
        });

        const sortedKeys = Object.keys(weeklyData).sort();
        const labels = sortedKeys.map(key => weeklyData[key].date);
        const aggregated = sortedKeys.map(key => this.averageReadings(weeklyData[key].readings));

        return { labels, data: aggregated };
    },

    // Aggregate by month (for 90-day view)
    aggregateByMonth(data) {
        const monthlyData = {};

        data.forEach(reading => {
            const date = new Date(reading.timestamp || reading.reading_time);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    readings: [],
                    // Use the 15th of the month as the representative timestamp
                    date: new Date(date.getFullYear(), date.getMonth(), 15, 12, 0, 0)
                };
            }
            monthlyData[monthKey].readings.push(reading);
        });

        const sortedKeys = Object.keys(monthlyData).sort();
        const labels = sortedKeys.map(key => monthlyData[key].date);
        const aggregated = sortedKeys.map(key => this.averageReadings(monthlyData[key].readings));

        return { labels, data: aggregated };
    },

    // Helper: Get week number
    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    },

    // Helper: Get first day of week (Monday)
    getFirstDayOfWeek(date) {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(date.getFullYear(), date.getMonth(), diff, 12, 0, 0);
    },

    // Helper: Average multiple readings
    averageReadings(readings) {
        if (!readings || readings.length === 0) return null;

        const averaged = {
            timestamp: readings[0].timestamp || readings[0].reading_time,
            air_temperature: 0,
            air_humidity: 0,
            soil_moisture: 0,
            ph: 0,
            ec: 0,
            nitrogen: 0,
            phosphorus: 0,
            potassium: 0
        };

        readings.forEach(r => {
            averaged.air_temperature += r.air_temperature || 0;
            averaged.air_humidity += r.air_humidity || 0;
            averaged.soil_moisture += r.soil_moisture || 0;
            averaged.ph += r.ph || 0;
            averaged.ec += r.ec || 0;
            averaged.nitrogen += r.nitrogen || 0;
            averaged.phosphorus += r.phosphorus || 0;
            averaged.potassium += r.potassium || 0;
        });

        const count = readings.length;
        averaged.air_temperature = parseFloat((averaged.air_temperature / count).toFixed(1));
        averaged.air_humidity = parseFloat((averaged.air_humidity / count).toFixed(1));
        averaged.soil_moisture = parseFloat((averaged.soil_moisture / count).toFixed(1));
        averaged.ph = parseFloat((averaged.ph / count).toFixed(2));
        averaged.ec = parseFloat((averaged.ec / count).toFixed(2));
        averaged.nitrogen = parseFloat((averaged.nitrogen / count).toFixed(1));
        averaged.phosphorus = parseFloat((averaged.phosphorus / count).toFixed(1));
        averaged.potassium = parseFloat((averaged.potassium / count).toFixed(1));

        return averaged;
    },

    // Load all charts
    async loadCharts() {
        try {
            console.log('[INFO] Loading chart data...');

            // Fetch historical data using MockData if available
            let data, error;

            if (typeof MockData !== 'undefined') {
                // Use MockData (handles both mock and real data)
                const hours = this.timeRange > 0 ? this.timeRange : 720; // Default to 30 days
                console.log(`[INFO] Fetching ${hours} hours of data from MockData...`);
                const result = await MockData.getHistoricalData(hours);
                data = result.data;
                error = result.error;
                console.log(`[INFO] Received ${data ? data.length : 0} data points from MockData`);
                if (data && data.length > 0) {
                    console.log('[INFO] Sample data point:', data[0]);
                }
            } else {
                // Fallback to direct Supabase
                let query = window.supabase
                    .from('sensor_readings')
                    .select('*')
                    .order('reading_time', { ascending: true })
                    .limit(500);

                if (this.timeRange > 0) {
                    const hoursAgo = this.timeRange;
                    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
                    query = query.gte('reading_time', since);
                }

                const result = await query;
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            if (!data || data.length === 0) {
                console.warn('[WARN] No historical data available for charts');
                // Show message in chart areas
                const chartContainers = [
                    'temp-humidity-chart',
                    'soil-moisture-chart',
                    'ph-ec-chart',
                    'npk-chart',
                    'disease-risk-chart'
                ];
                chartContainers.forEach(id => {
                    const canvas = document.getElementById(id);
                    if (canvas && canvas.parentElement) {
                        canvas.parentElement.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 2rem;">No data available yet. Charts will appear once sensor data is received.</p>';
                    }
                });
                return;
            }

            console.log(`[INFO] Rendering charts with ${data.length} data points`);
            if (data.length > 0) {
                console.log(`[DEBUG] First data point:`, data[0]);
                console.log(`[DEBUG] Last data point:`, data[data.length-1]);
            }

            // Process data for time range (aggregate and create smart labels)
            const processed = this.processDataForTimeRange(data);
            console.log(`[INFO] Aggregated to ${processed.data.length} data points`);
            console.log(`[DEBUG] Labels:`, processed.labels);
            if (processed.data.length > 0) {
                console.log(`[DEBUG] First processed point:`, processed.data[0]);
            }

            // Render all charts with processed data
            this.renderTempHumidityChart(processed);
            this.renderSoilMoistureChart(processed);
            this.renderPhEcChart(processed);
            this.renderNpkChart(processed);
            this.renderDiseaseRiskChart(processed);

            console.log('[SUCCESS] All charts rendered');

        } catch (error) {
            console.error('[ERROR] Failed to load charts:', error.message);
            if (typeof Notifications !== 'undefined') {
                Notifications.error('Charts Error', 'Failed to load chart data');
            }
        }
    },

    // Render Temperature & Humidity Chart
    renderTempHumidityChart(processed) {
        const ctx = document.getElementById('temp-humidity-chart');
        if (!ctx) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        // Extract labels and data
        const { labels, data } = processed;

        // Update existing chart if it exists, otherwise create new
        if (this.charts.tempHumidity) {
            this.charts.tempHumidity.data.labels = labels;
            this.charts.tempHumidity.data.datasets[0].data = data.map(d => d.air_temperature);
            this.charts.tempHumidity.data.datasets[1].data = data.map(d => d.air_humidity);
            this.charts.tempHumidity.update('none'); // 'none' mode for faster updates
            return;
        }

        this.charts.tempHumidity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: data.map(d => d.air_temperature),
                        borderColor: '#EF5350',
                        backgroundColor: 'rgba(239, 83, 80, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'Humidity (%)',
                        data: data.map(d => d.air_humidity),
                        borderColor: '#42A5F5',
                        backgroundColor: 'rgba(66, 165, 245, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: this.timeRange <= 24 ? 'hour' : 'day'
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)',
                            color: textColor
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Humidity (%)',
                            color: textColor
                        },
                        ticks: { color: textColor },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                }
            }
        });
    },

    // Render Soil Moisture Chart
    renderSoilMoistureChart(processed) {
        const ctx = document.getElementById('soil-moisture-chart');
        if (!ctx) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        // Extract labels and data
        const { labels, data } = processed;

        // Update existing chart if it exists
        if (this.charts.soilMoisture) {
            this.charts.soilMoisture.data.labels = labels;
            this.charts.soilMoisture.data.datasets[0].data = data.map(d => d.soil_moisture);
            this.charts.soilMoisture.update('none');
            return;
        }

        this.charts.soilMoisture = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Soil Moisture',
                    data: data.map(d => d.soil_moisture),
                    borderColor: '#66BB6A',
                    backgroundColor: 'rgba(102, 187, 106, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: this.timeRange <= 24 ? 'hour' : 'day'
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Soil Moisture',
                            color: textColor
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    annotation: {
                        annotations: {
                            criticalLine: {
                                type: 'line',
                                yMin: 350,
                                yMax: 350,
                                borderColor: '#EF5350',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: 'Critical Level',
                                    enabled: true
                                }
                            }
                        }
                    }
                }
            }
        });
    },

    // Render pH & EC Chart
    renderPhEcChart(processed) {
        const ctx = document.getElementById('ph-ec-chart');
        if (!ctx) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        // Extract labels and data
        const { labels, data } = processed;

        // Update existing chart if it exists
        if (this.charts.phEc) {
            this.charts.phEc.data.labels = labels;
            this.charts.phEc.data.datasets[0].data = data.map(d => d.ph_value !== undefined ? d.ph_value : d.ph);
            this.charts.phEc.data.datasets[1].data = data.map(d => d.ec_value !== undefined ? d.ec_value : d.ec);
            this.charts.phEc.update('none');
            return;
        }

        this.charts.phEc = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'pH Level',
                        data: data.map(d => d.ph_value !== undefined ? d.ph_value : d.ph),
                        borderColor: '#FF9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'EC (mS/cm)',
                        data: data.map(d => d.ec_value !== undefined ? d.ec_value : d.ec),
                        borderColor: '#9C27B0',
                        backgroundColor: 'rgba(156, 39, 176, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: this.timeRange <= 24 ? 'hour' : 'day'
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'pH',
                            color: textColor
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'EC (mS/cm)',
                            color: textColor
                        },
                        ticks: { color: textColor },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                }
            }
        });
    },

    // Render NPK Chart
    renderNpkChart(processed) {
        const ctx = document.getElementById('npk-chart');
        if (!ctx) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        // Extract labels and data
        const { labels, data } = processed;

        // Update existing chart if it exists
        if (this.charts.npk) {
            this.charts.npk.data.labels = labels;
            this.charts.npk.data.datasets[0].data = data.map(d => d.nitrogen_ppm !== undefined ? d.nitrogen_ppm : d.nitrogen);
            this.charts.npk.data.datasets[1].data = data.map(d => d.phosphorus_ppm !== undefined ? d.phosphorus_ppm : d.phosphorus);
            this.charts.npk.data.datasets[2].data = data.map(d => d.potassium_ppm !== undefined ? d.potassium_ppm : d.potassium);
            this.charts.npk.update('none');
            return;
        }

        this.charts.npk = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Nitrogen (ppm)',
                        data: data.map(d => d.nitrogen_ppm !== undefined ? d.nitrogen_ppm : d.nitrogen),
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Phosphorus (ppm)',
                        data: data.map(d => d.phosphorus_ppm !== undefined ? d.phosphorus_ppm : d.phosphorus),
                        borderColor: '#FFC107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Potassium (ppm)',
                        data: data.map(d => d.potassium_ppm !== undefined ? d.potassium_ppm : d.potassium),
                        borderColor: '#FF5722',
                        backgroundColor: 'rgba(255, 87, 34, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: this.timeRange <= 24 ? 'hour' : 'day'
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Concentration (ppm)',
                            color: textColor
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                }
            }
        });
    },

    // Render Disease Risk Timeline Chart
    renderDiseaseRiskChart(processed) {
        const ctx = document.getElementById('disease-risk-chart');
        if (!ctx) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        // Extract labels and data
        const { labels, data } = processed;

        // Calculate disease risk scores based on conditions
        const diseaseRisks = data.map(d => {
            const risks = this.calculateDiseaseRisks(d);
            return {
                time: new Date(d.reading_time),
                lateBlight: risks.lateBlight,
                earlyBlight: risks.earlyBlight,
                powderyMildew: risks.powderyMildew
            };
        });

        // Update existing chart if it exists
        if (this.charts.diseaseRisk) {
            this.charts.diseaseRisk.data.labels = diseaseRisks.map(d => d.time);
            this.charts.diseaseRisk.data.datasets[0].data = diseaseRisks.map(d => d.lateBlight);
            this.charts.diseaseRisk.data.datasets[1].data = diseaseRisks.map(d => d.earlyBlight);
            this.charts.diseaseRisk.data.datasets[2].data = diseaseRisks.map(d => d.powderyMildew);
            this.charts.diseaseRisk.update('none');
            return;
        }

        this.charts.diseaseRisk = new Chart(ctx, {
            type: 'line',
            data: {
                labels: diseaseRisks.map(d => d.time),
                datasets: [
                    {
                        label: 'Late Blight Risk',
                        data: diseaseRisks.map(d => d.lateBlight),
                        borderColor: '#D32F2F',
                        backgroundColor: 'rgba(211, 47, 47, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Early Blight Risk',
                        data: diseaseRisks.map(d => d.earlyBlight),
                        borderColor: '#F57C00',
                        backgroundColor: 'rgba(245, 124, 0, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Powdery Mildew Risk',
                        data: diseaseRisks.map(d => d.powderyMildew),
                        borderColor: '#FDD835',
                        backgroundColor: 'rgba(253, 216, 53, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: this.timeRange <= 24 ? 'hour' : 'day'
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Risk Level (%)',
                            color: textColor
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                }
            }
        });
    },

    // Calculate disease risks
    calculateDiseaseRisks(reading) {
        const temp = reading.air_temperature || 0;
        const humidity = reading.air_humidity || 0;

        // Late Blight (10-25°C, >90% humidity)
        let lateBlight = 0;
        if (temp >= 10 && temp <= 25 && humidity > 90) {
            lateBlight = 80 + (humidity - 90);
        } else if (temp >= 10 && temp <= 25 && humidity > 80) {
            lateBlight = 40 + (humidity - 80) * 2;
        }

        // Early Blight (24-29°C, >90% humidity)
        let earlyBlight = 0;
        if (temp >= 24 && temp <= 29 && humidity > 90) {
            earlyBlight = 70 + (humidity - 90);
        } else if (temp >= 20 && temp <= 32 && humidity > 80) {
            earlyBlight = 30 + (humidity - 80) * 2;
        }

        // Powdery Mildew (20-30°C, 50-70% humidity)
        let powderyMildew = 0;
        if (temp >= 20 && temp <= 30 && humidity >= 50 && humidity <= 70) {
            powderyMildew = 60;
        } else if (temp >= 15 && temp <= 35 && humidity >= 40 && humidity <= 80) {
            powderyMildew = 30;
        }

        return {
            lateBlight: Math.min(100, lateBlight),
            earlyBlight: Math.min(100, earlyBlight),
            powderyMildew: Math.min(100, powderyMildew)
        };
    },

    // Refresh charts
    async refresh() {
        await this.loadCharts();
    },

    // Add single data point to charts (for real-time updates)
    addDataPoint(reading) {
        const timestamp = new Date(reading.reading_time);
        const maxDataPoints = 100; // Keep last 100 points in real-time view

        // Update temperature/humidity chart
        if (this.charts.tempHumidity) {
            const chart = this.charts.tempHumidity;
            chart.data.labels.push(timestamp);
            chart.data.datasets[0].data.push(reading.air_temperature);
            chart.data.datasets[1].data.push(reading.air_humidity);

            // Remove old data points if exceeding max
            if (chart.data.labels.length > maxDataPoints) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }

            chart.update('none'); // Fast update without animations
        }

        // Update soil moisture chart
        if (this.charts.soilMoisture) {
            const chart = this.charts.soilMoisture;
            chart.data.labels.push(timestamp);
            chart.data.datasets[0].data.push(reading.soil_moisture);

            if (chart.data.labels.length > maxDataPoints) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }

            chart.update('none');
        }

        // Update pH/EC chart
        if (this.charts.phEc) {
            const chart = this.charts.phEc;
            chart.data.labels.push(timestamp);
            chart.data.datasets[0].data.push(reading.ph_value);
            chart.data.datasets[1].data.push(reading.ec_value);

            if (chart.data.labels.length > maxDataPoints) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }

            chart.update('none');
        }

        // Update NPK chart
        if (this.charts.npk) {
            const chart = this.charts.npk;
            chart.data.labels.push(timestamp);
            chart.data.datasets[0].data.push(reading.nitrogen_ppm);
            chart.data.datasets[1].data.push(reading.phosphorus_ppm);
            chart.data.datasets[2].data.push(reading.potassium_ppm);

            if (chart.data.labels.length > maxDataPoints) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
                chart.data.datasets[2].data.shift();
            }

            chart.update('none');
        }

        // Update disease risk chart
        if (this.charts.diseaseRisk) {
            const risks = this.calculateDiseaseRisks(reading);
            const chart = this.charts.diseaseRisk;
            chart.data.labels.push(timestamp);
            chart.data.datasets[0].data.push(risks.lateBlight);
            chart.data.datasets[1].data.push(risks.earlyBlight);
            chart.data.datasets[2].data.push(risks.powderyMildew);

            if (chart.data.labels.length > maxDataPoints) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
                chart.data.datasets[2].data.shift();
            }

            chart.update('none');
        }
    }
};
