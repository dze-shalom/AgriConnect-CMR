/*
 * AgriConnect Cloud Backend - Intelligent MQTT Subscriber
 * Version: 1.0.0
 * 
 * This is the BRAIN of AgriConnect - receives sensor data,
 * analyzes for disease risks, irrigation needs, anomalies,
 * and generates intelligent alerts.
 */

require('dotenv').config();
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// Import intelligence modules
const DiseaseAnalyzer = require('./intelligence/disease-analyzer');
const IrrigationOptimizer = require('./intelligence/irrigation-optimizer');
const AnomalyDetector = require('./intelligence/anomaly-detector');
const AlertManager = require('./intelligence/alert-manager');

// ==========================================
// CONFIGURATION
// ==========================================

const config = {
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY
    },
    mqtt: {
        broker: `mqtts://${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clientId: `cloud_subscriber_${Date.now()}`
    },
    farmId: process.env.FARM_ID || 'FARM-CM-001'
};

// ==========================================
// INITIALIZE CLIENTS
// ==========================================

console.log(' Starting AgriConnect Cloud Backend...\n');

// Initialize Supabase
const supabase = createClient(config.supabase.url, config.supabase.key);
console.log('✓ Supabase client initialized');

// Initialize Intelligence Modules
const diseaseAnalyzer = new DiseaseAnalyzer();
const irrigationOptimizer = new IrrigationOptimizer();
const anomalyDetector = new AnomalyDetector();
const alertManager = new AlertManager(supabase);
console.log('✓ Intelligence modules loaded');

// Initialize MQTT Client
const mqttClient = mqtt.connect(config.mqtt.broker, {
    username: config.mqtt.username,
    password: config.mqtt.password,
    clientId: config.mqtt.clientId,
    clean: true,
    reconnectPeriod: 5000
});

// ==========================================
// MQTT EVENT HANDLERS
// ==========================================

mqttClient.on('connect', () => {
    console.log('✓ Connected to MQTT broker');
    console.log(`  Broker: ${process.env.MQTT_BROKER}`);
    
    // Subscribe to all data topics
    mqttClient.subscribe('agriconnect/data/#', { qos: 1 }, (err) => {
        if (err) {
            console.error('✗ Subscription failed:', err);
        } else {
            console.log('✓ Subscribed to: agriconnect/data/#');
        }
    });
    
    // Subscribe to status topics
    mqttClient.subscribe('agriconnect/status/#', { qos: 0 }, (err) => {
        if (err) {
            console.error('✗ Subscription failed:', err);
        } else {
            console.log('✓ Subscribed to: agriconnect/status/#');
        }
    });
    
    console.log('\n Intelligence layer ACTIVE - monitoring farm...\n');
    console.log('='.repeat(60));
});

mqttClient.on('error', (error) => {
    console.error('✗ MQTT Error:', error.message);
});

mqttClient.on('reconnect', () => {
    console.log('⟳ Reconnecting to MQTT broker...');
});

mqttClient.on('offline', () => {
    console.log('⚠ MQTT client offline');
});

// ==========================================
// MESSAGE HANDLER (THE BRAIN!)
// ==========================================

mqttClient.on('message', async (topic, message) => {
    try {
        const timestamp = new Date().toISOString();
        console.log(`\n[$timestamp}] Message received on: ${topic}`);
        
        // Parse message
        const data = JSON.parse(message.toString());
        
        // Route based on topic type
        if (topic.startsWith('agriconnect/data/')) {
            await handleSensorData(topic, data);
        } else if (topic.startsWith('agriconnect/status/')) {
            await handleStatusMessage(topic, data);
        }
        
    } catch (error) {
        console.error('✗ Error processing message:', error.message);
    }
});

// ==========================================
// SENSOR DATA HANDLER
// ==========================================

async function handleSensorData(topic, data) {
    console.log(` Processing sensor data from ${data.gatewayId}...`);
    
    // Extract topic components
    const topicParts = topic.split('/');
    const gatewayId = topicParts[2];
    const fieldId = parseInt(topicParts[3]);
    const zoneId = parseInt(topicParts[4]);
    
    // ==========================================
    // STEP 1: STORE IN DATABASE
    // ==========================================
    
    try {
        const { data: insertedData, error } = await supabase
            .from('sensor_readings')
            .insert({
                gateway_id: gatewayId,
                field_id: fieldId,
                zone_id: zoneId,
                reading_time: new Date().toISOString(),
                latitude: data.location?.lat || null,
                longitude: data.location?.lon || null,
                
                // Environmental sensors
                air_temperature: data.sensors?.airTemperature || null,
                air_humidity: data.sensors?.airHumidity || null,
                light_intensity: data.sensors?.lightIntensity || null,
                par_value: data.sensors?.parValue || null,
                co2_ppm: data.sensors?.co2PPM || null,
                
                // Soil sensors
                soil_moisture: data.sensors?.soilMoisture || null,
                soil_temperature: data.sensors?.soilTemperature || null,
                ph_value: data.sensors?.phValue || null,
                ec_value: data.sensors?.ecValue || null,
                
                // NPK values
                nitrogen_ppm: data.sensors?.nitrogenPPM || null,
                phosphorus_ppm: data.sensors?.phosphorusPPM || null,
                potassium_ppm: data.sensors?.potassiumPPM || null,
                
                // System status
                water_level: data.system?.waterLevel || null,
                battery_level: data.system?.batteryLevel || null,
                pump_status: data.system?.pumpStatus || false,
                rssi: data.system?.rssi || null,
                
                data_valid: true
            })
            .select();
        
        if (error) {
            console.error('✗ Database insert failed:', error.message);
            return;
        }
        
        console.log('✓ Data stored in database');
        
    } catch (dbError) {
        console.error('✗ Database error:', dbError.message);
        return;
    }
    
    // ==========================================
    // STEP 2: INTELLIGENT ANALYSIS 
    // ==========================================
    
    console.log('\n Running intelligent analysis...');
    
    const insights = {
        diseases: [],
        irrigation: null,
        anomalies: [],
        nutrients: []
    };
    
    // Disease Risk Analysis
    if (data.sensors?.airTemperature && data.sensors?.airHumidity) {
        const diseaseRisks = diseaseAnalyzer.analyze(data.sensors);
        insights.diseases = diseaseRisks;
        
        if (diseaseRisks.length > 0) {
            console.log(`  ⚠ ${diseaseRisks.length} disease risk(s) detected`);
            diseaseRisks.forEach(risk => {
                console.log(`    - ${risk.disease}: ${risk.severity} (${risk.probability}% probability)`);
            });
        } else {
            console.log('  ✓ No disease risks detected');
        }
    }
    
    // Irrigation Optimization
    if (data.sensors?.soilMoisture) {
        const irrigationAdvice = irrigationOptimizer.optimize(data.sensors, data.system);
        insights.irrigation = irrigationAdvice;
        
        console.log(`  💧 Irrigation: ${irrigationAdvice.recommendation}`);
        if (irrigationAdvice.action) {
            console.log(`    Action: ${irrigationAdvice.action}`);
        }
    }
    
    // Anomaly Detection
    const anomalies = anomalyDetector.detect(data.sensors, {
        gatewayId: gatewayId,
        fieldId: fieldId,
        zoneId: zoneId
    });
    
    if (anomalies.length > 0) {
        insights.anomalies = anomalies;
        console.log(`  🔍 ${anomalies.length} anomaly/anomalies detected`);
        anomalies.forEach(anomaly => {
            console.log(`    - ${anomaly.sensor}: ${anomaly.message}`);
        });
    } else {
        console.log('  ✓ No anomalies detected');
    }
    
    // NPK Analysis
    if (data.sensors?.nitrogenPPM || data.sensors?.phosphorusPPM || data.sensors?.potassiumPPM) {
        const nutrientStatus = analyzeNutrients(data.sensors);
        insights.nutrients = nutrientStatus;
        
        if (nutrientStatus.length > 0) {
            console.log(`   Nutrient issues detected:`);
            nutrientStatus.forEach(issue => {
                console.log(`    - ${issue.nutrient}: ${issue.status} (${issue.current} ppm)`);
            });
        } else {
            console.log('  ✓ Nutrient levels optimal');
        }
    }
    
    // ==========================================
    // STEP 3: GENERATE ALERTS
    // ==========================================
    
    await alertManager.processInsights(insights, {
        farmId: config.farmId,
        gatewayId: gatewayId,
        fieldId: fieldId,
        zoneId: zoneId
    });
    
    console.log('='.repeat(60));
}

// ==========================================
// STATUS MESSAGE HANDLER
// ==========================================

async function handleStatusMessage(topic, data) {
    console.log(` Gateway status from ${data.gatewayId}: ${data.status}`);
    
    // Update gateway status in database
    const { error } = await supabase
        .from('gateways')
        .update({
            status: data.status,
            last_seen: new Date().toISOString(),
            firmware_version: data.firmwareVersion || null
        })
        .eq('gateway_id', data.gatewayId);
    
    if (error) {
        console.error('✗ Failed to update gateway status:', error.message);
    } else {
        console.log('✓ Gateway status updated');
    }
}

// ==========================================
// NUTRIENT ANALYSIS HELPER
// ==========================================

function analyzeNutrients(sensors) {
    const issues = [];
    
    // Optimal ranges for tomatoes (vegetative/fruiting average)
    const optimalRanges = {
        nitrogen: { min: 150, max: 250, name: 'Nitrogen' },
        phosphorus: { min: 40, max: 80, name: 'Phosphorus' },
        potassium: { min: 200, max: 400, name: 'Potassium' }
    };
    
    // Check Nitrogen
    if (sensors.nitrogenPPM !== undefined) {
        if (sensors.nitrogenPPM < optimalRanges.nitrogen.min) {
            issues.push({
                nutrient: 'Nitrogen',
                status: 'LOW',
                current: sensors.nitrogenPPM,
                target: `${optimalRanges.nitrogen.min}-${optimalRanges.nitrogen.max}`,
                severity: 'warning'
            });
        } else if (sensors.nitrogenPPM > optimalRanges.nitrogen.max) {
            issues.push({
                nutrient: 'Nitrogen',
                status: 'HIGH',
                current: sensors.nitrogenPPM,
                target: `${optimalRanges.nitrogen.min}-${optimalRanges.nitrogen.max}`,
                severity: 'info'
            });
        }
    }
    
    // Check Phosphorus
    if (sensors.phosphorusPPM !== undefined) {
        if (sensors.phosphorusPPM < optimalRanges.phosphorus.min) {
            issues.push({
                nutrient: 'Phosphorus',
                status: 'LOW',
                current: sensors.phosphorusPPM,
                target: `${optimalRanges.phosphorus.min}-${optimalRanges.phosphorus.max}`,
                severity: 'warning'
            });
        }
    }
    
    // Check Potassium
    if (sensors.potassiumPPM !== undefined) {
        if (sensors.potassiumPPM < optimalRanges.potassium.min) {
            issues.push({
                nutrient: 'Potassium',
                status: 'LOW',
                current: sensors.potassiumPPM,
                target: `${optimalRanges.potassium.min}-${optimalRanges.potassium.max}`,
                severity: 'warning'
            });
        }
    }
    
    return issues;
}

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    mqttClient.end();
    process.exit(0);
});

console.log('✓ Main subscriber initialized');
console.log('⏳ Waiting for MQTT connection...\n');