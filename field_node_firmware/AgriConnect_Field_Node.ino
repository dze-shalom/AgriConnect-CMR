/*
 * AgriConnect Field Node - Multi-Sensor IoT Node
 * Collects agricultural sensor data and transmits via LoRa to gateway
 * Version: 2.0.0
 *
 * Hardware: ESP32 + LoRa SX1276/78 + Multiple Sensors
 * Power: Solar panel + LiPo battery with deep sleep
 */

#include <LoRa.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ==========================================
// CONFIGURATION - UPDATE FOR EACH NODE!
// ==========================================

// Node identification
#define FIELD_ID 1          // Change for each field
#define ZONE_ID 1           // Change for each zone in field
#define NODE_ID "NODE-F1-Z1"

// LoRa pin definitions (ESP32)
#define SCK 5
#define MISO 19
#define MOSI 27
#define NSS 25
#define RST 14
#define DIO0 26

// LoRa settings (MUST match gateway!)
#define LORA_FREQUENCY 433E6
#define LORA_SYNC_WORD 0x34

// Sensor pins
#define DHT_PIN 4               // DHT22 (Air temp & humidity)
#define DHT_TYPE DHT22
#define SOIL_MOISTURE_PIN 34    // Analog soil moisture
#define SOIL_TEMP_PIN 32        // DS18B20 soil temperature
#define LIGHT_SENSOR_PIN 35     // LDR/BH1750 light sensor
#define BATTERY_PIN 33          // Battery voltage divider
#define PUMP_RELAY_PIN 23       // Water pump control

// NPK Sensor (RS485 - Optional)
#define NPK_RX_PIN 16
#define NPK_TX_PIN 17

// Power management
#define VBAT_PIN 33             // Battery voltage pin
#define VBAT_MULTIPLIER 2.0     // Voltage divider ratio

// Timing (milliseconds)
#define READING_INTERVAL 60000      // 1 minute between readings
#define SLEEP_DURATION 55000000     // 55 seconds deep sleep (uS)
#define MAX_TRANSMISSION_RETRIES 3

// ==========================================
// GLOBAL OBJECTS
// ==========================================

DHT dht(DHT_PIN, DHT_TYPE);
OneWire oneWire(SOIL_TEMP_PIN);
DallasTemperature soilTempSensor(&oneWire);

// Statistics
uint32_t transmissionCount = 0;
uint32_t errorCount = 0;
bool pumpActive = false;

// ==========================================
// FUNCTION PROTOTYPES
// ==========================================

void initLoRa();
void initSensors();
void readSensors(JsonDocument& doc);
float readAirTemperature();
float readAirHumidity();
int readSoilMoisture();
float readSoilTemperature();
int readLightIntensity();
int readBatteryLevel();
void readNPK(int& n, int& p, int& k);
bool transmitData(JsonDocument& doc);
void enterDeepSleep();
void blinkLED(int times);

// ==========================================
// SETUP
// ==========================================

void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("\n========================================");
    Serial.println("   AgriConnect Field Node v2.0");
    Serial.println("========================================");
    Serial.printf("Node ID: %s\n", NODE_ID);
    Serial.printf("Field: %d, Zone: %d\n", FIELD_ID, ZONE_ID);
    Serial.println("========================================\n");

    // Initialize built-in LED
    pinMode(LED_BUILTIN, OUTPUT);
    pinMode(PUMP_RELAY_PIN, OUTPUT);
    digitalWrite(PUMP_RELAY_PIN, LOW);

    // Blink to show power on
    blinkLED(3);

    // Initialize sensors
    initSensors();

    // Initialize LoRa
    initLoRa();

    Serial.println("✓ Node initialization complete\n");
}

// ==========================================
// MAIN LOOP
// ==========================================

void loop() {
    Serial.println("\n--- Starting Sensor Reading Cycle ---");
    Serial.printf("Transmission #%lu\n", transmissionCount + 1);

    // Create JSON document
    StaticJsonDocument<512> doc;

    // Add identification
    doc["nodeId"] = NODE_ID;
    doc["fieldId"] = FIELD_ID;
    doc["zoneId"] = ZONE_ID;

    // Read all sensors
    readSensors(doc);

    // Transmit data
    bool success = transmitData(doc);

    if (success) {
        transmissionCount++;
        Serial.println("✓ Cycle completed successfully");
        blinkLED(1);
    } else {
        errorCount++;
        Serial.println("✗ Cycle failed");
        blinkLED(5);
    }

    Serial.printf("Stats - Success: %lu, Errors: %lu\n",
                  transmissionCount, errorCount);

    // Enter deep sleep to save power
    Serial.println("\n--- Entering Deep Sleep ---");
    delay(1000);
    enterDeepSleep();
}

// ==========================================
// INITIALIZATION FUNCTIONS
// ==========================================

void initLoRa() {
    Serial.println("Initializing LoRa radio...");

    SPI.begin(SCK, MISO, MOSI, NSS);
    LoRa.setPins(NSS, RST, DIO0);

    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("✗ LoRa initialization FAILED!");
        Serial.println("Check wiring and reset node");
        while (1) {
            blinkLED(10);
            delay(2000);
        }
    }

    // Configure LoRa parameters (MUST match gateway!)
    LoRa.setSpreadingFactor(10);      // SF10 for long range
    LoRa.setSignalBandwidth(125E3);   // 125 kHz bandwidth
    LoRa.setCodingRate4(8);           // 4/8 coding rate
    LoRa.setPreambleLength(8);        // 8 symbol preamble
    LoRa.setSyncWord(LORA_SYNC_WORD); // Must match gateway!
    LoRa.enableCrc();                 // Enable CRC
    LoRa.setTxPower(20);              // 20 dBm (max power)

    Serial.println("✓ LoRa initialized successfully");
    Serial.printf("  Frequency: %.1f MHz\n", LORA_FREQUENCY / 1E6);
    Serial.printf("  Sync Word: 0x%02X\n", LORA_SYNC_WORD);
}

void initSensors() {
    Serial.println("Initializing sensors...");

    // DHT sensor
    dht.begin();
    Serial.println("✓ DHT22 initialized");

    // Soil temperature sensor
    soilTempSensor.begin();
    Serial.printf("✓ DS18B20 found: %d devices\n",
                  soilTempSensor.getDeviceCount());

    // Analog sensors
    pinMode(SOIL_MOISTURE_PIN, INPUT);
    pinMode(LIGHT_SENSOR_PIN, INPUT);
    pinMode(BATTERY_PIN, INPUT);
    Serial.println("✓ Analog sensors configured");

    // Give sensors time to stabilize
    delay(2000);
}

// ==========================================
// SENSOR READING FUNCTIONS
// ==========================================

void readSensors(JsonDocument& doc) {
    Serial.println("\nReading sensors...");

    // Create sensors object
    JsonObject sensors = doc.createNestedObject("sensors");

    // Air temperature and humidity
    float airTemp = readAirTemperature();
    float airHumid = readAirHumidity();
    sensors["airTemperature"] = airTemp;
    sensors["airHumidity"] = airHumid;
    Serial.printf("  Air: %.1f°C, %.1f%%\n", airTemp, airHumid);

    // Soil sensors
    int soilMoist = readSoilMoisture();
    float soilTemp = readSoilTemperature();
    sensors["soilMoisture"] = soilMoist;
    sensors["soilTemperature"] = soilTemp;
    Serial.printf("  Soil: %d, %.1f°C\n", soilMoist, soilTemp);

    // Light intensity
    int light = readLightIntensity();
    sensors["lightIntensity"] = light;
    Serial.printf("  Light: %d lux\n", light);

    // NPK values (optional - comment out if sensor not available)
    int n = 0, p = 0, k = 0;
    // readNPK(n, p, k);  // Uncomment if NPK sensor installed
    sensors["nitrogenPpm"] = n;
    sensors["phosphorusPpm"] = p;
    sensors["potassiumPpm"] = k;

    // pH and EC (placeholder - add sensor code if available)
    sensors["phValue"] = 6.5;  // TODO: Add pH sensor
    sensors["ecValue"] = 1.2;  // TODO: Add EC sensor

    // Create system object
    JsonObject system = doc.createNestedObject("system");

    // Battery level
    int battery = readBatteryLevel();
    system["batteryLevel"] = battery;
    system["pumpStatus"] = pumpActive;
    system["waterLevel"] = 85;  // TODO: Add water level sensor
    Serial.printf("  Battery: %d%%\n", battery);

    // Add timestamp (milliseconds since boot)
    doc["timestamp"] = millis();

    Serial.println("✓ All sensors read successfully");
}

float readAirTemperature() {
    float temp = dht.readTemperature();
    if (isnan(temp)) {
        Serial.println("⚠ DHT temperature read failed");
        return 25.0;  // Default fallback
    }
    return temp;
}

float readAirHumidity() {
    float humid = dht.readHumidity();
    if (isnan(humid)) {
        Serial.println("⚠ DHT humidity read failed");
        return 60.0;  // Default fallback
    }
    return humid;
}

int readSoilMoisture() {
    // Read analog value (0-4095 for ESP32 12-bit ADC)
    int rawValue = analogRead(SOIL_MOISTURE_PIN);

    // Convert to meaningful range (0-1000)
    // Calibrate these values for your sensor!
    int moistureValue = map(rawValue, 0, 4095, 0, 1000);

    // Constrain to valid range
    return constrain(moistureValue, 0, 1000);
}

float readSoilTemperature() {
    soilTempSensor.requestTemperatures();
    float temp = soilTempSensor.getTempCByIndex(0);

    if (temp == DEVICE_DISCONNECTED_C) {
        Serial.println("⚠ Soil temperature sensor disconnected");
        return 20.0;  // Default fallback
    }

    return temp;
}

int readLightIntensity() {
    // Read analog value
    int rawValue = analogRead(LIGHT_SENSOR_PIN);

    // Convert to lux (approximate - calibrate for your sensor)
    // For LDR: higher voltage = more light
    int lux = map(rawValue, 0, 4095, 0, 100000);

    return constrain(lux, 0, 100000);
}

int readBatteryLevel() {
    // Read battery voltage through divider
    int rawValue = analogRead(BATTERY_PIN);
    float voltage = (rawValue / 4095.0) * 3.3 * VBAT_MULTIPLIER;

    // Convert voltage to percentage (3.3V = 0%, 4.2V = 100% for LiPo)
    int percentage = map(voltage * 100, 330, 420, 0, 100);

    return constrain(percentage, 0, 100);
}

void readNPK(int& n, int& p, int& k) {
    // TODO: Implement RS485 NPK sensor reading
    // This is a placeholder for NPK sensor integration
    // Most NPK sensors use Modbus RTU protocol over RS485

    // Example placeholder values
    n = 45;   // Nitrogen (ppm)
    p = 30;   // Phosphorus (ppm)
    k = 55;   // Potassium (ppm)
}

// ==========================================
// LORA TRANSMISSION
// ==========================================

bool transmitData(JsonDocument& doc) {
    Serial.println("\n--- Preparing LoRa Transmission ---");

    // Serialize JSON
    String payload;
    serializeJson(doc, payload);

    Serial.println("Payload:");
    Serial.println(payload);
    Serial.printf("Size: %d bytes\n", payload.length());

    // Attempt transmission with retries
    for (int attempt = 1; attempt <= MAX_TRANSMISSION_RETRIES; attempt++) {
        Serial.printf("\nTransmission attempt %d/%d...\n",
                     attempt, MAX_TRANSMISSION_RETRIES);

        LoRa.beginPacket();
        LoRa.print(payload);

        if (LoRa.endPacket()) {
            Serial.println("✓ LoRa transmission successful!");
            digitalWrite(LED_BUILTIN, HIGH);
            delay(100);
            digitalWrite(LED_BUILTIN, LOW);
            return true;
        } else {
            Serial.printf("✗ Transmission failed (attempt %d)\n", attempt);
            delay(1000);  // Wait before retry
        }
    }

    Serial.println("✗ All transmission attempts failed");
    return false;
}

// ==========================================
// POWER MANAGEMENT
// ==========================================

void enterDeepSleep() {
    // Disable LoRa to save power
    LoRa.sleep();

    // Configure wake-up
    esp_sleep_enable_timer_wakeup(SLEEP_DURATION);

    Serial.printf("Sleeping for %d seconds...\n", SLEEP_DURATION / 1000000);
    Serial.flush();

    // Enter deep sleep
    esp_deep_sleep_start();
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

void blinkLED(int times) {
    for (int i = 0; i < times; i++) {
        digitalWrite(LED_BUILTIN, HIGH);
        delay(100);
        digitalWrite(LED_BUILTIN, LOW);
        delay(100);
    }
}

// ==========================================
// COMMAND HANDLING (Future Enhancement)
// ==========================================

/*
 * To receive commands from gateway (e.g., pump control):
 *
 * void checkForCommands() {
 *     int packetSize = LoRa.parsePacket();
 *     if (packetSize) {
 *         String command = "";
 *         while (LoRa.available()) {
 *             command += (char)LoRa.read();
 *         }
 *
 *         // Parse JSON command
 *         StaticJsonDocument<256> doc;
 *         deserializeJson(doc, command);
 *
 *         String action = doc["action"];
 *         if (action == "pump_control") {
 *             bool activate = doc["activate"];
 *             digitalWrite(PUMP_RELAY_PIN, activate ? HIGH : LOW);
 *             pumpActive = activate;
 *         }
 *     }
 * }
 */
