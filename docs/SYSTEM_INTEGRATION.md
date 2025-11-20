# AgriConnect System Integration Guide

Complete data flow documentation from field node → gateway → cloud → dashboard.

##  System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AgriConnect Platform                        │
└─────────────────────────────────────────────────────────────────┘

Field Nodes              Gateway                Cloud Backend           Dashboard
━━━━━━━━━━━             ━━━━━━━━━              ━━━━━━━━━━━━━          ━━━━━━━━━━━

┌──────────┐            ┌──────────┐            ┌──────────┐          ┌──────────┐
│ ESP32 +  │            │  ESP32   │            │ HiveMQ   │          │  Web     │
│ LoRa     │───LoRa────▶│  + WiFi  │───MQTT────▶│  Cloud   │─────────▶│ Browser  │
│ Sensors  │ 433MHz     │  + LoRa  │  TLS/8883  │  Broker  │  HTTPS   │Dashboard │
└──────────┘            └──────────┘            └──────────┘          └──────────┘
     │                        │                       │                     │
     │                        │                       ▼                     │
     │                        │                 ┌──────────┐               │
     │                        │                 │ Supabase │               │
     │                        │                 │PostgreSQL│◀──────────────┘
     │                        │                 └──────────┘    Realtime
     │                        │                       │        WebSocket
     │                        │                       ▼
     │                        │                 ┌──────────┐
     │                        │                 │  Edge    │
     │                        │                 │Functions │
     │                        └─────────────────│Email/SMS │
     │                          Status          └──────────┘
     ▼
 Deep Sleep
 (55 seconds)
```

## 🔄 Data Flow

### Step 1: Field Node → Gateway (LoRa)

**Field Node Code:**
```cpp
// AgriConnect_Field_Node.ino

StaticJsonDocument<512> doc;
doc["nodeId"] = "NODE-F1-Z1";
doc["fieldId"] = 1;
doc["zoneId"] = 1;
doc["timestamp"] = millis();

JsonObject sensors = doc.createNestedObject("sensors");
sensors["airTemperature"] = 25.3;
sensors["airHumidity"] = 68.5;
sensors["soilMoisture"] = 520;
sensors["soilTemperature"] = 22.1;
// ... more sensors

JsonObject system = doc.createNestedObject("system");
system["batteryLevel"] = 87;
system["pumpStatus"] = false;

String payload;
serializeJson(doc, payload);

LoRa.beginPacket();
LoRa.print(payload);
LoRa.endPacket();
```

**LoRa Transmission:**
```json
{
  "nodeId": "NODE-F1-Z1",
  "fieldId": 1,
  "zoneId": 1,
  "timestamp": 12345678,
  "sensors": {
    "airTemperature": 25.3,
    "airHumidity": 68.5,
    "soilMoisture": 520,
    "soilTemperature": 22.1,
    "lightIntensity": 45000,
    "nitrogenPpm": 45,
    "phosphorusPpm": 30,
    "potassiumPpm": 55,
    "phValue": 6.5,
    "ecValue": 1.2
  },
  "system": {
    "batteryLevel": 87,
    "pumpStatus": false,
    "waterLevel": 85
  }
}
```

**LoRa Parameters (MUST MATCH!):**
- Frequency: 433 MHz
- Sync Word: 0x34
- Spreading Factor: 10
- Bandwidth: 125 kHz
- Coding Rate: 4/8

---

### Step 2: Gateway Processing

**Gateway Code:**
```cpp
// AgriConnect_Gateway_Cloud.ino

void handleLoRaData() {
    // Receive LoRa packet
    String receivedData = "";
    while (LoRa.available()) {
        receivedData += (char)LoRa.read();
    }

    int rssi = LoRa.packetRssi();

    // Parse JSON
    StaticJsonDocument<512> doc;
    deserializeJson(doc, receivedData);

    // Add gateway metadata
    doc["gatewayId"] = GATEWAY_ID;
    doc["timestamp"] = millis();
    doc["system"]["rssi"] = rssi;

    JsonObject location = doc.createNestedObject("location");
    location["lat"] = 4.1560;
    location["lon"] = 9.2571;

    // Publish to MQTT
    publishSensorData(doc);
}
```

**Enhanced JSON (Gateway adds metadata):**
```json
{
  "nodeId": "NODE-F1-Z1",
  "fieldId": 1,
  "zoneId": 1,
  "gatewayId": "GW-CM-BUE-001",
  "timestamp": 12345678,
  "location": {
    "lat": 4.1560,
    "lon": 9.2571
  },
  "sensors": {
    "airTemperature": 25.3,
    "airHumidity": 68.5,
    "soilMoisture": 520,
    "soilTemperature": 22.1,
    "lightIntensity": 45000,
    "nitrogenPpm": 45,
    "phosphorusPpm": 30,
    "potassiumPpm": 55,
    "phValue": 6.5,
    "ecValue": 1.2
  },
  "system": {
    "batteryLevel": 87,
    "pumpStatus": false,
    "waterLevel": 85,
    "rssi": -45
  }
}
```

---

### Step 3: Gateway → MQTT Broker

**MQTT Topic Structure:**
```
agriconnect/data/{gateway_id}/{field_id}/{zone_id}

Example:
agriconnect/data/GW-CM-BUE-001/1/1
```

**MQTT Publish:**
```cpp
void publishSensorData(JsonDocument& doc) {
    String topic = "agriconnect/data/" +
                   String(GATEWAY_ID) + "/" +
                   String(doc["fieldId"].as<int>()) + "/" +
                   String(doc["zoneId"].as<int>());

    String payload;
    serializeJson(doc, payload);

    mqttClient.publish(topic.c_str(), payload.c_str());
}
```

**HiveMQ Cloud Configuration:**
- Broker: fd863c20c0ba41ddb2018d1b424cbd30.s1.eu.hivemq.cloud
- Port: 8883 (TLS)
- Username: gateway_client
- Password: Agriconnect12345
- QoS: 1 (At least once delivery)

---

### Step 4: MQTT → Database (Supabase Function)

**Supabase Edge Function** subscribes to MQTT topics and inserts to PostgreSQL:

```typescript
// MQTT subscriber (runs on server/cloud)

const message = JSON.parse(payload);

const { data, error } = await supabase
  .from('sensor_readings')
  .insert({
    gateway_id: message.gatewayId,
    field_id: message.fieldId,
    zone_id: message.zoneId,
    reading_time: new Date().toISOString(),
    latitude: message.location?.lat,
    longitude: message.location?.lon,

    // Environmental sensors
    air_temperature: message.sensors.airTemperature,
    air_humidity: message.sensors.airHumidity,
    light_intensity: message.sensors.lightIntensity,

    // Soil sensors
    soil_moisture: message.sensors.soilMoisture,
    soil_temperature: message.sensors.soilTemperature,
    ph_value: message.sensors.phValue,
    ec_value: message.sensors.ecValue,

    // NPK
    nitrogen_ppm: message.sensors.nitrogenPpm,
    phosphorus_ppm: message.sensors.phosphorusPpm,
    potassium_ppm: message.sensors.potassiumPpm,

    // System
    battery_level: message.system.batteryLevel,
    pump_status: message.system.pumpStatus,
    water_level: message.system.waterLevel,
    rssi: message.system.rssi
  });
```

**Database Schema:**
```sql
CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    gateway_id TEXT NOT NULL,
    field_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    reading_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Environmental
    air_temperature DECIMAL(5, 2),
    air_humidity DECIMAL(5, 2),
    light_intensity INTEGER,

    -- Soil
    soil_moisture INTEGER,
    soil_temperature DECIMAL(5, 2),
    ph_value DECIMAL(4, 2),
    ec_value DECIMAL(6, 2),

    -- NPK
    nitrogen_ppm INTEGER,
    phosphorus_ppm INTEGER,
    potassium_ppm INTEGER,

    -- System
    battery_level INTEGER,
    pump_status BOOLEAN,
    water_level INTEGER,
    rssi INTEGER
);
```

---

### Step 5: Database → Dashboard (Realtime)

**Dashboard Realtime Subscription:**
```javascript
// dashboard/public/js/realtime.js

const realtimeSubscription = window.supabase
    .channel('sensor-updates')
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_readings'
        },
        (payload) => {
            console.log('New sensor reading:', payload.new);

            // Update dashboard UI
            updateSensorCards(payload.new);
            updateCharts(payload.new);
            updateMap(payload.new);

            // Check thresholds for alerts
            checkThresholds(payload.new);
        }
    )
    .subscribe();
```

**Dashboard Display:**
- **Sensor Cards:** Real-time metrics with color coding
- **Charts:** Time-series graphs updated every minute
- **Map:** Node markers with popup data
- **Alerts:** Email/SMS when thresholds exceeded
- **ML Predictions:** TensorFlow.js yield forecasting

---

## 🔄 Complete Data Mapping

### Field Node → Gateway → Database → Dashboard

| Field Node | Gateway Adds | Database Column | Dashboard Display |
|------------|--------------|-----------------|-------------------|
| sensors.airTemperature | - | air_temperature | Temperature Card (°C) |
| sensors.airHumidity | - | air_humidity | Humidity Card (%) |
| sensors.soilMoisture | - | soil_moisture | Soil Moisture Gauge |
| sensors.soilTemperature | - | soil_temperature | Soil Temp (°C) |
| sensors.lightIntensity | - | light_intensity | Light Level (lux) |
| sensors.nitrogenPpm | - | nitrogen_ppm | Nutrient N Chart |
| sensors.phosphorusPpm | - | phosphorus_ppm | Nutrient P Chart |
| sensors.potassiumPpm | - | potassium_ppm | Nutrient K Chart |
| sensors.phValue | - | ph_value | pH Indicator |
| sensors.ecValue | - | ec_value | EC Chart |
| system.batteryLevel | - | battery_level | Battery Icon (%) |
| system.pumpStatus | - | pump_status | Pump Status LED |
| system.waterLevel | - | water_level | Water Tank Level |
| - | system.rssi | rssi | Signal Strength |
| - | location.lat | latitude | Map Marker |
| - | location.lon | longitude | Map Marker |
| - | gatewayId | gateway_id | Gateway Info |
| fieldId | - | field_id | Field Filter |
| zoneId | - | zone_id | Zone Filter |
| timestamp | - | reading_time | Last Updated |

---

## ⚙️ Configuration Matching Checklist

###  Field Node Configuration

```cpp
// Must match gateway and system
#define FIELD_ID 1                    // Database field_id
#define ZONE_ID 1                     // Database zone_id
#define LORA_FREQUENCY 433E6          // Match gateway
#define LORA_SYNC_WORD 0x34           // Match gateway
```

###  Gateway Configuration

```cpp
// Must match field nodes and MQTT broker
#define LORA_FREQUENCY 433E6          // Match field nodes
#define LORA_SYNC_WORD 0x34           // Match field nodes
#define MQTT_BROKER "..."             // HiveMQ broker
#define GATEWAY_ID "GW-CM-BUE-001"    // Database gateway_id
#define FARM_ID "FARM-CM-001"         // Database farm_id
```

###  Dashboard Configuration

```javascript
// dashboard/public/js/config.js
const CONFIG = {
    supabase: {
        url: 'YOUR_SUPABASE_URL',     // Match Supabase project
        anonKey: 'YOUR_ANON_KEY'       // Match Supabase project
    },
    farmId: 'FARM-CM-001'              // Match gateway FARM_ID
};
```

---

##  End-to-End Testing

### Test 1: Field Node to Gateway (LoRa)

**On Field Node:**
```
Upload firmware
Open Serial Monitor (115200 baud)
Expected output:
  ✓ LoRa initialized successfully
  ✓ Cycle completed successfully
```

**On Gateway:**
```
Open Serial Monitor (115200 baud)
Expected output:
  --- LoRa Packet Received ---
  Data: {"nodeId":"NODE-F1-Z1",...}
  RSSI: -45 dBm
  ✓ Published successfully
```

### Test 2: Gateway to MQTT Broker

**Test MQTT Connection:**
```bash
# Install MQTT client
npm install -g mqtt

# Subscribe to topics
mqtt subscribe -h "fd863c20c0ba41ddb2018d1b424cbd30.s1.eu.hivemq.cloud" \
               -p 8883 \
               -u "gateway_client" \
               -P "Agriconnect12345" \
               --protocol mqtts \
               -t "agriconnect/data/#"
```

**Expected Output:**
```json
Topic: agriconnect/data/GW-CM-BUE-001/1/1
{
  "nodeId": "NODE-F1-Z1",
  "fieldId": 1,
  "zoneId": 1,
  "gatewayId": "GW-CM-BUE-001",
  ...
}
```

### Test 3: Database Insertion

**Query Supabase:**
```sql
SELECT *
FROM sensor_readings
WHERE field_id = 1
  AND zone_id = 1
ORDER BY reading_time DESC
LIMIT 10;
```

**Expected Result:**
New rows appearing every minute with sensor data.

### Test 4: Dashboard Realtime Updates

**Open Dashboard:**
```
Navigate to: http://localhost:8000
or
Your deployed dashboard URL
```

**Verify:**
- Sensor cards update every minute
- Charts show new data points
- Map marker has latest data
- Battery level displayed
- Signal strength shown

---

##  Troubleshooting Matrix

| Symptom | Check Layer | Solution |
|---------|-------------|----------|
| No data at all | Field Node | Check battery, LoRa init, sensors |
| Gateway receives but no MQTT | Gateway | Check WiFi, MQTT credentials |
| MQTT works but no database | Backend | Check Supabase function, permissions |
| Database has data but no dashboard | Dashboard | Check Supabase config, realtime subscription |
| Data inconsistent | All | Verify field_id/zone_id match everywhere |
| Battery drains fast | Field Node | Enable deep sleep, check current draw |
| LoRa range poor | Field Node + Gateway | Check antenna, increase TX power, raise height |
| Dashboard shows old data | Dashboard | Check realtime connection, refresh browser |

---

##  Deployment Sequence

### 1. Database Setup
```sql
-- Run all migrations
psql -f supabase/migrations/*.sql
```

### 2. Deploy Gateway
- Upload gateway firmware
- Verify WiFi connection
- Verify MQTT connection
- Test LoRa reception

### 3. Deploy Field Nodes
- Configure unique field_id/zone_id
- Upload firmware to each node
- Test LoRa transmission
- Deploy to field locations
- Verify gateway receives data

### 4. Deploy Dashboard
- Configure Supabase credentials
- Deploy to web server
- Test realtime updates
- Configure alerts (email/SMS)

### 5. Verification
- Check data flow end-to-end
- Verify alerts trigger correctly
- Test ML predictions
- Generate test PDF report

---

##  Mobile App Integration (Future)

React Native app will use same Supabase backend:

```javascript
// React Native
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Real-time subscription (same as web)
supabase
  .channel('sensor-updates')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
      (payload) => {
        updateUI(payload.new);
      })
  .subscribe();
```

---

##  Security Best Practices

1. **Field Node:**
   - No secrets stored (stateless)
   - Deep sleep when idle
   - Encrypted firmware (future)

2. **Gateway:**
   - WiFi credentials in secure storage
   - MQTT over TLS (port 8883)
   - Supabase RLS policies

3. **Dashboard:**
   - Authentication required
   - Row-level security on database
   - HTTPS only in production

---

##  Scaling Considerations

| Scale | Field Nodes | Gateways | Database | Notes |
|-------|-------------|----------|----------|-------|
| Small Farm | 1-10 | 1 | Free tier | Current setup |
| Medium Farm | 10-50 | 1-3 | Pro tier | Multiple gateways |
| Large Farm | 50-500 | 5-20 | Enterprise | Load balancing |
| Multi-Farm | 500+ | 20+ | Dedicated | Custom infrastructure |

**Performance:**
- 1 gateway handles ~50 field nodes
- 1 reading/minute = 4,320 DB rows/day/node
- PostgreSQL handles millions of rows easily
- Realtime scales to 10,000+ concurrent connections

---

##  Additional Documentation

- **Field Node Firmware:** `/field_node_firmware/README.md`
- **Gateway Firmware:** `/gateway_firmware_v2/README.md`
- **Database Schema:** `/cloud_backend/database/schema.sql`
- **Dashboard Setup:** `/dashboard/public/README.md`
- **TensorFlow ML:** `/docs/TENSORFLOW_ML.md`
- **SMS Alerts:** `/docs/TWILIO_SETUP.md`

---

**Last Updated:** November 2025
**System Version:** 2.0.0
**Protocol:** LoRa 433MHz + MQTT + WebSocket
