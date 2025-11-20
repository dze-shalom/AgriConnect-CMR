/**
 * NDVI History Module
 * Tracks and compares historical NDVI data over time
 */

const NDVIHistory = {
    historicalData: [],
    selectedFieldName: null,

    // Initialize NDVI history module
    init() {
        console.log('[INFO] Initializing NDVI history module...');
        this.setupEventListeners();
        console.log('[SUCCESS] NDVI history module initialized');
    },

    // Setup event listeners
    setupEventListeners() {
        // View history button
        const viewHistoryBtn = document.getElementById('view-ndvi-history-btn');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => this.showHistoryModal());
        }

        // Close history modal
        const closeHistoryBtn = document.getElementById('close-history-modal');
        if (closeHistoryBtn) {
            closeHistoryBtn.addEventListener('click', () => this.hideHistoryModal());
        }

        // Field selector
        const fieldSelector = document.getElementById('history-field-selector');
        if (fieldSelector) {
            fieldSelector.addEventListener('change', (e) => {
                this.selectedFieldName = e.target.value;
                this.loadFieldHistory(this.selectedFieldName);
            });
        }
    },

    // Save NDVI analysis to database
    async saveAnalysis(fieldData) {
        try {
            console.log('[INFO] Saving NDVI analysis to history...');

            const { feature, area, stats, ndvi } = fieldData;

            // Prepare data for database
            const historyRecord = {
                field_polygon: feature.geometry,
                field_area_hectares: area,
                mean_ndvi: parseFloat(stats.meanNDVI),
                health_score: stats.healthScore,
                health_class: stats.healthClass,
                stressed_area_hectares: parseFloat(stats.stressedArea),
                stressed_percentage: parseFloat(stats.stressedPercent),
                estimated_biomass: parseFloat(stats.estimatedBiomass),
                satellite_source: ndvi.source || 'mock',
                farm_id: CONFIG.farmId,
                field_name: `Field ${Satellite.analysisResults.size}`,
                analysis_date: new Date().toISOString()
            };

            // Insert into Supabase
            const { data, error } = await window.supabase
                .from('satellite_ndvi_history')
                .insert(historyRecord)
                .select();

            if (error) throw error;

            console.log('[SUCCESS] NDVI analysis saved to history:', data[0].id);

            return data[0];

        } catch (error) {
            console.error('[ERROR] Failed to save NDVI history:', error);
        }
    },

    // Load historical data for a specific field
    async loadFieldHistory(fieldName) {
        try {
            console.log(`[INFO] Loading NDVI history for ${fieldName}...`);

            const { data, error } = await window.supabase
                .from('satellite_ndvi_history')
                .select('*')
                .eq('farm_id', CONFIG.farmId)
                .eq('field_name', fieldName)
                .order('analysis_date', { ascending: true });

            if (error) throw error;

            this.historicalData = data || [];

            console.log(`[SUCCESS] Loaded ${this.historicalData.length} historical records`);

            // Update chart
            this.renderHistoryChart();

            // Update statistics
            this.updateHistoryStats();

            return this.historicalData;

        } catch (error) {
            console.error('[ERROR] Failed to load NDVI history:', error);
            return [];
        }
    },

    // Load all field names
    async loadFieldNames() {
        try {
            const { data, error } = await window.supabase
                .from('satellite_ndvi_history')
                .select('field_name')
                .eq('farm_id', CONFIG.farmId)
                .order('field_name');

            if (error) throw error;

            // Get unique field names
            const uniqueFields = [...new Set(data.map(d => d.field_name))];

            return uniqueFields;

        } catch (error) {
            console.error('[ERROR] Failed to load field names:', error);
            return [];
        }
    },

    // Show history modal
    async showHistoryModal() {
        const modal = document.getElementById('ndvi-history-modal');
        if (!modal) return;

        // Load field names
        const fields = await this.loadFieldNames();

        if (fields.length === 0) {
            if (typeof Notifications !== 'undefined') {
                Notifications.warning(
                    'No History',
                    'No historical NDVI data found. Draw some fields first!'
                );
            }
            return;
        }

        // Populate field selector
        const selector = document.getElementById('history-field-selector');
        if (selector) {
            selector.innerHTML = fields.map(field =>
                `<option value="${field}">${field}</option>`
            ).join('');

            // Load first field
            this.selectedFieldName = fields[0];
            await this.loadFieldHistory(this.selectedFieldName);
        }

        modal.classList.remove('hidden');

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
        }
    },

    // Hide history modal
    hideHistoryModal() {
        const modal = document.getElementById('ndvi-history-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // Render NDVI history chart
    renderHistoryChart() {
        const canvas = document.getElementById('ndvi-history-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destroy previous chart if exists
        if (this.chart) {
            this.chart.destroy();
        }

        // Prepare data
        const labels = this.historicalData.map(d =>
            new Date(d.analysis_date).toLocaleDateString()
        );

        const ndviData = this.historicalData.map(d => parseFloat(d.mean_ndvi));
        const healthScores = this.historicalData.map(d => d.health_score);
        const stressedPct = this.historicalData.map(d => parseFloat(d.stressed_percentage));

        // Check theme for colors
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E0E0E0' : '#212121';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Mean NDVI',
                        data: ndviData,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Health Score (%)',
                        data: healthScores,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Stressed Area (%)',
                        data: stressedPct,
                        borderColor: '#F57C00',
                        backgroundColor: 'rgba(245, 124, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { color: textColor }
                    },
                    title: {
                        display: true,
                        text: `NDVI Time-Series for ${this.selectedFieldName}`,
                        color: textColor,
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(45, 45, 45, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: gridColor,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'NDVI Value',
                            color: textColor
                        },
                        grid: { color: gridColor },
                        ticks: { color: textColor },
                        min: 0,
                        max: 1
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Percentage (%)',
                            color: textColor
                        },
                        grid: { display: false },
                        ticks: { color: textColor },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    },

    // Update history statistics
    updateHistoryStats() {
        if (this.historicalData.length === 0) return;

        // Calculate trend
        const recentNDVI = this.historicalData.slice(-3).map(d => parseFloat(d.mean_ndvi));
        const olderNDVI = this.historicalData.slice(-6, -3).map(d => parseFloat(d.mean_ndvi));

        const recentAvg = recentNDVI.reduce((a, b) => a + b, 0) / recentNDVI.length;
        const olderAvg = olderNDVI.length > 0
            ? olderNDVI.reduce((a, b) => a + b, 0) / olderNDVI.length
            : recentAvg;

        const trendChange = ((recentAvg - olderAvg) / olderAvg) * 100;

        // Get latest and oldest records
        const latest = this.historicalData[this.historicalData.length - 1];
        const oldest = this.historicalData[0];

        // Update stats display
        const statsContainer = document.getElementById('history-stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="history-stat-card">
                    <div class="stat-label">Total Analyses</div>
                    <div class="stat-value">${this.historicalData.length}</div>
                </div>
                <div class="history-stat-card">
                    <div class="stat-label">Latest NDVI</div>
                    <div class="stat-value">${parseFloat(latest.mean_ndvi).toFixed(3)}</div>
                    <div class="stat-date">${new Date(latest.analysis_date).toLocaleDateString()}</div>
                </div>
                <div class="history-stat-card">
                    <div class="stat-label">Health Trend</div>
                    <div class="stat-value ${trendChange >= 0 ? 'positive' : 'negative'}">
                        ${trendChange >= 0 ? '↑' : '↓'} ${Math.abs(trendChange).toFixed(1)}%
                    </div>
                    <div class="stat-date">Last 3 vs previous 3</div>
                </div>
                <div class="history-stat-card">
                    <div class="stat-label">Health Score</div>
                    <div class="stat-value">${latest.health_score}%</div>
                    <div class="stat-date">${latest.health_class}</div>
                </div>
            `;
        }

        // Update insights
        const insightsContainer = document.getElementById('history-insights-container');
        if (insightsContainer) {
            const insights = this.generateInsights(trendChange, latest, oldest);
            insightsContainer.innerHTML = insights.map(insight => `
                <div class="insight-item ${insight.type}">
                    <i data-lucide="${insight.icon}"></i>
                    <div>
                        <strong>${insight.title}</strong>
                        <p>${insight.message}</p>
                    </div>
                </div>
            `).join('');

            if (typeof lucide !== 'undefined') {
                setTimeout(() => lucide.createIcons(), 50);
            }
        }
    },

    // Generate insights from historical data
    generateInsights(trendChange, latest, oldest) {
        const insights = [];

        // Trend insight
        if (trendChange > 5) {
            insights.push({
                type: 'positive',
                icon: 'trending-up',
                title: 'Improving Health',
                message: `Vegetation health has improved by ${trendChange.toFixed(1)}% in recent analyses. Current practices are working well!`
            });
        } else if (trendChange < -5) {
            insights.push({
                type: 'warning',
                icon: 'trending-down',
                title: 'Declining Health',
                message: `Vegetation health has declined by ${Math.abs(trendChange).toFixed(1)}%. Consider investigating soil conditions and irrigation.`
            });
        } else {
            insights.push({
                type: 'neutral',
                icon: 'minus',
                title: 'Stable Conditions',
                message: 'Vegetation health remains stable. Continue current management practices.'
            });
        }

        // Stressed area insight
        if (parseFloat(latest.stressed_percentage) > 25) {
            insights.push({
                type: 'alert',
                icon: 'alert-triangle',
                title: 'High Stress Detected',
                message: `${latest.stressed_percentage}% of field showing stress. Prioritize irrigation and nutrient management in affected zones.`
            });
        }

        // Long-term comparison
        const totalChange = ((parseFloat(latest.mean_ndvi) - parseFloat(oldest.mean_ndvi)) / parseFloat(oldest.mean_ndvi)) * 100;
        insights.push({
            type: totalChange >= 0 ? 'positive' : 'warning',
            icon: 'calendar',
            title: 'Long-term Trend',
            message: `Since first analysis, NDVI has ${totalChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(totalChange).toFixed(1)}%.`
        });

        return insights;
    }
};
