# MQTT Topic Structure - AgriConnect

**Version:** 1.0  
**Date:** [Today's date]  
**Last Updated:** [Today's date]

## Overview

AgriConnect uses MQTT for real-time communication between field gateways and the cloud platform. All topics follow a hierarchical structure under the `agriconnect/` namespace.

## Topic Hierarchy
```
agriconnect/
├── data/{gateway_id}/{field_id}/{zone_id}
├── commands/{gateway_id}
├── commands/{gateway_id}/{field_id}/{zone_id}
├── status/{gateway_id}
└── alerts/{farm_id}
```

## Topic Details

### 1. Sensor Data

**Topic Pattern:** `agriconnect/data/{gateway_id}/{field_id}/{zone_id}`

**Direction:** Gateway → Cloud  
**QoS:** 1 (at least once)  
**Retained:** No  
**Rate:** Every 60 seconds (default)

**Example Topic:**
```
agriconnect/data/GW-CM-BUE-001/1/0
```

**Payload:**
```json
{
  "gatewayId": "GW-CM-BUE-001",
  "fieldId": 1,
  "zoneId": 0,
  "timestamp": "2025-10-21T14:30:00Z",
  "location": {
    "lat": 4.1560,
    "lon": 9.2571
  },
  "sensors": {
    "airTemperature": 25.5,
    "airHumidity": 65.2,
    "soilMoisture": 450,
    "soilTemperature": 22.3,
    "phValue": 6.8,
    "ecValue": 2.5,
    "nitrogenPPM": 180,
    "phosphorusPPM": 45,
    "potassiumPPM": 220,
    "lightIntensity": 45000,
    "parValue": 850.5,
    "co2PPM": 420,
    "waterLevel": 1
  },
  "system": {
    "batteryLevel": 85,
    "pumpStatus": false,
    "rssi": -65
  }
}
```

---

### 2. Gateway Status

**Topic Pattern:** `agriconnect/status/{gateway_id}`

**Direction:** Gateway → Cloud  
**QoS:** 0 (at most once)  
**Retained:** Yes (last status always available)  
**Rate:** Every 5 minutes

**Example Topic:**
```
agriconnect/status/GW-CM-BUE-001
```

**Payload:**
```json
{
  "gatewayId": "GW-CM-BUE-001",
  "timestamp": "2025-10-21T14:30:00Z",
  "status": "online",
  "firmwareVersion": "2.0.0",
  "uptime": 86400,
  "activeNodes": 3,
  "freeHeap": 180000,
  "wifiRSSI": -45,
  "satelliteEnabled": false
}
```

---

### 3. Commands to Gateway

**Topic Pattern:** `agriconnect/commands/{gateway_id}`

**Direction:** Cloud → Gateway  
**QoS:** 1 (at least once)  
**Retained:** No

**Example Topic:**
```
agriconnect/commands/GW-CM-BUE-001
```

**Payload:**
```json
{
  "commandId": "cmd-123456",
  "timestamp": "2025-10-21T14:30:00Z",
  "action": "pump_control",
  "targetFieldId": 1,
  "targetZoneId": 0,
  "parameters": {
    "activate": true,
    "duration": 300
  }
}
```

**Supported Actions:**
- `pump_control` - Control irrigation pump
- `config_update` - Update node configuration
- `reboot` - Reboot gateway
- `sync_time` - Synchronize time

---

### 4. Commands to Field Node

**Topic Pattern:** `agriconnect/commands/{gateway_id}/{field_id}/{zone_id}`

**Direction:** Cloud → Gateway → Field Node  
**QoS:** 1 (at least once)  
**Retained:** No

**Example Topic:**
```
agriconnect/commands/GW-CM-BUE-001/1/0
```

**Payload:**
```json
{
  "commandId": "cmd-123457",
  "timestamp": "2025-10-21T14:30:00Z",
  "action": "pump_on",
  "duration": 300
}
```

---

### 5. System Alerts

**Topic Pattern:** `agriconnect/alerts/{farm_id}`

**Direction:** Cloud → Subscribers  
**QoS:** 1 (at least once)  
**Retained:** No

**Example Topic:**
```
agriconnect/alerts/FARM-CM-001
```

**Payload:**
```json
{
  "alertId": "alert-789012",
  "timestamp": "2025-10-21T14:30:00Z",
  "farmId": "FARM-CM-001",
  "gatewayId": "GW-CM-BUE-001",
  "fieldId": 1,
  "zoneId": 0,
  "alertType": "temperature_high",
  "severity": "warning",
  "message": "Air temperature exceeded 35°C threshold",
  "value": 36.2,
  "threshold": 35.0
}
```

**Alert Types:**
- `temperature_high` / `temperature_low`
- `moisture_high` / `moisture_low`
- `battery_low`
- `gateway_offline`
- `sensor_error`
- `disease_risk`

**Severity Levels:**
- `info` - Informational
- `warning` - Needs attention
- `critical` - Immediate action required

---

## QoS Configuration Summary

| Topic | QoS | Retained | Reason |
|-------|-----|----------|---------|
| `data/*` | 1 | No | Ensure delivery, temporary data |
| `status/*` | 0 | Yes | Heartbeat, last status important |
| `commands/*` | 1 | No | Must receive, one-time commands |
| `alerts/*` | 1 | No | Must receive, time-sensitive |

---

## Security

- **TLS Encryption:** All MQTT traffic uses TLS 1.2+
- **Authentication:** Username/password per gateway
- **Authorization:** Topic-level ACLs restrict publish/subscribe rights

**Gateway Permissions:**
- Can publish to: `agriconnect/data/{own_gateway_id}/*`
- Can publish to: `agriconnect/status/{own_gateway_id}`
- Can subscribe to: `agriconnect/commands/{own_gateway_id}/#`

---

## Message Size Limits

- **Maximum message size:** 256 KB
- **Typical sensor message:** ~500 bytes
- **Typical command message:** ~200 bytes

---

## Error Handling

**If message fails to publish:**
1. Gateway buffers message locally
2. Retry up to 3 times with exponential backoff
3. After 3 failures, store in local queue
4. Resend when connection restored

**Command acknowledgment:**
- Gateway sends acknowledgment to `agriconnect/ack/{gateway_id}`

---

## Testing Topics

**For development/testing:**
- Use prefix: `agriconnect-dev/` instead of `agriconnect/`
- Example: `agriconnect-dev/data/GW-TEST-001/1/0`

---

**Document Owner:** Dze-Kum Shalom Chow 
**Last Review:** 10/22/2025 
**Next Review:** Week 2