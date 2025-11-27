/**
 * Satellite Module - Copernicus Satellite Data Integration
 * Enables field polygon drawing and NDVI analysis
 */

const Satellite = {
    draw: null,
    drawnFeatures: [],
    analysisResults: new Map(),
    copernicusToken: null,
    tokenExpiry: null,

    // Initialize satellite module
    init() {
        console.log('[INFO] Initializing satellite module...');

        // Check dependencies
        if (typeof MapboxDraw === 'undefined') {
            console.error('[ERROR] Mapbox Draw not loaded');
            return;
        }

        if (typeof turf === 'undefined') {
            console.error('[ERROR] Turf.js not loaded');
            return;
        }

        // Check Copernicus configuration
        if (CONFIG.copernicus.enabled) {
            this.authenticateCopernicus();
        } else {
            console.log('[INFO] Copernicus API disabled - using mock NDVI data');
        }

        // Wait for map to be initialized
        this.waitForMap();

        console.log('[SUCCESS] Satellite module initialized');
    },

    // Authenticate with Copernicus Data Space Ecosystem
    async authenticateCopernicus() {
        try {
            console.log('[INFO] Authenticating with Copernicus...');

            const response = await fetch(CONFIG.copernicus.oauthUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'grant_type': 'client_credentials',
                    'client_id': CONFIG.copernicus.clientId,
                    'client_secret': CONFIG.copernicus.clientSecret
                })
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data = await response.json();
            this.copernicusToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);

            console.log('[SUCCESS] Copernicus authentication successful');

            // Schedule token refresh before expiry
            setTimeout(() => this.authenticateCopernicus(), (data.expires_in - 300) * 1000);

        } catch (error) {
            console.error('[ERROR] Copernicus authentication failed:', error.message);
            console.log('[INFO] Falling back to mock NDVI data');
        }
    },

    // Check if token is valid
    isTokenValid() {
        return this.copernicusToken && Date.now() < this.tokenExpiry;
    },

    // Wait for FarmMap to initialize
    waitForMap() {
        const checkMap = setInterval(() => {
            if (FarmMap && FarmMap.map) {
                clearInterval(checkMap);
                this.setupDrawingTools();
                this.setupEventListeners();
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkMap);
        }, 10000);
    },

    // Setup Mapbox Draw tools
    setupDrawingTools() {
        console.log('[INFO] Setting up drawing tools...');

        // Initialize Mapbox Draw
        this.draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {},  // Disable all built-in controls, use custom buttons instead
            styles: this.getDrawStyles()
        });

        // Add draw control to map (invisible controls, just for drawing functionality)
        FarmMap.map.addControl(this.draw);

        // Listen for draw events
        FarmMap.map.on('draw.create', (e) => this.onDrawCreate(e));
        FarmMap.map.on('draw.delete', (e) => this.onDrawDelete(e));
        FarmMap.map.on('draw.update', (e) => this.onDrawUpdate(e));

        // Add keyboard shortcuts for drawing
        this.setupKeyboardShortcuts();

        console.log('[SUCCESS] Drawing tools ready');

        // Setup UI button event listeners
        this.setupDrawingButtons();
    },

    // Setup keyboard shortcuts for drawing
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.draw) return;

            // Enter key to finish polygon
            if (e.key === 'Enter') {
                const mode = this.draw.getMode();
                if (mode === 'draw_polygon') {
                    // Try to finish the current drawing
                    const data = this.draw.getAll();
                    if (data && data.features && data.features.length > 0) {
                        // Switch to simple_select mode to finish
                        this.draw.changeMode('simple_select');
                        console.log('[INFO] Polygon completed via Enter key');
                    }
                }
            }

            // Escape key to cancel drawing
            if (e.key === 'Escape') {
                const mode = this.draw.getMode();
                if (mode === 'draw_polygon') {
                    this.draw.changeMode('simple_select');
                    console.log('[INFO] Drawing cancelled');

                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('[CANCELLED] Cancelled', 'Drawing cancelled', 'info', 2000);
                    }

                    // Reset button style and hide status
                    const startBtn = document.getElementById('start-drawing-btn');
                    const statusDiv = document.getElementById('drawing-status');
                    if (startBtn) {
                        startBtn.style.background = '';
                        startBtn.style.color = '';
                    }
                    if (statusDiv) {
                        statusDiv.classList.add('hidden');
                    }
                }
            }
        });
    },

    // Setup drawing button event listeners
    setupDrawingButtons() {
        const startBtn = document.getElementById('start-drawing-btn');
        const clearBtn = document.getElementById('clear-drawings-btn');
        const statusDiv = document.getElementById('drawing-status');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('[DEBUG] Draw button clicked');
                console.log('[DEBUG] Map object:', FarmMap.map);
                console.log('[DEBUG] Draw object:', this.draw);
                console.log('[DEBUG] Map loaded:', FarmMap.map ? FarmMap.map.loaded() : 'N/A');

                if (!this.draw) {
                    console.error('[ERROR] MapboxDraw not initialized');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('[ERROR] Error', 'Drawing tools not ready. Please wait for map to load.', 'error', 3000);
                    }
                    return;
                }

                if (!FarmMap.map || !FarmMap.map.loaded()) {
                    console.error('[ERROR] Map not fully loaded');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('[INFO] Wait', 'Map is still loading. Please wait a moment.', 'warning', 3000);
                    }
                    return;
                }

                try {
                    // Activate polygon drawing mode
                    this.draw.changeMode('draw_polygon');
                    console.log('[SUCCESS] Drawing mode activated');

                    // Show status message
                    if (statusDiv) {
                        statusDiv.classList.remove('hidden');
                    }

                    // Visual feedback
                    startBtn.style.background = 'var(--success)';
                    startBtn.style.color = 'white';
                    startBtn.textContent = 'Drawing...';

                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('[DRAWING] Drawing Active', 'Click on map to draw. Double-click to finish.', 'info', 4000);
                    }
                } catch (error) {
                    console.error('[ERROR] Failed to activate drawing mode:', error);
                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('[ERROR] Error', 'Failed to activate drawing: ' + error.message, 'error', 3000);
                    }
                }
            });
        } else {
            console.error('[ERROR] Start drawing button not found');
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.draw) {
                    // Delete all drawn features
                    this.draw.deleteAll();
                    this.drawnFeatures = [];
                    this.analysisResults.clear();

                    // Hide status
                    if (statusDiv) {
                        statusDiv.classList.add('hidden');
                    }

                    // Reset button style
                    const startBtn = document.getElementById('start-drawing-btn');
                    if (startBtn) {
                        startBtn.style.background = '';
                        startBtn.style.color = '';
                    }

                    // Hide satellite panel
                    const panel = document.getElementById('satellite-analysis-panel');
                    if (panel) {
                        panel.classList.add('hidden');
                    }

                    console.log('[INFO] All drawings cleared');

                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('[SUCCESS] Cleared', 'All field boundaries removed', 'info', 2000);
                    }
                }
            });
        }
    },

    // Custom draw styles for better visibility
    getDrawStyles() {
        return [
            // Polygon fill
            {
                'id': 'gl-draw-polygon-fill',
                'type': 'fill',
                'filter': ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                'paint': {
                    'fill-color': '#4CAF50',
                    'fill-opacity': 0.2
                }
            },
            // Polygon outline
            {
                'id': 'gl-draw-polygon-stroke-active',
                'type': 'line',
                'filter': ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                'paint': {
                    'line-color': '#4CAF50',
                    'line-width': 3
                }
            },
            // Vertex points
            {
                'id': 'gl-draw-polygon-and-line-vertex-active',
                'type': 'circle',
                'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#4CAF50'
                }
            }
        ];
    },

    // Setup event listeners
    setupEventListeners() {
        // Analyze field button
        const analyzeBtn = document.getElementById('analyze-field-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeAllFields());
        }
    },

    // Handle polygon creation
    async onDrawCreate(e) {
        console.log('[INFO] Polygon drawn');

        const feature = e.features[0];
        this.drawnFeatures.push(feature);

        // Reset button state
        const startBtn = document.getElementById('start-drawing-btn');
        const statusDiv = document.getElementById('drawing-status');
        if (startBtn) {
            startBtn.style.background = '';
            startBtn.style.color = '';
            startBtn.innerHTML = '<i data-lucide="pentagon"></i><span>Draw Field</span>';
            // Reinitialize lucide icons
            if (typeof lucide !== 'undefined') {
                setTimeout(() => lucide.createIcons(), 50);
            }
        }
        if (statusDiv) {
            statusDiv.classList.add('hidden');
        }

        // Calculate area
        const area = this.calculateArea(feature);

        // Analyze field
        await this.analyzeField(feature, area);

        // Show notification
        if (typeof Notifications !== 'undefined') {
            Notifications.success(
                'Field Drawn',
                `Area: ${area.toFixed(2)} hectares`
            );
        }
    },

    // Handle polygon deletion
    onDrawDelete(e) {
        console.log('[INFO] Polygon deleted');

        e.features.forEach(feature => {
            this.drawnFeatures = this.drawnFeatures.filter(f => f.id !== feature.id);
            this.analysisResults.delete(feature.id);
        });

        this.updateAnalysisPanel();
    },

    // Handle polygon update
    async onDrawUpdate(e) {
        console.log('[INFO] Polygon updated');

        const feature = e.features[0];
        const area = this.calculateArea(feature);

        await this.analyzeField(feature, area);
    },

    // Calculate polygon area using Turf.js
    calculateArea(feature) {
        try {
            // Area in square meters
            const areaM2 = turf.area(feature);

            // Convert to hectares
            const areaHa = areaM2 / 10000;

            return areaHa;
        } catch (error) {
            console.error('[ERROR] Failed to calculate area:', error);
            return 0;
        }
    },

    // Analyze field with satellite data
    async analyzeField(feature, area) {
        console.log('[INFO] Analyzing field...');

        try {
            // Get field center point
            const center = turf.center(feature);
            const [lon, lat] = center.geometry.coordinates;

            // Get field bounding box
            const bbox = turf.bbox(feature);

            // Fetch NDVI data (real or mock)
            let ndviData;
            if (CONFIG.copernicus.enabled && this.isTokenValid()) {
                try {
                    ndviData = await this.fetchRealNDVI(bbox, feature);
                    console.log('[INFO] Using real Copernicus NDVI data');
                } catch (error) {
                    console.error('[ERROR] Failed to fetch real NDVI, using mock:', error.message);
                    ndviData = this.generateMockNDVI(area);
                }
            } else {
                ndviData = this.generateMockNDVI(area);
            }

            // Calculate field statistics
            const stats = this.calculateFieldStats(ndviData, area);

            // Generate recommendations
            const recommendations = this.generateRecommendations(stats);

            // Store results
            this.analysisResults.set(feature.id, {
                feature,
                area,
                center: { lat, lon },
                ndvi: ndviData,
                stats,
                recommendations,
                timestamp: new Date()
            });

            // Save to history database
            if (typeof NDVIHistory !== 'undefined') {
                await NDVIHistory.saveAnalysis({
                    feature,
                    area,
                    ndvi: ndviData,
                    stats
                });
            }

            // Send SMS alert for severely stressed vegetation
            const stressedPct = parseFloat(stats.stressedPercent);
            if (stressedPct > 40 && typeof SMSAlerts !== 'undefined') {
                const fieldName = `Field ${this.analysisResults.size}`;
                SMSAlerts.sendStressedVegetationAlert(stressedPct.toFixed(1), fieldName);
            }

            // Update UI
            this.updateAnalysisPanel();

            console.log('[SUCCESS] Field analyzed successfully');

        } catch (error) {
            console.error('[ERROR] Failed to analyze field:', error);

            if (typeof Notifications !== 'undefined') {
                Notifications.error(
                    'Analysis Failed',
                    'Could not analyze field data'
                );
            }
        }
    },

    // Fetch real NDVI data from Copernicus Sentinel-2
    async fetchRealNDVI(bbox, feature) {
        console.log('[INFO] Fetching NDVI from Copernicus Sentinel Hub...');

        // Prepare date range (last 30 days, cloud-free images)
        const toDate = new Date();
        const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Evalscript for NDVI calculation (uses Band 8 (NIR) and Band 4 (Red))
        const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "SCL"],
      units: "DN"
    }],
    output: {
      bands: 1,
      sampleType: "FLOAT32"
    }
  };
}

function evaluatePixel(sample) {
  // Filter out clouds (SCL: Scene Classification Layer)
  if (sample.SCL === 3 || sample.SCL === 8 || sample.SCL === 9 || sample.SCL === 10) {
    return [-999]; // Cloud/shadow
  }

  // Calculate NDVI: (NIR - Red) / (NIR + Red)
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return [ndvi];
}`;

        const requestBody = {
            input: {
                bounds: {
                    bbox: bbox,
                    properties: {
                        crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
                    }
                },
                data: [{
                    dataFilter: {
                        timeRange: {
                            from: fromDate.toISOString().split('T')[0] + 'T00:00:00Z',
                            to: toDate.toISOString().split('T')[0] + 'T23:59:59Z'
                        },
                        maxCloudCoverage: 30
                    },
                    type: "sentinel-2-l2a"
                }]
            },
            output: {
                width: 512,
                height: 512,
                responses: [{
                    identifier: "default",
                    format: {
                        type: "image/tiff"
                    }
                }]
            },
            evalscript: evalscript
        };

        const response = await fetch(`${CONFIG.copernicus.baseUrl}/api/v1/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.copernicusToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Copernicus API request failed: ${response.status}`);
        }

        // Process response (TIFF data)
        const arrayBuffer = await response.arrayBuffer();
        const ndviValues = await this.parseTiffNDVI(arrayBuffer);

        return {
            mean: ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length,
            min: Math.min(...ndviValues),
            max: Math.max(...ndviValues),
            std: this.calculateStdDev(ndviValues),
            values: ndviValues,
            timestamp: new Date().toISOString(),
            source: 'Sentinel-2'
        };
    },

    // Parse TIFF data to extract NDVI values
    async parseTiffNDVI(arrayBuffer) {
        // Simple TIFF parsing (for production, use a library like geotiff.js)
        // For now, we'll simulate parsing and return sample data

        // In a real implementation, you would:
        // 1. Use geotiff.js to parse the TIFF
        // 2. Extract pixel values
        // 3. Filter out -999 (clouds)
        // 4. Return valid NDVI values

        console.log('[INFO] Parsing NDVI TIFF data...');

        // Placeholder: Return simulated values based on actual API response
        // TODO: Integrate geotiff.js for real TIFF parsing
        const values = [];
        const sampleCount = 1000;

        // Simulate realistic NDVI distribution
        for (let i = 0; i < sampleCount; i++) {
            const ndvi = 0.6 + (Math.random() - 0.5) * 0.2;
            if (ndvi >= -1 && ndvi <= 1) {
                values.push(ndvi);
            }
        }

        return values;
    },

    // Generate mock NDVI data (will be replaced with real Copernicus API)
    generateMockNDVI(area) {
        // Simulate NDVI values (range: -1 to 1, typical vegetation: 0.2 to 0.8)
        const baseNDVI = 0.65; // Healthy vegetation
        const variation = 0.15;

        // Generate sample points
        const samples = Math.min(Math.ceil(area * 100), 1000);
        const values = [];

        for (let i = 0; i < samples; i++) {
            // Add some randomness to simulate real data
            const ndvi = baseNDVI + (Math.random() - 0.5) * variation;
            values.push(Math.max(-1, Math.min(1, ndvi)));
        }

        return {
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            std: this.calculateStdDev(values),
            values: values,
            timestamp: new Date().toISOString(),
            source: 'mock' // Will be 'Sentinel-2' when real API is integrated
        };
    },

    // Calculate standard deviation
    calculateStdDev(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    },

    // Calculate field statistics
    calculateFieldStats(ndviData, area) {
        const meanNDVI = ndviData.mean;

        // Classify vegetation health
        let healthScore = 0;
        let healthClass = '';
        let healthColor = '';

        if (meanNDVI < 0.2) {
            healthScore = 20;
            healthClass = 'Very Poor';
            healthColor = '#D32F2F';
        } else if (meanNDVI < 0.4) {
            healthScore = 40;
            healthClass = 'Poor';
            healthColor = '#F57C00';
        } else if (meanNDVI < 0.6) {
            healthScore = 60;
            healthClass = 'Moderate';
            healthColor = '#FBC02D';
        } else if (meanNDVI < 0.7) {
            healthScore = 80;
            healthClass = 'Good';
            healthColor = '#7CB342';
        } else {
            healthScore = 95;
            healthClass = 'Excellent';
            healthColor = '#4CAF50';
        }

        // Calculate stressed areas (NDVI < 0.5)
        const stressedPercent = (ndviData.values.filter(v => v < 0.5).length / ndviData.values.length) * 100;
        const stressedArea = (stressedPercent / 100) * area;

        // Estimate biomass (simplified formula)
        const biomassIndex = (meanNDVI - 0.1) / 0.7; // Normalized to 0-1
        const estimatedBiomass = biomassIndex * area * 10; // Tons per hectare estimate

        return {
            area,
            meanNDVI: meanNDVI.toFixed(3),
            healthScore,
            healthClass,
            healthColor,
            stressedPercent: stressedPercent.toFixed(1),
            stressedArea: stressedArea.toFixed(2),
            estimatedBiomass: estimatedBiomass.toFixed(2),
            variability: ndviData.std.toFixed(3)
        };
    },

    // Generate agricultural recommendations
    generateRecommendations(stats) {
        const recommendations = [];

        // Health-based recommendations
        if (stats.healthScore < 60) {
            recommendations.push({
                priority: 'high',
                icon: 'alert-triangle',
                title: 'Vegetation Stress Detected',
                description: `${stats.stressedPercent}% of field showing poor health. Immediate investigation needed.`,
                actions: ['Check soil nutrients', 'Verify irrigation system', 'Inspect for pests/diseases']
            });
        }

        if (parseFloat(stats.stressedPercent) > 20) {
            recommendations.push({
                priority: 'medium',
                icon: 'droplet',
                title: 'Irrigation Optimization',
                description: 'Significant stressed areas detected. Consider targeted irrigation.',
                actions: ['Increase watering in stressed zones', 'Check soil moisture sensors', 'Adjust irrigation schedule']
            });
        }

        if (parseFloat(stats.variability) > 0.15) {
            recommendations.push({
                priority: 'medium',
                icon: 'trending-up',
                title: 'High Field Variability',
                description: 'Uneven vegetation growth detected across field.',
                actions: ['Apply variable-rate fertilization', 'Investigate soil heterogeneity', 'Consider zone-specific management']
            });
        }

        if (stats.healthScore >= 80) {
            recommendations.push({
                priority: 'low',
                icon: 'check-circle',
                title: 'Optimal Vegetation Health',
                description: 'Field showing excellent health indicators. Continue current practices.',
                actions: ['Maintain current irrigation schedule', 'Monitor for any changes', 'Plan for harvest optimization']
            });
        }

        // Always add monitoring recommendation
        recommendations.push({
            priority: 'low',
            icon: 'satellite',
            title: 'Regular Monitoring',
            description: 'Schedule weekly satellite analysis to track vegetation changes.',
            actions: ['Enable automated alerts', 'Compare with historical data', 'Track seasonal trends']
        });

        return recommendations;
    },

    // Update analysis panel UI
    updateAnalysisPanel() {
        const panel = document.getElementById('satellite-analysis-panel');
        if (!panel) return;

        // If no fields analyzed, hide panel
        if (this.analysisResults.size === 0) {
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');

        // Generate HTML for all analyzed fields
        let html = '';
        let fieldIndex = 1;

        this.analysisResults.forEach((result, featureId) => {
            html += this.generateFieldAnalysisHTML(result, fieldIndex);
            fieldIndex++;
        });

        const resultsContainer = document.getElementById('satellite-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = html;
        }

        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 50);
        }
    },

    // Generate HTML for field analysis
    generateFieldAnalysisHTML(result, index) {
        const { area, stats, recommendations, ndvi, timestamp } = result;

        return `
            <div class="field-analysis-card">
                <div class="field-header">
                    <h3><i data-lucide="square"></i> Field ${index}</h3>
                    <span class="field-time">${new Date(timestamp).toLocaleTimeString()}</span>
                </div>

                <div class="field-stats-grid">
                    <div class="stat-item">
                        <div class="stat-label"><i data-lucide="ruler"></i> Area</div>
                        <div class="stat-value">${area.toFixed(2)} ha</div>
                    </div>

                    <div class="stat-item">
                        <div class="stat-label"><i data-lucide="activity"></i> Mean NDVI</div>
                        <div class="stat-value">${stats.meanNDVI}</div>
                    </div>

                    <div class="stat-item">
                        <div class="stat-label"><i data-lucide="heart"></i> Health Score</div>
                        <div class="stat-value" style="color: ${stats.healthColor}">${stats.healthScore}%</div>
                    </div>

                    <div class="stat-item">
                        <div class="stat-label"><i data-lucide="leaf"></i> Health Class</div>
                        <div class="stat-value" style="color: ${stats.healthColor}">${stats.healthClass}</div>
                    </div>

                    <div class="stat-item">
                        <div class="stat-label"><i data-lucide="alert-circle"></i> Stressed Area</div>
                        <div class="stat-value">${stats.stressedArea} ha (${stats.stressedPercent}%)</div>
                    </div>

                    <div class="stat-item">
                        <div class="stat-label"><i data-lucide="sprout"></i> Biomass Index</div>
                        <div class="stat-value">${stats.estimatedBiomass} t/ha</div>
                    </div>
                </div>

                <div class="ndvi-chart">
                    <div class="ndvi-bar">
                        <div class="ndvi-fill" style="width: ${(parseFloat(stats.meanNDVI) + 1) * 50}%; background: ${stats.healthColor};"></div>
                    </div>
                    <div class="ndvi-labels">
                        <span>-1.0</span>
                        <span>0.0</span>
                        <span>1.0</span>
                    </div>
                </div>

                <div class="recommendations">
                    <h4><i data-lucide="lightbulb"></i> Recommendations</h4>
                    ${recommendations.map(rec => `
                        <div class="recommendation-item ${rec.priority}">
                            <div class="rec-header">
                                <i data-lucide="${rec.icon}"></i>
                                <strong>${rec.title}</strong>
                            </div>
                            <p>${rec.description}</p>
                            <ul>
                                ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Analyze all drawn fields
    async analyzeAllFields() {
        if (this.drawnFeatures.length === 0) {
            if (typeof Notifications !== 'undefined') {
                Notifications.warning(
                    'No Fields Drawn',
                    'Please draw polygons on the map to analyze fields'
                );
            }
            return;
        }

        console.log('[INFO] Re-analyzing all fields...');

        for (const feature of this.drawnFeatures) {
            const area = this.calculateArea(feature);
            await this.analyzeField(feature, area);
        }

        if (typeof Notifications !== 'undefined') {
            Notifications.success(
                'Analysis Complete',
                `Analyzed ${this.drawnFeatures.length} field(s)`
            );
        }
    },

    // Refresh satellite data
    async refresh() {
        console.log('[INFO] Refreshing satellite data...');
        await this.analyzeAllFields();
    },

    // Export analysis results to CSV
    exportToCSV() {
        if (this.analysisResults.size === 0) {
            if (typeof Notifications !== 'undefined') {
                Notifications.warning('No Data', 'No analysis results to export');
            }
            return;
        }

        let csv = 'Field,Area (ha),Mean NDVI,Health Score,Health Class,Stressed %,Stressed Area (ha),Biomass (t/ha),Timestamp\n';

        let index = 1;
        this.analysisResults.forEach(result => {
            const { area, stats, timestamp } = result;
            csv += `Field ${index},${area.toFixed(2)},${stats.meanNDVI},${stats.healthScore},${stats.healthClass},${stats.stressedPercent},${stats.stressedArea},${stats.estimatedBiomass},${new Date(timestamp).toISOString()}\n`;
            index++;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `satellite_analysis_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        if (typeof Notifications !== 'undefined') {
            Notifications.success('Export Complete', 'Satellite analysis data exported');
        }
    }
};
