/**
 * Farm Controls Module
 * Handles pump control, irrigation, and zone management
 */

const FarmControls = {
    selectedZone: null,
    pumpStatus: false,
    irrigationTimer: null,
    irrigationEndTime: null,
    
    // Initialize controls
    init() {
        console.log('[INFO] Initializing farm controls...');
        this.setupEventListeners();
        this.loadPumpStatus();
    },
    
    // Setup all event listeners
    setupEventListeners() {
        // Pump control buttons
        document.getElementById('pump-on-btn').addEventListener('click', () => {
            this.controlPump(true);
        });
        
        document.getElementById('pump-off-btn').addEventListener('click', () => {
            this.controlPump(false);
        });
        
        // Zone selector buttons
        document.querySelectorAll('.zone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const field = btn.dataset.field;
                const zone = btn.dataset.zone;
                this.selectZone(field, zone, btn);
            });
        });
        
        // Duration controls
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.adjustDuration(action);
            });
        });
        
        // Quick duration buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const duration = parseInt(btn.dataset.duration);
                document.getElementById('irrigation-duration').value = duration;
            });
        });
        
        // Start irrigation button
        document.getElementById('start-irrigation-btn').addEventListener('click', () => {
            this.startIrrigation();
        });
        
        // Quick action buttons
        document.getElementById('water-all-zones-btn').addEventListener('click', () => {
            this.waterAllZones();
        });
        
        document.getElementById('emergency-stop-btn').addEventListener('click', () => {
            this.emergencyStop();
        });
        
        document.getElementById('test-pump-btn').addEventListener('click', () => {
            this.testPump();
        });
        
        document.getElementById('sync-nodes-btn').addEventListener('click', () => {
            this.syncNodes();
        });
    },
    
    // Control pump ON/OFF
    async controlPump(turnOn) {
        try {
            const action = turnOn ? 'ON' : 'OFF';
            console.log(`[INFO] Turning pump ${action}...`);

            // Notification removed to reduce UI spam

            // In production, this would publish MQTT command
            // For now, we'll update the UI and store in database

            const { error } = await window.supabase
                .from('pump_commands')
                .insert({
                    farm_id: CONFIG.farmId,
                    command: turnOn ? 'on' : 'off',
                    requested_by: Auth.currentUser?.email || 'demo',
                    executed_at: new Date().toISOString()
                });

            if (error) {
                console.error('[ERROR] Failed to log pump command:', error.message);
                if (typeof Notifications !== 'undefined') {
                    Notifications.warning('Database Warning', 'Pump control logged locally only');
                }
            }

            // Update UI
            this.pumpStatus = turnOn;
            this.updatePumpUI(turnOn);

            // Update last action time
            document.getElementById('pump-last-action').textContent = new Date().toLocaleTimeString();

            // Success notification removed to reduce UI spam
            console.log(`[SUCCESS] Pump is now ${action.toLowerCase()}`);

            console.log(`[SUCCESS] Pump turned ${action}`);

        } catch (error) {
            console.error('[ERROR] Pump control failed:', error.message);
            if (typeof Notifications !== 'undefined') {
                Notifications.error('Control Failed', `Failed to control pump: ${error.message}`);
            } else {
                alert(`Failed to control pump: ${error.message}`);
            }
        }
    },
    
    // Update pump UI
    updatePumpUI(isOn) {
        const pumpIcon = document.getElementById('pump-icon');
        const statusIndicator = document.getElementById('pump-status-indicator');
        
        if (isOn) {
            pumpIcon.classList.remove('off');
            pumpIcon.classList.add('on');
            statusIndicator.classList.remove('off');
            statusIndicator.classList.add('on');
            statusIndicator.textContent = 'ON';
        } else {
            pumpIcon.classList.remove('on');
            pumpIcon.classList.add('off');
            statusIndicator.classList.remove('on');
            statusIndicator.classList.add('off');
            statusIndicator.textContent = 'OFF';
        }
    },
    
    // Load pump status from database
    async loadPumpStatus() {
        try {
            const { data, error } = await window.supabase
                .from('pump_commands')
                .select('*')
                .eq('farm_id', CONFIG.farmId)
                .order('executed_at', { ascending: false })
                .limit(1)
                .single();
            
            if (data && !error) {
                const isOn = data.command === 'on';
                this.pumpStatus = isOn;
                this.updatePumpUI(isOn);
                document.getElementById('pump-last-action').textContent = 
                    new Date(data.executed_at).toLocaleTimeString();
            }
        } catch (error) {
            console.log('[INFO] No previous pump status found');
        }
    },
    
    // Select irrigation zone
    selectZone(field, zone, button) {
        // Remove previous selection
        document.querySelectorAll('.zone-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Add selection to clicked button
        button.classList.add('selected');
        
        // Store selected zone
        this.selectedZone = { field: parseInt(field), zone: parseInt(zone) };
        
        // Update display
        document.getElementById('selected-zone-text').textContent = 
            `Field ${field}, Zone ${zone}`;
        
        console.log(`[INFO] Selected zone: Field ${field}, Zone ${zone}`);
    },
    
    // Adjust irrigation duration
    adjustDuration(action) {
        const input = document.getElementById('irrigation-duration');
        let value = parseInt(input.value);
        
        if (action === 'increase') {
            value = Math.min(value + 5, 60);
        } else {
            value = Math.max(value - 5, 1);
        }
        
        input.value = value;
    },
    
    // Start irrigation
    async startIrrigation() {
        if (!this.selectedZone) {
            alert('Please select a zone first');
            return;
        }
        
        const duration = parseInt(document.getElementById('irrigation-duration').value);
        
        if (confirm(`Start irrigation for Field ${this.selectedZone.field}, Zone ${this.selectedZone.zone} for ${duration} minutes?`)) {
            try {
                console.log(`[INFO] Starting irrigation: ${duration} minutes`);
                
                // Turn on pump
                await this.controlPump(true);
                
                // Log irrigation event
                const { error } = await window.supabase
                    .from('irrigation_logs')
                    .insert({
                        farm_id: CONFIG.farmId,
                        field_id: this.selectedZone.field,
                        zone_id: this.selectedZone.zone,
                        duration_minutes: duration,
                        started_at: new Date().toISOString(),
                        started_by: Auth.currentUser?.email || 'demo'
                    });
                
                if (error) {
                    console.error('[ERROR] Failed to log irrigation:', error.message);
                }
                
                // Start countdown timer
                this.startCountdown(duration);
                
                console.log('[SUCCESS] Irrigation started');
                
            } catch (error) {
                console.error('[ERROR] Failed to start irrigation:', error.message);
                alert(`Failed to start irrigation: ${error.message}`);
            }
        }
    },
    
    // Start countdown timer
    startCountdown(minutes) {
        const timerDiv = document.getElementById('irrigation-timer');
        const displaySpan = document.getElementById('timer-display');
        const startBtn = document.getElementById('start-irrigation-btn');
        
        timerDiv.classList.remove('hidden');
        startBtn.disabled = true;
        
        this.irrigationEndTime = Date.now() + (minutes * 60 * 1000);
        
        this.irrigationTimer = setInterval(() => {
            const remaining = this.irrigationEndTime - Date.now();
            
            if (remaining <= 0) {
                this.stopIrrigation();
                return;
            }
            
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            displaySpan.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
        }, 1000);
    },
    
    // Stop irrigation
    async stopIrrigation() {
        if (this.irrigationTimer) {
            clearInterval(this.irrigationTimer);
            this.irrigationTimer = null;
        }
        
        document.getElementById('irrigation-timer').classList.add('hidden');
        document.getElementById('start-irrigation-btn').disabled = false;
        
        // Turn off pump
        await this.controlPump(false);
        
        console.log('[INFO] Irrigation stopped');
    },
    
    // Water all zones
    async waterAllZones() {
        if (confirm('Water ALL zones for 15 minutes each? This will take a while.')) {
            console.log('[INFO] Starting all-zones irrigation...');
            alert('Feature coming soon: Sequential zone watering');
            // In production, this would trigger sequential watering
        }
    },
    
    // Emergency stop
    async emergencyStop() {
        if (confirm('EMERGENCY STOP: This will immediately turn off all pumps and irrigation. Continue?')) {
            console.log('[CRITICAL] Emergency stop activated!');
            
            // Stop all irrigation
            if (this.irrigationTimer) {
                clearInterval(this.irrigationTimer);
            }
            
            // Turn off pump
            await this.controlPump(false);
            
            // Update UI
            document.getElementById('irrigation-timer').classList.add('hidden');
            document.getElementById('start-irrigation-btn').disabled = false;
            
            alert('Emergency stop executed. All systems stopped.');
        }
    },
    
    // Test pump
    async testPump() {
        if (confirm('Run pump test for 1 minute?')) {
            console.log('[INFO] Testing pump...');
            await this.controlPump(true);
            
            setTimeout(async () => {
                await this.controlPump(false);
                alert('Pump test complete');
            }, 60000);
        }
    },
    
    // Sync nodes
    syncNodes() {
        console.log('[INFO] Syncing all nodes...');
        alert('Feature coming soon: Force sync all field nodes');
        // In production, this would publish sync command via MQTT
    },

    // Export pump and irrigation logs only
    async exportControlsLog() {
        try {
            console.log('[INFO] Exporting controls log...');
            
            const [pumpData, irrigationData] = await Promise.all([
                window.supabase
                    .from('pump_commands')
                    .select('*')
                    .order('executed_at', { ascending: false })
                    .limit(1000),
                
                window.supabase
                    .from('irrigation_logs')
                    .select('*')
                    .order('started_at', { ascending: false })
                    .limit(1000)
            ]);
            
            let csv = 'AGRICONNECT - PUMP & IRRIGATION LOG\n';
            csv += `Export Date: ${new Date().toISOString()}\n\n`;
            
            csv += 'PUMP COMMANDS\n';
            csv += 'Timestamp,Command,Requested By\n';
            
            pumpData.data?.forEach(row => {
                csv += `${row.executed_at},${row.command.toUpperCase()},${row.requested_by}\n`;
            });
            
            csv += '\n\nIRRIGATION LOGS\n';
            csv += 'Started At,Field,Zone,Duration (min),Started By,Completed\n';
            
            irrigationData.data?.forEach(row => {
                csv += `${row.started_at},${row.field_id},${row.zone_id},${row.duration_minutes},${row.started_by},${row.completed ? 'Yes' : 'No'}\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AgriConnect_Controls_Log_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            console.log('[SUCCESS] Controls log exported');
            
        } catch (error) {
            console.error('[ERROR] Export failed:', error.message);
        }
    }
};