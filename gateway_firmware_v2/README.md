# Gateway Firmware V2 - Cloud Connected

## Overview
This firmware connects the AgriConnect gateway to HiveMQ Cloud via MQTT, forwarding sensor data from LoRa field nodes to the cloud database.

## Features
- WiFi connection with auto-reconnect
- Secure MQTT over TLS
- LoRa receiver for field nodes
- Message buffering during offline periods
- Status LEDs
- LCD display
- Command reception from cloud

## Hardware Requirements
- ESP32 DevKit
- LoRa SX1276 module
- LCD 16x2 I2C
- 3x LEDs (Red, Yellow, Green)

## Configuration
Update these in the code:
- WiFi credentials
- MQTT broker URL and password
- Gateway ID
- Farm ID

## Upload Instructions
1. Open in Arduino IDE
2. Select Board: ESP32 Dev Module
3. Select correct COM port
4. Click Upload

## Testing
After upload, open Serial Monitor (115200 baud) to see:
- WiFi connection status
- MQTT connection status
- LoRa packet reception
- Data publishing confirmations

## Status
- Written: ✓
- Compiled: (pending hardware)
- Tested: (pending hardware)
- Deployed: (pending hardware)