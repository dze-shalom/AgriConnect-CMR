/**
 * Farm Map Module
 * Interactive map showing all deployed nodes and gateways
 */

const FarmMap = {
    map: null,
    mapboxToken: 'pk.eyJ1Ijoic2hhbG9tY2hvdyIsImEiOiJjbWgxM29tdHowMzkxMmpzand3a3F4amFwIn0.gjv16IplSqyS2KKkXH2yBg', // UPDATE THIS!
    markers: [],
    farmLocation: {
        lat: 4.1560,
        lon: 9.2571
    },
    
    // Initialize map
    init() {
        console.log('[INFO] Initializing farm map...');
        
        // Check if Mapbox is loaded
        if (typeof mapboxgl === 'undefined') {
            console.error('[ERROR] Mapbox GL JS not loaded');
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('[SUCCESS] Map module ready');
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Toggle map visibility
        document.getElementById('toggle-map-btn').addEventListener('click', () => {
            this.toggleMap();
        });
        
        // Zoom to farm button
        document.getElementById('zoom-to-farm-btn').addEventListener('click', () => {
            this.zoomToFarm();
        });
        
        // Filter dropdown
        document.getElementById('map-filter').addEventListener('change', (e) => {
            this.filterNodes(e.target.value);
        });
    },
    
    // Toggle map visibility
    toggleMap() {
        const container = document.getElementById('map-container');
        const toggleBtn = document.getElementById('toggle-map-btn');
        const toggleText = document.getElementById('toggle-map-text');

        if (container.classList.contains('hidden')) {
            // Show map
            container.classList.remove('hidden');

            // Use translation if available
            if (typeof Language !== 'undefined') {
                toggleText.textContent = Language.get('hide_map');
            } else {
                toggleText.textContent = 'Hide Map';
            }

            // Initialize map if not already done
            if (!this.map) {
                this.initializeMap();
            }
        } else {
            // Hide map
            container.classList.add('hidden');

            // Use translation if available
            if (typeof Language !== 'undefined') {
                toggleText.textContent = Language.get('show_map');
            } else {
                toggleText.textContent = 'Show Map';
            }
        }
    },
    
    // Initialize Mapbox map
    initializeMap() {
        console.log('[INFO] Creating Mapbox map...');
        
        mapboxgl.accessToken = this.mapboxToken;
        
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [this.farmLocation.lon, this.farmLocation.lat],
            zoom: 15,
            pitch: 45,
            bearing: 0
        });
        
        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
        
        // Add scale control
        this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-right');
        
        // Wait for map to load then add markers
        this.map.on('load', () => {
            console.log('[SUCCESS] Map loaded');
            this.loadNodes();
        });
        
        // Add terrain (3D)
        this.map.on('style.load', () => {
            this.map.setFog({}); // Add atmospheric fog
        });
    },
    
    // Load all nodes and display on map
    async loadNodes() {
        try {
            console.log('[INFO] Loading nodes from database...');
            
            // Get all sensor readings with location data
            const { data: readings, error } = await window.supabase
                .from('sensor_readings')
                .select('*')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null)
                .order('reading_time', { ascending: false });
            
            if (error) throw error;
            
            // Get unique nodes (latest reading per field/zone)
            const nodesMap = new Map();
            
            readings?.forEach(reading => {
                const key = `${reading.field_id}-${reading.zone_id}`;
                if (!nodesMap.has(key)) {
                    nodesMap.set(key, reading);
                }
            });
            
            const nodes = Array.from(nodesMap.values());
            
            console.log(`[INFO] Found ${nodes.length} unique nodes`);
            
            // Add farm marker
            this.addFarmMarker();
            
            // Add node markers
            nodes.forEach(node => {
                this.addNodeMarker(node);
            });
            
            // Update stats
            this.updateStats(nodes);
            
        } catch (error) {
            console.error('[ERROR] Failed to load nodes:', error.message);
        }
    },
    
    // Add farm location marker
    addFarmMarker() {
        const el = document.createElement('div');
        el.className = 'farm-marker';
        el.innerHTML = '📍';
        el.style.fontSize = '2.5rem';
        el.style.cursor = 'pointer';
        el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
                <div class="popup-header">
                    ${CONFIG.farmId}
                </div>
                <div class="popup-content">
                    <div class="popup-row">
                        <span class="popup-label">Location:</span>
                        <span class="popup-value">Buea, Cameroon</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Coordinates:</span>
                        <span class="popup-value">${this.farmLocation.lat.toFixed(4)}, ${this.farmLocation.lon.toFixed(4)}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Deployment:</span>
                        <span class="popup-value">AgriConnect Node Network</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Crop Type:</span>
                        <span class="popup-value">Tomatoes</span>
                    </div>
                </div>
            `);

        const marker = new mapboxgl.Marker(el)
            .setLngLat([this.farmLocation.lon, this.farmLocation.lat])
            .setPopup(popup)
            .addTo(this.map);

        this.markers.push({ marker, type: 'farm', status: 'online' });
    },
    
    // Add node marker
    addNodeMarker(nodeData) {
        // Determine node status
        const status = this.getNodeStatus(nodeData);
        
        // Create marker element
        const el = document.createElement('div');
        el.className = `node-marker ${status}`;
        el.innerHTML = 'NODE';
        el.style.fontSize = '1.8rem';
        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.3s';
        
        // Color based on status
        if (status === 'optimal') {
            el.style.filter = 'drop-shadow(0 0 5px #4CAF50)';
        } else if (status === 'warning') {
            el.style.filter = 'drop-shadow(0 0 5px #FF9800)';
        } else if (status === 'offline') {
            el.style.filter = 'drop-shadow(0 0 5px #F44336)';
            el.style.opacity = '0.6';
        }
        
        // Hover effect
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.3)';
        });
        
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
        });
        
        // Create popup content
        const popupHTML = this.createNodePopup(nodeData, status);
        
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(popupHTML);
        
        // Add marker to map
        const marker = new mapboxgl.Marker(el)
            .setLngLat([nodeData.longitude, nodeData.latitude])
            .setPopup(popup)
            .addTo(this.map);
        
        this.markers.push({
            marker,
            type: 'node',
            status,
            fieldId: nodeData.field_id,
            zoneId: nodeData.zone_id,
            data: nodeData
        });
    },
    
    // Determine node status based on sensor data
    getNodeStatus(nodeData) {
        // Check if data is recent (within last hour)
        const lastUpdate = new Date(nodeData.reading_time);
        const now = new Date();
        const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate > 1) {
            return 'offline';
        }
        
        // Check sensor thresholds
        let warningCount = 0;
        
        // Temperature check
        if (nodeData.air_temperature < 18 || nodeData.air_temperature > 30) {
            warningCount++;
        }
        
        // Humidity check
        if (nodeData.air_humidity < 60 || nodeData.air_humidity > 80) {
            warningCount++;
        }
        
        // Soil moisture check
        if (nodeData.soil_moisture < 400 || nodeData.soil_moisture > 600) {
            warningCount++;
        }
        
        // Battery check
        if (nodeData.battery_level < 20) {
            warningCount++;
        }
        
        return warningCount >= 2 ? 'warning' : 'optimal';
    },
    
    // Create popup HTML for node
    createNodePopup(nodeData, status) {
        const time = new Date(nodeData.reading_time).toLocaleString();

        return `
            <div class="popup-header">
                Field ${nodeData.field_id} - Zone ${nodeData.zone_id}
            </div>
            <div class="popup-content">
                <div class="popup-row">
                    <span class="popup-label">Status:</span>
                    <span class="popup-status ${status}">${status}</span>
                </div>
                <div class="popup-row">
                    <span class="popup-label">Last Update:</span>
                    <span class="popup-value">${time}</span>
                </div>
                <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
                <div class="popup-row">
                    <span class="popup-label"> Air Temp:</span>
                    <span class="popup-value">${nodeData.air_temperature?.toFixed(1) || 'N/A'} °C</span>
                </div>
                <div class="popup-row">
                    <span class="popup-label"> Humidity:</span>
                    <span class="popup-value">${nodeData.air_humidity?.toFixed(1) || 'N/A'} %</span>
                </div>
                <div class="popup-row">
                    <span class="popup-label"> Soil Moisture:</span>
                    <span class="popup-value">${nodeData.soil_moisture || 'N/A'}</span>
                </div>
                <div class="popup-row">
                    <span class="popup-label"> pH:</span>
                    <span class="popup-value">${nodeData.ph_value?.toFixed(1) || 'N/A'}</span>
                </div>
                <div class="popup-row">
                    <span class="popup-label">Battery:</span>
                    <span class="popup-value">${nodeData.battery_level || 'N/A'} %</span>
                </div>
            </div>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
            <div class="popup-download-section">
                <p style="font-size: 0.85rem; margin-bottom: 8px; color: #666; font-weight: 500;">Download Historical Data:</p>
                <div class="popup-download-buttons">
                    <button class="popup-download-btn" onclick="FarmMap.downloadNodeData('${nodeData.field_id}', '${nodeData.zone_id}', 7)">
                        Last 7 Days
                    </button>
                    <button class="popup-download-btn" onclick="FarmMap.downloadNodeData('${nodeData.field_id}', '${nodeData.zone_id}', 30)">
                        Last 30 Days
                    </button>
                    <button class="popup-download-btn" onclick="FarmMap.downloadNodeData('${nodeData.field_id}', '${nodeData.zone_id}', 90)">
                        Last 90 Days
                    </button>
                </div>
            </div>
        `;
    },
    
    // Update map statistics
    updateStats(nodes) {
        const stats = {
            total: nodes.length,
            online: 0,
            warning: 0,
            offline: 0
        };
        
        nodes.forEach(node => {
            const status = this.getNodeStatus(node);
            if (status === 'optimal') stats.online++;
            else if (status === 'warning') stats.warning++;
            else if (status === 'offline') stats.offline++;
        });
        
        document.getElementById('total-nodes-count').textContent = stats.total;
        document.getElementById('online-nodes-count').textContent = stats.online;
        document.getElementById('warning-nodes-count').textContent = stats.warning;
        document.getElementById('offline-nodes-count').textContent = stats.offline;
    },
    
    // Zoom to farm location
    zoomToFarm() {
        if (this.map) {
            this.map.flyTo({
                center: [this.farmLocation.lon, this.farmLocation.lat],
                zoom: 16,
                pitch: 60,
                bearing: 0,
                duration: 2000
            });
        }
    },
    
    // Filter nodes by status
    filterNodes(filter) {
        console.log(`[INFO] Filtering nodes: ${filter}`);
        
        this.markers.forEach(({ marker, type, status }) => {
            if (type === 'farm') {
                // Always show farm marker
                marker.getElement().style.display = 'block';
                return;
            }
            
            if (filter === 'all') {
                marker.getElement().style.display = 'block';
            } else if (filter === 'online' && status === 'optimal') {
                marker.getElement().style.display = 'block';
            } else if (filter === 'offline' && status === 'offline') {
                marker.getElement().style.display = 'block';
            } else if (filter === 'warning' && status === 'warning') {
                marker.getElement().style.display = 'block';
            } else {
                marker.getElement().style.display = 'none';
            }
        });
    },
    
    // Refresh map data
    async refresh() {
        if (!this.map) return;

        console.log('[INFO] Refreshing map data...');

        // Remove all markers except farm
        this.markers = this.markers.filter(({ marker, type }) => {
            if (type !== 'farm') {
                marker.remove();
                return false;
            }
            return true;
        });

        // Reload nodes
        await this.loadNodes();
    },

    // Download node data for specific field/zone
    async downloadNodeData(fieldId, zoneId, days) {
        console.log(`[INFO] Downloading data for Field ${fieldId} - Zone ${zoneId} (last ${days} days)...`);

        try {
            // Show loading notification
            if (typeof Notifications !== 'undefined') {
                Notifications.info('Downloading Data', `Fetching ${days} days of sensor data...`);
            }

            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Fetch data from Supabase
            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('*')
                .eq('field_id', fieldId)
                .eq('zone_id', zoneId)
                .gte('reading_time', startDate.toISOString())
                .lte('reading_time', endDate.toISOString())
                .order('reading_time', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                if (typeof Notifications !== 'undefined') {
                    Notifications.warning('No Data', `No data found for the selected period`);
                }
                return;
            }

            // Generate CSV
            const csv = this.generateNodeCSV(data, fieldId, zoneId);

            // Download CSV file
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Node_Field${fieldId}_Zone${zoneId}_${days}days_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log(`[SUCCESS] Downloaded ${data.length} records`);

            if (typeof Notifications !== 'undefined') {
                Notifications.success('Download Complete', `${data.length} sensor readings exported to CSV`);
            }

        } catch (error) {
            console.error('[ERROR] Failed to download node data:', error);

            if (typeof Notifications !== 'undefined') {
                Notifications.error('Download Failed', error.message);
            }
        }
    },

    // Generate CSV from node data
    generateNodeCSV(data, fieldId, zoneId) {
        // CSV Header
        let csv = 'Timestamp,Field ID,Zone ID,Air Temperature (°C),Air Humidity (%),Soil Moisture,pH Value,EC Value (mS/cm),Battery Level (%),Latitude,Longitude\n';

        // CSV Rows
        data.forEach(reading => {
            const row = [
                new Date(reading.reading_time).toISOString(),
                reading.field_id || fieldId,
                reading.zone_id || zoneId,
                reading.air_temperature?.toFixed(2) || '',
                reading.air_humidity?.toFixed(2) || '',
                reading.soil_moisture || '',
                reading.ph_value?.toFixed(2) || '',
                reading.ec_value?.toFixed(2) || '',
                reading.battery_level || '',
                reading.latitude?.toFixed(6) || '',
                reading.longitude?.toFixed(6) || ''
            ];

            csv += row.join(',') + '\n';
        });

        return csv;
    }
};