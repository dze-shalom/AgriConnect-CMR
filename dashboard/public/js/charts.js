/**
 * Charts Module - Historical Data Visualization
 * Uses Chart.js for beautiful data charts
 */

const Charts = {
    charts: {},
    timeRange: 168, // Default 7 days in hours

    // Initialize charts
    async init() {
        console.log('[INFO] Initializing charts module...');

        // Setup event listeners
        this.setupEventListeners();

        // Load and render charts
        await this.loadCharts();

        console.log('[SUCCESS] Charts initialized');
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

    // Load all charts
    async loadCharts() {
        try {
            // Fetch historical data
            const hoursAgo = this.timeRange;
            const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('*')
                .gte('reading_time', since)
                .order('reading_time', { ascending: true })
                .limit(500);

            if (error) throw error;

            if (!data || data.length === 0) {
                console.warn('[WARN] No historical data available');
                return;
            }

            // Render all charts
            this.renderTempHumidityChart(data);
            this.renderSoilMoistureChart(data);
            this.renderPhEcChart(data);
            this.renderNpkChart(data);
            this.renderDiseaseRiskChart(data);

        } catch (error) {
            console.error('[ERROR] Failed to load charts:', error.message);
        }
    },

    // Render Temperature & Humidity Chart
    renderTempHumidityChart(data) {
        const ctx = document.getElementById('temp-humidity-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.tempHumidity) {
            this.charts.tempHumidity.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        this.charts.tempHumidity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.reading_time)),
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
    renderSoilMoistureChart(data) {
        const ctx = document.getElementById('soil-moisture-chart');
        if (!ctx) return;

        if (this.charts.soilMoisture) {
            this.charts.soilMoisture.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        this.charts.soilMoisture = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.reading_time)),
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
    renderPhEcChart(data) {
        const ctx = document.getElementById('ph-ec-chart');
        if (!ctx) return;

        if (this.charts.phEc) {
            this.charts.phEc.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        this.charts.phEc = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.reading_time)),
                datasets: [
                    {
                        label: 'pH Level',
                        data: data.map(d => d.ph_value),
                        borderColor: '#FF9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'EC (mS/cm)',
                        data: data.map(d => d.ec_value),
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
    renderNpkChart(data) {
        const ctx = document.getElementById('npk-chart');
        if (!ctx) return;

        if (this.charts.npk) {
            this.charts.npk.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

        this.charts.npk = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.reading_time)),
                datasets: [
                    {
                        label: 'Nitrogen (ppm)',
                        data: data.map(d => d.nitrogen_ppm),
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Phosphorus (ppm)',
                        data: data.map(d => d.phosphorus_ppm),
                        borderColor: '#FFC107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Potassium (ppm)',
                        data: data.map(d => d.potassium_ppm),
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
    renderDiseaseRiskChart(data) {
        const ctx = document.getElementById('disease-risk-chart');
        if (!ctx) return;

        if (this.charts.diseaseRisk) {
            this.charts.diseaseRisk.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? '#333333' : '#E0E0E0';

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
    }
};
