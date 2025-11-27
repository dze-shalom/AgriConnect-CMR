/**
 * Predictive Maintenance Module
 * Predicts equipment failures and schedules maintenance
 */

const PredictiveMaintenance = {
    equipment: {},
    maintenanceSchedule: [],
    alerts: [],

    // Initialize module
    init() {
        console.log('[INFO] Initializing Predictive Maintenance...');

        this.loadEquipmentData();
        this.startMonitoring();
        this.setupEventListeners();

        console.log('[SUCCESS] Predictive Maintenance initialized');
    },

    // Load equipment data
    loadEquipmentData() {
        const saved = localStorage.getItem('equipment-data');
        if (saved) {
            this.equipment = JSON.parse(saved);
        } else {
            this.equipment = {
                pump: {
                    id: 'pump-001',
                    name: 'Water Pump',
                    type: 'centrifugal',
                    installDate: new Date('2024-01-15'),
                    lastService: new Date('2024-01-15'),
                    runtime: 0, // hours
                    cycles: 0,
                    health: 100,
                    alerts: []
                },
                gateway: {
                    id: 'gateway-001',
                    name: 'LoRa Gateway',
                    type: 'network',
                    installDate: new Date('2024-01-10'),
                    lastService: null,
                    uptime: 0, // hours
                    networkDrops: 0,
                    health: 100,
                    alerts: []
                },
                sensors: this.initializeSensors()
            };
            this.saveEquipmentData();
        }
    },

    // Initialize sensor array
    initializeSensors() {
        const sensors = [];
        for (let i = 1; i <= 6; i++) {
            sensors.push({
                id: `sensor-00${i}`,
                name: `Sensor Node ${i}`,
                type: 'multi-sensor',
                batteryLevel: 100,
                lastReading: new Date(),
                readingCount: 0,
                missedReadings: 0,
                health: 100,
                alerts: []
            });
        }
        return sensors;
    },

    // Setup event listeners
    setupEventListeners() {
        // Listen for pump activations
        document.addEventListener('pump-activated', () => {
            this.trackPumpUsage();
        });

        // Listen for sensor readings
        document.addEventListener('sensor-reading', (e) => {
            this.trackSensorReading(e.detail);
        });
    },

    // Start monitoring equipment
    startMonitoring() {
        // Check equipment health every 6 hours
        setInterval(() => {
            this.analyzeEquipmentHealth();
        }, 21600000); // 6 hours

        // Update runtime counters every minute
        setInterval(() => {
            this.updateRuntimeCounters();
        }, 60000); // 1 minute
    },

    // Track pump usage
    trackPumpUsage() {
        if (!this.equipment.pump) return;

        this.equipment.pump.cycles++;
        this.equipment.pump.runtime += 15; // Assume 15 min average

        // Check for maintenance due
        this.checkPumpMaintenance();

        this.saveEquipmentData();
    },

    // Track sensor readings
    trackSensorReading(sensorId) {
        const sensor = this.equipment.sensors.find(s => s.id === sensorId);
        if (sensor) {
            sensor.readingCount++;
            sensor.lastReading = new Date();
            sensor.batteryLevel = Math.max(0, sensor.batteryLevel - 0.01); // Simulate drain

            this.saveEquipmentData();
        }
    },

    // Update runtime counters
    updateRuntimeCounters() {
        if (this.equipment.gateway) {
            this.equipment.gateway.uptime += 1/60; // hours
        }
        this.saveEquipmentData();
    },

    // Analyze equipment health
    analyzeEquipmentHealth() {
        console.log('[INFO] Analyzing equipment health...');

        this.analyzePumpHealth();
        this.analyzeGatewayHealth();
        this.analyzeSensorHealth();

        this.generateMaintenanceSchedule();
        this.updateUI();
    },

    // Analyze pump health
    analyzePumpHealth() {
        const pump = this.equipment.pump;
        if (!pump) return;

        const alerts = [];
        let health = 100;

        // Check runtime
        if (pump.runtime > 1000) {
            alerts.push({
                type: 'warning',
                message: 'High runtime - service recommended',
                severity: 'medium',
                dueDate: this.addDays(new Date(), 30)
            });
            health -= 10;
        }

        // Check last service date
        const daysSinceService = this.daysBetween(pump.lastService, new Date());
        if (daysSinceService > 180) {
            alerts.push({
                type: 'warning',
                message: '6-month service overdue',
                severity: 'high',
                dueDate: new Date()
            });
            health -= 20;
        }

        // Check cycles
        if (pump.cycles > 500) {
            alerts.push({
                type: 'info',
                message: 'Approaching maintenance interval',
                severity: 'low',
                dueDate: this.addDays(new Date(), 60)
            });
            health -= 5;
        }

        pump.health = Math.max(0, health);
        pump.alerts = alerts;
    },

    // Analyze gateway health
    analyzeGatewayHealth() {
        const gateway = this.equipment.gateway;
        if (!gateway) return;

        const alerts = [];
        let health = 100;

        // Check uptime
        if (gateway.uptime > 4380) { // 6 months
            alerts.push({
                type: 'info',
                message: 'Gateway running for 6+ months - consider reboot',
                severity: 'low',
                dueDate: this.addDays(new Date(), 7)
            });
            health -= 5;
        }

        // Check network drops
        if (gateway.networkDrops > 50) {
            alerts.push({
                type: 'warning',
                message: 'High network drop rate - check connectivity',
                severity: 'medium',
                dueDate: this.addDays(new Date(), 3)
            });
            health -= 15;
        }

        gateway.health = Math.max(0, health);
        gateway.alerts = alerts;
    },

    // Analyze sensor health
    analyzeSensorHealth() {
        this.equipment.sensors.forEach(sensor => {
            const alerts = [];
            let health = 100;

            // Check battery level
            if (sensor.batteryLevel < 20) {
                alerts.push({
                    type: 'warning',
                    message: 'Low battery - replace soon',
                    severity: 'high',
                    dueDate: this.addDays(new Date(), 14)
                });
                health -= 30;
            } else if (sensor.batteryLevel < 40) {
                alerts.push({
                    type: 'info',
                    message: 'Battery level moderate',
                    severity: 'low',
                    dueDate: this.addDays(new Date(), 30)
                });
                health -= 10;
            }

            // Check missed readings
            if (sensor.missedReadings > 10) {
                alerts.push({
                    type: 'warning',
                    message: 'Frequent missed readings - check sensor',
                    severity: 'medium',
                    dueDate: this.addDays(new Date(), 7)
                });
                health -= 20;
            }

            // Check last reading time
            const hoursSinceReading = (new Date() - sensor.lastReading) / (1000 * 60 * 60);
            if (hoursSinceReading > 6) {
                alerts.push({
                    type: 'error',
                    message: 'No readings in 6+ hours - sensor may be offline',
                    severity: 'high',
                    dueDate: new Date()
                });
                health -= 40;
            }

            sensor.health = Math.max(0, health);
            sensor.alerts = alerts;
        });
    },

    // Check pump maintenance
    checkPumpMaintenance() {
        const pump = this.equipment.pump;
        if (!pump) return;

        const daysSinceService = this.daysBetween(pump.lastService, new Date());

        if (daysSinceService >= 180 || pump.runtime >= 1000) {
            this.scheduleMainten('pump', 'Regular service required', 'medium', 14);
        }
    },

    // Schedule maintenance
    scheduleMaintenance(equipmentId, reason, priority, daysUntilDue) {
        const existing = this.maintenanceSchedule.find(m =>
            m.equipmentId === equipmentId && m.status === 'pending'
        );

        if (!existing) {
            this.maintenanceSchedule.push({
                id: `maint-${Date.now()}`,
                equipmentId: equipmentId,
                reason: reason,
                priority: priority,
                scheduledDate: this.addDays(new Date(), daysUntilDue),
                status: 'pending',
                createdAt: new Date()
            });

            this.saveEquipmentData();

            // Show notification for high priority
            if (priority === 'high' && typeof Notifications !== 'undefined') {
                Notifications.show(
                    '[MAINTENANCE] Maintenance Due',
                    `${this.getEquipmentName(equipmentId)}: ${reason}`,
                    'warning',
                    8000
                );
            }
        }
    },

    // Generate maintenance schedule
    generateMaintenanceSchedule() {
        // Clear old completed tasks
        this.maintenanceSchedule = this.maintenanceSchedule.filter(
            m => m.status !== 'completed' || this.daysBetween(m.completedDate, new Date()) < 30
        );

        // Add new tasks from equipment alerts
        Object.values(this.equipment).forEach(eq => {
            if (Array.isArray(eq)) {
                eq.forEach(item => this.processEquipmentAlerts(item));
            } else {
                this.processEquipmentAlerts(eq);
            }
        });

        this.saveEquipmentData();
    },

    // Process equipment alerts
    processEquipmentAlerts(equipment) {
        if (!equipment.alerts) return;

        equipment.alerts.forEach(alert => {
            if (alert.severity === 'high' || alert.severity === 'medium') {
                const daysUntilDue = this.daysBetween(new Date(), alert.dueDate);
                this.scheduleMaintenance(
                    equipment.id,
                    alert.message,
                    alert.severity,
                    Math.max(0, daysUntilDue)
                );
            }
        });
    },

    // Update UI
    updateUI() {
        this.updateHealthCards();
        this.updateMaintenanceList();
    },

    // Update health cards
    updateHealthCards() {
        const container = document.getElementById('equipment-health-container');
        if (!container) return;

        const allEquipment = [
            this.equipment.pump,
            this.equipment.gateway,
            ...this.equipment.sensors
        ];

        container.innerHTML = allEquipment.map(eq => `
            <div class="health-card ${this.getHealthClass(eq.health)}">
                <div class="health-header">
                    <span class="health-name">${eq.name}</span>
                    <span class="health-score">${eq.health}%</span>
                </div>
                <div class="health-bar">
                    <div class="health-fill" style="width: ${eq.health}%"></div>
                </div>
                ${eq.alerts && eq.alerts.length > 0 ? `
                    <div class="health-alerts">
                        ${eq.alerts.map(a => `
                            <div class="health-alert ${a.severity}">
                                ${a.message}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    },

    // Update maintenance list
    updateMaintenanceList() {
        const container = document.getElementById('maintenance-list-container');
        if (!container) return;

        const pending = this.maintenanceSchedule
            .filter(m => m.status === 'pending')
            .sort((a, b) => a.scheduledDate - b.scheduledDate);

        container.innerHTML = pending.map(task => `
            <div class="maintenance-task ${task.priority}">
                <div class="task-equipment">${this.getEquipmentName(task.equipmentId)}</div>
                <div class="task-reason">${task.reason}</div>
                <div class="task-date">
                    Due: ${task.scheduledDate.toLocaleDateString()}
                </div>
                <button class="task-complete-btn" onclick="PredictiveMaintenance.completeMaintenance('${task.id}')">
                    Mark Complete
                </button>
            </div>
        `).join('');
    },

    // Complete maintenance task
    completeMaintenance(taskId) {
        const task = this.maintenanceSchedule.find(t => t.id === taskId);
        if (task) {
            task.status = 'completed';
            task.completedDate = new Date();

            // Update equipment last service date
            const equipment = this.getEquipmentById(task.equipmentId);
            if (equipment) {
                equipment.lastService = new Date();
                equipment.runtime = 0; // Reset runtime
                equipment.cycles = 0; // Reset cycles
                equipment.health = 100; // Reset health
                equipment.alerts = []; // Clear alerts
            }

            this.saveEquipmentData();
            this.updateUI();

            if (typeof Notifications !== 'undefined') {
                Notifications.show('[SUCCESS] Maintenance Complete', 'Equipment serviced successfully', 'success', 3000);
            }
        }
    },

    // Helper functions
    getEquipmentById(id) {
        if (this.equipment.pump && this.equipment.pump.id === id) return this.equipment.pump;
        if (this.equipment.gateway && this.equipment.gateway.id === id) return this.equipment.gateway;
        return this.equipment.sensors.find(s => s.id === id);
    },

    getEquipmentName(id) {
        const eq = this.getEquipmentById(id);
        return eq ? eq.name : id;
    },

    getHealthClass(health) {
        if (health >= 80) return 'health-good';
        if (health >= 50) return 'health-fair';
        return 'health-poor';
    },

    daysBetween(date1, date2) {
        const diff = Math.abs(date2 - date1);
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    },

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    saveEquipmentData() {
        localStorage.setItem('equipment-data', JSON.stringify(this.equipment));
        localStorage.setItem('maintenance-schedule', JSON.stringify(this.maintenanceSchedule));
    }
};
