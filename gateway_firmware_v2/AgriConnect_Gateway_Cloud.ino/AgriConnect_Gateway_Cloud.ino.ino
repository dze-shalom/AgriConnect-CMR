/*
 * AgriConnect Gateway - Cloud Connected Version
 * Bridges LoRa field nodes to MQTT cloud
 * Version: 2.0.0
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <LoRa.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <LiquidCrystal_I2C.h>

// ==========================================
// CONFIGURATION - UPDATE THESE!
// ==========================================

// WiFi credentials
#define WIFI_SSID "NMD"
#define WIFI_PASSWORD "N@no2025"

// MQTT Broker (HiveMQ Cloud) - FROM credentials.md
#define MQTT_BROKER "fd863c20c0ba41ddb2018d1b424cbd30.s1.eu.hivemq.cloud"  // UPDATE!
#define MQTT_PORT 8883
#define MQTT_USERNAME "gateway_client"
#define MQTT_PASSWORD "Agriconnect12345"  // UPDATE!

// Gateway identification
#define GATEWAY_ID "GW-CM-BUE-001"
#define FARM_ID "FARM-CM-001"

// LoRa pin definitions
#define SCK 5
#define MISO 19
#define MOSI 27
#define NSS 25
#define RST 14
#define DIO0 26

// LoRa settings
#define LORA_FREQUENCY 433E6
#define LORA_SYNC_WORD 0x34

// LED pins
#define RED_LED_PIN 21
#define GREEN_LED_PIN 22
#define YELLOW_LED_PIN 12

// Timing
#define MQTT_RECONNECT_INTERVAL 5000
#define STATUS_PUBLISH_INTERVAL 300000  // 5 minutes
#define WATCHDOG_TIMEOUT 60000

// ==========================================
// GLOBAL OBJECTS
// ==========================================

WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Status tracking
bool loraAvailable = false;
bool mqttConnected = false;
bool wifiConnected = false;
unsigned long lastMqttAttempt = 0;
unsigned long lastStatusPublish = 0;
unsigned long lastLoRaReceive = 0;
uint32_t messageCount = 0;
uint32_t errorCount = 0;

// Message buffer for offline storage
#define BUFFER_SIZE 50
String messageBuffer[BUFFER_SIZE];
int bufferIndex = 0;

// ==========================================
// FUNCTION PROTOTYPES
// ==========================================

void initWiFi();
void initMQTT();
void initLoRa();
void initLCD();
void connectMQTT();
void handleLoRaData();
void publishSensorData(JsonDocument& doc);
void publishStatus();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void bufferMessage(String message);
void sendBufferedMessages();
void updateLEDs();
void updateLCD();

// ==========================================
// SETUP
// ==========================================

void setup() {
    Serial.begin(115200);
    delay(2000);
    
    Serial.println("\n=== AgriConnect Gateway - Cloud Connected ===");
    Serial.printf("Gateway ID: %s\n", GATEWAY_ID);
    Serial.printf("Farm ID: %s\n", FARM_ID);
    
    // Initialize LEDs
    pinMode(RED_LED_PIN, OUTPUT);
    pinMode(GREEN_LED_PIN, OUTPUT);
    pinMode(YELLOW_LED_PIN, OUTPUT);
    
    // Initialize LCD
    initLCD();
    
    // Initialize LoRa
    initLoRa();
    
    // Initialize WiFi
    initWiFi();
    
    // Initialize MQTT
    initMQTT();
    
    Serial.println("=== GATEWAY READY ===\n");
}

// ==========================================
// MAIN LOOP
// ==========================================

void loop() {
    unsigned long currentTime = millis();
    
    // Maintain MQTT connection
    if (!mqttClient.connected()) {
        if (currentTime - lastMqttAttempt >= MQTT_RECONNECT_INTERVAL) {
            connectMQTT();
            lastMqttAttempt = currentTime;
        }
    } else {
        mqttClient.loop();
        
        // Send buffered messages if we just reconnected
        if (bufferIndex > 0) {
            sendBufferedMessages();
        }
    }
    
    // Handle incoming LoRa data
    handleLoRaData();
    
    // Publish status periodically
    if (mqttConnected && (currentTime - lastStatusPublish >= STATUS_PUBLISH_INTERVAL)) {
        publishStatus();
        lastStatusPublish = currentTime;
    }
    
    // Update status indicators
    updateLEDs();
    
    // Watchdog check
    if (currentTime - lastLoRaReceive > WATCHDOG_TIMEOUT && lastLoRaReceive > 0) {
        Serial.println("WARNING: No LoRa data received in 60 seconds");
    }
    
    delay(10);
}

// ==========================================
// INITIALIZATION FUNCTIONS
// ==========================================

void initWiFi() {
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi connecting");
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("\n✓ WiFi connected!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        
        lcd.setCursor(0, 1);
        lcd.print("WiFi OK");
        delay(2000);
    } else {
        wifiConnected = false;
        Serial.println("\n✗ WiFi connection failed!");
        
        lcd.setCursor(0, 1);
        lcd.print("WiFi FAILED");
        delay(2000);
    }
}

void initMQTT() {
    espClient.setInsecure();  // Skip cert verification (use CA cert in production)
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(512);  // Increase buffer for larger messages
    
    Serial.println("MQTT client initialized");
}

void initLoRa() {
    Serial.println("Initializing LoRa...");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("LoRa Init...");
    
    SPI.begin(SCK, MISO, MOSI, NSS);
    LoRa.setPins(NSS, RST, DIO0);
    
    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("✗ LoRa initialization failed!");
        loraAvailable = false;
        
        lcd.setCursor(0, 1);
        lcd.print("LoRa FAILED!");
        digitalWrite(RED_LED_PIN, HIGH);
        delay(3000);
        return;
    }
    
    // Configure LoRa
    LoRa.setSpreadingFactor(10);
    LoRa.setSignalBandwidth(125E3);
    LoRa.setCodingRate4(8);
    LoRa.setPreambleLength(8);
    LoRa.setSyncWord(LORA_SYNC_WORD);
    LoRa.enableCrc();
    LoRa.setTxPower(20);
    
    loraAvailable = true;
    Serial.println("✓ LoRa initialized successfully");
    
    lcd.setCursor(0, 1);
    lcd.print("LoRa Ready");
    delay(2000);
}

void initLCD() {
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("AgriConnect");
    lcd.setCursor(0, 1);
    lcd.print("Gateway v2.0");
    delay(2000);
}

// ==========================================
// MQTT FUNCTIONS
// ==========================================

void connectMQTT() {
    if (!wifiConnected) {
        Serial.println("Cannot connect MQTT - WiFi not connected");
        return;
    }
    
    Serial.print("Connecting to MQTT broker: ");
    Serial.println(MQTT_BROKER);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("MQTT connecting");
    
    String clientId = "gateway_" + String(GATEWAY_ID);
    
    // Set Last Will and Testament
    String lwt_topic = "agriconnect/status/" + String(GATEWAY_ID);
    String lwt_payload = "{\"gatewayId\":\"" + String(GATEWAY_ID) + 
                        "\",\"status\":\"offline\"}";
    
    if (mqttClient.connect(clientId.c_str(), 
                           MQTT_USERNAME, 
                           MQTT_PASSWORD,
                           lwt_topic.c_str(),
                           1,  // QoS
                           true,  // Retain
                           lwt_payload.c_str())) {
        
        mqttConnected = true;
        Serial.println("✓ MQTT connected!");
        
        // Subscribe to command topics
        String commandTopic = "agriconnect/commands/" + String(GATEWAY_ID) + "/#";
        mqttClient.subscribe(commandTopic.c_str(), 1);
        Serial.println("✓ Subscribed to: " + commandTopic);
        
        // Publish online status
        publishStatus();
        
        lcd.setCursor(0, 1);
        lcd.print("MQTT OK");
        digitalWrite(GREEN_LED_PIN, HIGH);
        delay(2000);
        
    } else {
        mqttConnected = false;
        Serial.print("✗ MQTT connection failed, rc=");
        Serial.println(mqttClient.state());
        
        lcd.setCursor(0, 1);
        lcd.print("MQTT FAILED");
        digitalWrite(RED_LED_PIN, HIGH);
        delay(2000);
        digitalWrite(RED_LED_PIN, LOW);
    }
}

void publishSensorData(JsonDocument& doc) {
    // Build topic
    String topic = "agriconnect/data/" + String(GATEWAY_ID) + "/" + 
                   String(doc["fieldId"].as<int>()) + "/" + 
                   String(doc["zoneId"].as<int>());
    
    // Serialize JSON
    String payload;
    serializeJson(doc, payload);
    
    Serial.println("\n--- Publishing Sensor Data ---");
    Serial.println("Topic: " + topic);
    Serial.println("Payload: " + payload);
    
    // Publish or buffer
    if (mqttConnected && mqttClient.connected()) {
        if (mqttClient.publish(topic.c_str(), payload.c_str(), false)) {
            messageCount++;
            Serial.println("✓ Published successfully");
            digitalWrite(GREEN_LED_PIN, HIGH);
            delay(100);
            digitalWrite(GREEN_LED_PIN, LOW);
        } else {
            errorCount++;
            Serial.println("✗ Publish failed - buffering");
            bufferMessage(payload);
        }
    } else {
        Serial.println("⚠ MQTT not connected - buffering");
        bufferMessage(payload);
    }
}

void publishStatus() {
    StaticJsonDocument<256> doc;
    
    doc["gatewayId"] = GATEWAY_ID;
    doc["timestamp"] = millis();
    doc["status"] = "online";
    doc["firmwareVersion"] = "2.0.0";
    doc["uptime"] = millis() / 1000;
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["wifiRSSI"] = WiFi.RSSI();
    doc["messagesPublished"] = messageCount;
    doc["errors"] = errorCount;
    doc["bufferedMessages"] = bufferIndex;
    
    String topic = "agriconnect/status/" + String(GATEWAY_ID);
    String payload;
    serializeJson(doc, payload);
    
    if (mqttClient.publish(topic.c_str(), payload.c_str(), true)) {  // Retained
        Serial.println("✓ Status published");
    }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.print("\n--- Command Received ---\n");
    Serial.print("Topic: ");
    Serial.println(topic);
    Serial.print("Payload: ");
    
    String message;
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    Serial.println(message);
    
    // Parse command JSON
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
        Serial.println("✗ JSON parsing failed");
        return;
    }
    
    String action = doc["action"] | "";
    
    if (action == "pump_control") {
        bool activate = doc["parameters"]["activate"] | false;
        int targetField = doc["targetFieldId"] | 0;
        int targetZone = doc["targetZoneId"] | 0;
        
        Serial.printf("Command: %s pump for Field %d Zone %d\n", 
                     activate ? "ACTIVATE" : "DEACTIVATE", 
                     targetField, targetZone);
        
        // TODO: Forward to field node via LoRa
        // This is where you'd send LoRa command to field node
        
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.printf("CMD: Pump %s", activate ? "ON" : "OFF");
        lcd.setCursor(0, 1);
        lcd.printf("F%d Z%d", targetField, targetZone);
        
        digitalWrite(YELLOW_LED_PIN, HIGH);
        delay(1000);
        digitalWrite(YELLOW_LED_PIN, LOW);
    }
}

// ==========================================
// LORA FUNCTIONS
// ==========================================

void handleLoRaData() {
    int packetSize = LoRa.parsePacket();
    if (packetSize == 0) return;
    
    lastLoRaReceive = millis();
    
    // Read packet
    String receivedData = "";
    while (LoRa.available()) {
        receivedData += (char)LoRa.read();
    }
    
    int rssi = LoRa.packetRssi();
    
    Serial.println("\n--- LoRa Packet Received ---");
    Serial.println("Data: " + receivedData);
    Serial.printf("RSSI: %d dBm\n", rssi);
    
    // Parse JSON
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, receivedData);
    
    if (error) {
        Serial.println("✗ JSON parsing failed");
        errorCount++;
        return;
    }
    
    // Add gateway metadata
    doc["gatewayId"] = GATEWAY_ID;
    doc["timestamp"] = millis();  // Will be replaced with NTP time later
    doc["system"]["rssi"] = rssi;
    
    JsonObject location = doc.createNestedObject("location");
    location["lat"] = 4.1560;  // Gateway location (from config)
    location["lon"] = 9.2571;
    
    // Publish to cloud
    publishSensorData(doc);
    
    // Update LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.printf("F%d Z%d Recv", 
              doc["fieldId"].as<int>(), 
              doc["zoneId"].as<int>());
    lcd.setCursor(0, 1);
    lcd.printf("T:%.1fC H:%.0f%%", 
              doc["sensors"]["airTemperature"].as<float>(),
              doc["sensors"]["airHumidity"].as<float>());
}

// ==========================================
// BUFFER FUNCTIONS
// ==========================================

void bufferMessage(String message) {
    if (bufferIndex < BUFFER_SIZE) {
        messageBuffer[bufferIndex] = message;
        bufferIndex++;
        Serial.printf("Message buffered (%d/%d)\n", bufferIndex, BUFFER_SIZE);
    } else {
        Serial.println("✗ Buffer full - message dropped!");
        errorCount++;
    }
}

void sendBufferedMessages() {
    Serial.printf("Sending %d buffered messages...\n", bufferIndex);
    
    for (int i = 0; i < bufferIndex; i++) {
        // Extract fieldId and zoneId from buffered JSON
        StaticJsonDocument<512> doc;
        deserializeJson(doc, messageBuffer[i]);
        
        String topic = "agriconnect/data/" + String(GATEWAY_ID) + "/" + 
                       String(doc["fieldId"].as<int>()) + "/" + 
                       String(doc["zoneId"].as<int>());
        
        if (mqttClient.publish(topic.c_str(), messageBuffer[i].c_str())) {
            Serial.printf("✓ Buffered message %d sent\n", i + 1);
        } else {
            Serial.printf("✗ Failed to send buffered message %d\n", i + 1);
            break;  // Stop trying if one fails
        }
        
        delay(100);  // Small delay between messages
    }
    
    bufferIndex = 0;  // Clear buffer
    Serial.println("Buffer cleared");
}

// ==========================================
// STATUS INDICATORS
// ==========================================

void updateLEDs() {
    static unsigned long lastBlink = 0;
    static bool blinkState = false;
    
    if (millis() - lastBlink > 1000) {
        blinkState = !blinkState;
        lastBlink = millis();
        
        // Green: MQTT connected
        digitalWrite(GREEN_LED_PIN, mqttConnected ? HIGH : LOW);
        
        // Yellow: WiFi but no MQTT
        digitalWrite(YELLOW_LED_PIN, (wifiConnected && !mqttConnected) ? blinkState : LOW);
        
        // Red: No WiFi
        digitalWrite(RED_LED_PIN, !wifiConnected ? blinkState : LOW);
    }
}