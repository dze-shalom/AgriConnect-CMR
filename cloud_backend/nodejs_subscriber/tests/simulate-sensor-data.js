/**
 * Sensor Data Simulator
 * Simulates MQTT messages from field nodes for testing
 * Tests all intelligence modules without physical hardware
 */

const mqtt = require('mqtt');
require('dotenv').config();

// Configuration
const MQTT_BROKER = `mqtts://${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

console.log('\n========================================');
console.log('AgriConnect Sensor Data Simulator');
console.log('========================================\n');

// Connect to MQTT
const client = mqtt.connect(MQTT_BROKER, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    clientId: `simulator_${Date.now()}`
});

// Test scenarios
const scenarios = {
    normal: {
        name: 'Normal Conditions (Optimal)',
        data: {
            gatewayId: "GW-CM-BUE-001",
            fieldId: 1,
            zoneId: 0,
            timestamp: new Date().toISOString(),
            location: {
                lat: 4.1560,
                lon: 9.2571
            },
            sensors: {
                airTemperature: 25.5,
                airHumidity: 68.0,
                soilMoisture: 520,
                soilTemperature: 23.2,
                phValue: 6.5,
                ecValue: 2.8,
                nitrogenPPM: 200,
                phosphorusPPM: 60,
                potassiumPPM: 280,
                lightIntensity: 45000,
                parValue: 850,
                co2PPM: 420,
                waterLevel: 1
            },
            system: {
                batteryLevel: 85,
                pumpStatus: false,
                rssi: -65
            }
        }
    },
    
    lateBlight: {
        name: 'Late Blight Risk (CRITICAL)',
        data: {
            gatewayId: "GW-CM-BUE-001",
            fieldId: 1,
            zoneId: 1,
            timestamp: new Date().toISOString(),
            location: {
                lat: 4.1560,
                lon: 9.2571
            },
            sensors: {
                airTemperature: 18.5,
                airHumidity: 95.0,
                soilMoisture: 480,
                soilTemperature: 17.8,
                phValue: 6.7,
                ecValue: 2.5,
                nitrogenPPM: 180,
                phosphorusPPM: 55,
                potassiumPPM: 260,
                lightIntensity: 12000,
                parValue: 320,
                co2PPM: 450,
                waterLevel: 1
            },
            system: {
                batteryLevel: 78,
                pumpStatus: false,
                rssi: -68
            }
        }
    },
    
    irrigationNeeded: {
        name: 'Urgent Irrigation Needed',
        data: {
            gatewayId: "GW-CM-BUE-001",
            fieldId: 1,
            zoneId: 2,
            timestamp: new Date().toISOString(),
            location: {
                lat: 4.1560,
                lon: 9.2571
            },
            sensors: {
                airTemperature: 32.0,
                airHumidity: 45.0,
                soilMoisture: 320,
                soilTemperature: 28.5,
                phValue: 6.3,
                ecValue: 3.2,
                nitrogenPPM: 190,
                phosphorusPPM: 58,
                potassiumPPM: 270,
                lightIntensity: 85000,
                parValue: 1450,
                co2PPM: 400,
                waterLevel: 0
            },
            system: {
                batteryLevel: 82,
                pumpStatus: false,
                rssi: -62
            }
        }
    },
    
    sensorMalfunction: {
        name: 'Sensor Malfunction (pH Error)',
        data: {
            gatewayId: "GW-CM-BUE-001",
            fieldId: 1,
            zoneId: 3,
            timestamp: new Date().toISOString(),
            location: {
                lat: 4.1560,
                lon: 9.2571
            },
            sensors: {
                airTemperature: 24.8,
                airHumidity: 72.0,
                soilMoisture: 510,
                soilTemperature: 23.5,
                phValue: 14.5,
                ecValue: 2.6,
                nitrogenPPM: 195,
                phosphorusPPM: 62,
                potassiumPPM: 285,
                lightIntensity: 52000,
                parValue: 920,
                co2PPM: 415,
                waterLevel: 1
            },
            system: {
                batteryLevel: 88,
                pumpStatus: false,
                rssi: -64
            }
        }
    },
    
    nutrientDeficiency: {
        name: 'Nutrient Deficiency (Low NPK)',
        data: {
            gatewayId: "GW-CM-BUE-001",
            fieldId: 2,
            zoneId: 0,
            timestamp: new Date().toISOString(),
            location: {
                lat: 4.1562,
                lon: 9.2573
            },
            sensors: {
                airTemperature: 26.2,
                airHumidity: 65.0,
                soilMoisture: 495,
                soilTemperature: 24.1,
                phValue: 6.8,
                ecValue: 1.8,
                nitrogenPPM: 85,
                phosphorusPPM: 25,
                potassiumPPM: 120,
                lightIntensity: 48000,
                parValue: 880,
                co2PPM: 425,
                waterLevel: 1
            },
            system: {
                batteryLevel: 91,
                pumpStatus: false,
                rssi: -59
            }
        }
    },
    
    lowBattery: {
        name: 'Low Battery Warning',
        data: {
            gatewayId: "GW-CM-BUE-001",
            fieldId: 2,
            zoneId: 1,
            timestamp: new Date().toISOString(),
            location: {
                lat: 4.1562,
                lon: 9.2573
            },
            sensors: {
                airTemperature: 25.0,
                airHumidity: 70.0,
                soilMoisture: 505,
                soilTemperature: 23.8,
                phValue: 6.6,
                ecValue: 2.7,
                nitrogenPPM: 198,
                phosphorusPPM: 59,
                potassiumPPM: 275,
                lightIntensity: 46000,
                parValue: 865,
                co2PPM: 418,
                waterLevel: 1
            },
            system: {
                batteryLevel: 15,
                pumpStatus: false,
                rssi: -71
            }
        }
    },
    
    earlyBlight: {
        name: 'Early Blight Risk (HIGH)',
        data: {
            gatewayId: "GW-CM-BUE-001",
            fieldId: 2,
            zoneId: 2,
            timestamp: new Date().toISOString(),
            location: {
                lat: 4.1562,
                lon: 9.2573
            },
            sensors: {
                airTemperature: 27.0,
                airHumidity: 92.0,
                soilMoisture: 530,
                soilTemperature: 25.5,
                phValue: 6.4,
                ecValue: 2.9,
                nitrogenPPM: 205,
                phosphorusPPM: 61,
                potassiumPPM: 290,
                lightIntensity: 38000,
                parValue: 750,
                co2PPM: 440,
                waterLevel: 1
            },
            system: {
                batteryLevel: 87,
                pumpStatus: false,
                rssi: -66
            }
        }
    }
};

client.on('connect', () => {
    console.log('[SUCCESS] Connected to MQTT broker\n');
    console.log('Available test scenarios:\n');
    
    let index = 1;
    for (const [key, scenario] of Object.entries(scenarios)) {
        console.log(`  ${index}. ${scenario.name}`);
        index++;
    }
    
    console.log('\n========================================');
    console.log('Starting automated test sequence...');
    console.log('========================================\n');
    
    runTestSequence();
});

client.on('error', (error) => {
    console.error('[ERROR] MQTT connection failed:', error.message);
    process.exit(1);
});

async function runTestSequence() {
    let delay = 3000; // 3 seconds between tests
    
    for (const [key, scenario] of Object.entries(scenarios)) {
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`\n[TEST] Running: ${scenario.name}`);
        console.log('----------------------------------------');
        
        const topic = `agriconnect/data/${scenario.data.gatewayId}/${scenario.data.fieldId}/${scenario.data.zoneId}`;
        const payload = JSON.stringify(scenario.data);
        
        client.publish(topic, payload, { qos: 1 }, (error) => {
            if (error) {
                console.error('[ERROR] Publish failed:', error.message);
            } else {
                console.log(`[SUCCESS] Published to: ${topic}`);
                console.log('[INFO] Payload size:', payload.length, 'bytes');
            }
        });
    }
    
    // Send gateway status message
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log('\n[TEST] Sending gateway status update');
    console.log('----------------------------------------');
    
    const statusData = {
        gatewayId: "GW-CM-BUE-001",
        timestamp: new Date().toISOString(),
        status: "online",
        firmwareVersion: "2.0.0",
        uptime: 86400,
        activeNodes: 7,
        freeHeap: 180000,
        wifiRSSI: -45,
        satelliteEnabled: false
    };
    
    const statusTopic = `agriconnect/status/${statusData.gatewayId}`;
    const statusPayload = JSON.stringify(statusData);
    
    client.publish(statusTopic, statusPayload, { qos: 0, retain: true }, (error) => {
        if (error) {
            console.error('[ERROR] Status publish failed:', error.message);
        } else {
            console.log(`[SUCCESS] Published to: ${statusTopic}`);
        }
    });
    
    // Wait a bit then disconnect
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n========================================');
    console.log('[SUCCESS] Test sequence complete!');
    console.log('========================================\n');
    console.log('[INFO] Check the main subscriber output for intelligence analysis');
    console.log('[INFO] Check Supabase database for stored data and alerts\n');
    
    client.end();
    process.exit(0);
}