# AgriConnect Field Node Firmware

Complete ESP32-based field sensor node firmware for agricultural IoT monitoring.

## 📋 Overview

The AgriConnect Field Node is a battery-powered, solar-charged IoT sensor platform that:
- Collects multi-sensor agricultural data
- Transmits via LoRa to gateway (up to 10km range)
- Operates in deep sleep for months on battery
- Supports remote pump control commands
- Weatherproof enclosure rated IP65

## 🔧 Hardware Requirements

### Core Components

| Component | Specification | Purpose | Link |
|-----------|---------------|---------|------|
| ESP32 DevKit | ESP32-WROOM-32 | Main microcontroller | - |
| LoRa Module | SX1276/SX1278 433MHz | Wireless communication | - |
| Solar Panel | 6V 6W | Primary power source | - |
| LiPo Battery | 3.7V 5000mAh | Energy storage | - |
| TP4056 Module | With protection | Battery charging | - |

### Sensors (All sensors are optional - select based on needs)

#### Environmental Sensors
- **DHT22** - Air temperature & humidity
- **BH1750** or **LDR** - Light intensity
- **DS18B20** - Soil temperature (waterproof)

#### Soil Sensors
- **Capacitive Soil Moisture** - Corrosion resistant
- **pH Sensor** - Soil acidity (optional)
- **EC Sensor** - Electrical conductivity (optional)
- **NPK Sensor RS485** - Nitrogen, phosphorus, potassium (optional)

#### System Sensors
- **INA219** - Voltage/current monitoring
- **Ultrasonic HC-SR04** - Water level (optional)

### Additional Hardware
- **5V Relay Module** - Pump control
- **Voltage Divider** - Battery monitoring
- **Waterproof Enclosure** - IP65 rated
- **Cable Glands** - Sealed sensor cable entry

## 📊 Wiring Diagram

### ESP32 Pinout

```
┌─────────────────────────────────────┐
│           ESP32 DevKit              │
├─────────────────────────────────────┤
│                                     │
│  3.3V ────────────── DHT22 VCC     │
│  GND  ────────────── All GND       │
│                                     │
│  GPIO 4  ──────────── DHT22 Data   │
│  GPIO 5  ──────────── LoRa SCK     │
│  GPIO 14 ──────────── LoRa RST     │
│  GPIO 19 ──────────── LoRa MISO    │
│  GPIO 23 ──────────── Pump Relay   │
│  GPIO 25 ──────────── LoRa NSS     │
│  GPIO 26 ──────────── LoRa DIO0    │
│  GPIO 27 ──────────── LoRa MOSI    │
│  GPIO 32 ──────────── DS18B20 Data │
│  GPIO 33 ──────────── Battery Volt │
│  GPIO 34 ──────────── Soil Moist   │
│  GPIO 35 ──────────── Light Sensor │
│                                     │
└─────────────────────────────────────┘
```

### LoRa Module Connections

```
LoRa SX1276/78        ESP32
─────────────────────────────
VCC (3.3V)      →     3.3V
GND             →     GND
MISO            →     GPIO 19
MOSI            →     GPIO 27
SCK             →     GPIO 5
NSS (CS)        →     GPIO 25
RST (RESET)     →     GPIO 14
DIO0 (IRQ)      →     GPIO 26
```

### DHT22 (Temperature & Humidity)

```
DHT22             ESP32
─────────────────────────────
VCC (3.3V)    →   3.3V
GND           →   GND
DATA          →   GPIO 4
```

**Note:** Add 10kΩ pull-up resistor between VCC and DATA

### Soil Moisture Sensor (Capacitive)

```
Soil Sensor       ESP32
─────────────────────────────
VCC (3.3V)    →   3.3V
GND           →   GND
AOUT          →   GPIO 34 (ADC1_CH6)
```

**Calibration:**
- In air: ~0 (dry)
- In water: ~4095 (wet)
- Update `map()` function in code

### DS18B20 Soil Temperature

```
DS18B20           ESP32
─────────────────────────────
VCC (3.3V)    →   3.3V
GND           →   GND
DATA          →   GPIO 32
```

**Note:** Add 4.7kΩ pull-up resistor between VCC and DATA

### Battery Voltage Monitoring

```
Battery (+) ──┬── 100kΩ ──┬── GPIO 33
              │           │
              └── 100kΩ ──┴── GND

Voltage Divider: 2:1 ratio
Max Input: 8.4V (2S LiPo)
ESP32 ADC: 0-3.3V
```

### Power Supply Circuit

```
Solar Panel (6V 6W)
      │
      ├─── TP4056 Charger ───┐
      │         │             │
      └─────────┴─── Battery (3.7V)
                │
                └─── Boost/Buck Converter (3.3V)
                         │
                         └─── ESP32 3.3V
```

**Important:**
- Use TP4056 module **with protection**
- Add **diode** to prevent backflow
- Connect **power switch** for manual shutoff

## ⚙️ Software Configuration

### 1. Install Required Libraries

Open Arduino IDE → Tools → Manage Libraries:

```
- LoRa by Sandeep Mistry (v0.8.0+)
- ArduinoJson by Benoit Blanchon (v6.21.0+)
- DHT sensor library by Adafruit (v1.4.0+)
- OneWire by Paul Stoffregen (v2.3.7+)
- DallasTemperature by Miles Burton (v3.9.0+)
```

### 2. Configure Node Settings

Open `AgriConnect_Field_Node.ino` and update:

```cpp
// Node identification
#define FIELD_ID 1          // Change for each field (1-99)
#define ZONE_ID 1           // Change for each zone (1-99)
#define NODE_ID "NODE-F1-Z1"

// LoRa settings (MUST match gateway!)
#define LORA_FREQUENCY 433E6      // Or 868E6 / 915E6
#define LORA_SYNC_WORD 0x34       // Must match gateway!

// Timing
#define READING_INTERVAL 60000     // 1 minute (ms)
#define SLEEP_DURATION 55000000    // 55 seconds (µs)
```

### 3. Board Settings (Arduino IDE)

```
Tools → Board: "ESP32 Dev Module"
Tools → Upload Speed: "115200"
Tools → CPU Frequency: "80MHz" (saves power)
Tools → Flash Frequency: "80MHz"
Tools → Flash Size: "4MB"
Tools → Partition Scheme: "Default 4MB"
Tools → Port: [Select your COM port]
```

### 4. Upload Firmware

1. Connect ESP32 via USB
2. Click **Upload** (Ctrl+U)
3. Wait for "Done uploading"
4. Open Serial Monitor (115200 baud)
5. Press **EN** button on ESP32 to restart

## 📡 Data Format

The field node sends JSON data via LoRa to the gateway:

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

**Field Descriptions:**

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| airTemperature | float | °C | Ambient air temperature |
| airHumidity | float | % | Relative humidity |
| soilMoisture | int | 0-1000 | Soil moisture (0=dry, 1000=wet) |
| soilTemperature | float | °C | Soil temperature |
| lightIntensity | int | lux | Light intensity |
| nitrogenPpm | int | ppm | Nitrogen content |
| phosphorusPpm | int | ppm | Phosphorus content |
| potassiumPpm | int | ppm | Potassium content |
| phValue | float | pH | Soil acidity (0-14) |
| ecValue | float | mS/cm | Electrical conductivity |
| batteryLevel | int | % | Battery charge percentage |
| pumpStatus | bool | - | Water pump on/off |
| waterLevel | int | % | Water tank level |

## 🔋 Power Consumption & Battery Life

### Deep Sleep Current Draw

| Component | Active | Deep Sleep |
|-----------|--------|------------|
| ESP32 | ~80mA | ~10µA |
| LoRa Module | ~120mA (TX) | ~1µA |
| DHT22 | ~1.5mA | 50µA |
| Sensors (total) | ~5mA | ~100µA |
| **Total** | **~200mA** | **~150µA** |

### Battery Life Calculation

**Scenario:** 1 reading per minute with 55s deep sleep

```
Active time per hour: 5 seconds × 60 = 300s = 0.083 hours
Sleep time per hour: 55 seconds × 60 = 3300s = 0.917 hours

Energy consumption per hour:
= (0.083h × 200mA) + (0.917h × 0.15mA)
= 16.6mAh + 0.14mAh
= 16.74mAh

Battery: 5000mAh LiPo
Battery life (no solar): 5000 / 16.74 = ~298 hours = 12.4 days

With solar (6W panel):
Average current generation: ~1000mA in sun
Daily sun hours: ~6 hours
Energy generated per day: 6h × 1000mA = 6000mAh
Energy consumed per day: 24h × 16.74mA = 401mAh

Net positive: 6000 - 401 = 5599mAh surplus
Battery life: UNLIMITED (with adequate sunlight)
```

## 🛠️ Calibration Guide

### Soil Moisture Sensor

1. **Dry calibration:**
   - Keep sensor in air for 1 minute
   - Note ADC value (should be ~0-500)

2. **Wet calibration:**
   - Submerge sensor in water
   - Note ADC value (should be ~2500-4095)

3. **Update code:**
   ```cpp
   int moistureValue = map(rawValue, DRY_VALUE, WET_VALUE, 0, 1000);
   ```

### Battery Voltage

1. Measure actual battery voltage with multimeter
2. Compare with ADC reading
3. Adjust `VBAT_MULTIPLIER` if needed:
   ```cpp
   #define VBAT_MULTIPLIER 2.0  // Adjust this value
   ```

### Light Sensor (LDR)

1. Measure light with lux meter
2. Compare with sensor reading
3. Update `map()` function:
   ```cpp
   int lux = map(rawValue, MIN_ADC, MAX_ADC, 0, 100000);
   ```

## 🧪 Testing Procedure

### 1. Bench Test (Before Deployment)

```cpp
// Disable deep sleep for testing
// Comment out line in loop():
// enterDeepSleep();
```

**Test Checklist:**
- [ ] All sensors report values
- [ ] LoRa transmission successful
- [ ] Battery percentage accurate
- [ ] LED blinks correctly
- [ ] Serial monitor shows data

### 2. Range Test

1. Power on field node
2. Move away from gateway while monitoring Serial
3. Note maximum distance with successful transmission
4. Typical range: 2-10km (line of sight)

### 3. Power Test

1. Disconnect solar panel
2. Run on battery only
3. Monitor battery voltage over 24 hours
4. Calculate actual power consumption

## 🚨 Troubleshooting

### Problem: LoRa initialization failed

**Causes:**
- Incorrect wiring
- Wrong pins defined
- Faulty LoRa module
- Power supply issues

**Solutions:**
1. Check all LoRa connections
2. Verify pin definitions match hardware
3. Test with simple LoRa example sketch
4. Ensure 3.3V supply is stable

### Problem: Sensor reads NaN or -127

**Causes:**
- Sensor disconnected
- Wrong pin number
- Insufficient power
- Sensor damaged

**Solutions:**
1. Check sensor wiring
2. Verify pin definitions
3. Test sensor with example code
4. Check 3.3V power rail

### Problem: Battery drains quickly

**Causes:**
- Deep sleep not working
- Sensors not powered down
- High transmission frequency
- Short circuit

**Solutions:**
1. Verify deep sleep code executes
2. Add sensor power switching
3. Increase sleep duration
4. Check for shorts with multimeter

### Problem: No LoRa transmission received at gateway

**Causes:**
- Sync word mismatch
- Frequency mismatch
- Out of range
- Antenna issues

**Solutions:**
1. Match `LORA_SYNC_WORD` with gateway
2. Match `LORA_FREQUENCY` with gateway
3. Move node closer to gateway
4. Check antenna connection

## 📦 Deployment Guide

### 1. Enclosure Assembly

1. Drill holes for:
   - Solar panel cable
   - Sensor cables
   - Antenna (SMA connector)
   - Power switch

2. Mount components:
   - ESP32 on standoffs
   - Battery with velcro
   - TP4056 charger module

3. Seal all entry points with:
   - Cable glands
   - Silicone sealant
   - Waterproof connectors

### 2. Field Installation

**Location Selection:**
- Representative of field conditions
- Clear line of sight to gateway
- Protected from direct weather
- Accessible for maintenance

**Mounting:**
- Pole mount 1-2m above ground
- Solar panel tilted 15-30° facing sun
- Sensors at appropriate depths:
  - Soil moisture: 10-15cm
  - Soil temperature: 10cm
  - Air sensors: 1.5m height

### 3. Registration

After deployment, add node to database:

```sql
INSERT INTO field_nodes (
    node_id, gateway_id, field_id, zone_id,
    latitude, longitude
) VALUES (
    'NODE-F1-Z1',
    'GW-CM-BUE-001',
    1, 1,
    4.1560, 9.2571
);
```

## 🔧 Maintenance Schedule

### Weekly
- [ ] Check battery voltage
- [ ] Verify data transmission
- [ ] Clean solar panel

### Monthly
- [ ] Inspect enclosure seals
- [ ] Check sensor connections
- [ ] Calibrate soil moisture sensor
- [ ] Clean sensors

### Seasonal
- [ ] Replace corroded sensors
- [ ] Update firmware if available
- [ ] Full system test
- [ ] Battery health check

## 📊 Performance Metrics

**Expected Performance:**

| Metric | Target | Acceptable |
|--------|--------|------------|
| Transmission success rate | >95% | >90% |
| Battery life (no solar) | >10 days | >7 days |
| LoRa range | >5 km | >2 km |
| Sensor accuracy | ±2% | ±5% |
| Uptime | >99% | >95% |

## 🔐 Security Considerations

1. **Physical Security:**
   - Lock enclosure
   - Anti-theft mounting
   - Hidden installation

2. **Data Security:**
   - Firmware encryption (future)
   - Secure bootloader (future)
   - Data validation at gateway

## 📚 Additional Resources

- **ESP32 Datasheet:** https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf
- **LoRa SX1276 Datasheet:** https://www.semtech.com/products/wireless-rf/lora-transceivers/sx1276
- **Arduino LoRa Library:** https://github.com/sandeepmistry/arduino-LoRa
- **DHT22 Sensor Guide:** https://learn.adafruit.com/dht

## 🆘 Support

For issues or questions:
1. Check troubleshooting section
2. Review serial monitor output
3. Test with minimal configuration
4. Contact: support@agriconnect.app

---

**Version:** 2.0.0
**Last Updated:** January 2025
**License:** MIT
**Hardware:** ESP32 + LoRa SX1276/78
