# AgriConnect System Architecture

**Version:** 1.0  
**Date:** 2025-10-21  
**Phase:** 1

## System Overview

AgriConnect is a distributed IoT system with edge computing at the gateway level and cloud-based data processing and storage.

## Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                      CLOUD LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   HiveMQ     │  │  Supabase    │  │   Vercel     │     │
│  │ MQTT Broker  │→│  PostgreSQL  │←│  Dashboard   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           ↕ MQTT/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      GATEWAY LAYER                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ESP32 Gateway                                      │   │
│  │  • LoRa Receiver                                    │   │
│  │  • MQTT Client                                      │   │
│  │  • Local Storage (Backup)                           │   │
│  │  • Local Web Server (Fallback)                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕ LoRa 433MHz
┌─────────────────────────────────────────────────────────────┐
│                      FIELD LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Field Node│  │Field Node│  │Field Node│  │ ESP32-CAM│   │
│  │    1     │  │    2     │  │    3     │  │  (Future)│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Field Nodes (ESP32 + LoRa)
**Technology:** ESP32-DevKit, LoRa SX1276, Multiple Sensors  
**Power:** Battery + Solar  
**Communication:** LoRa 433MHz to Gateway

**Sensors Supported:**
- DHT22 (Air temperature & humidity)
- Capacitive soil moisture
- DS18B20 (Soil temperature)
- Gravity pH sensor
- Gravity EC sensor
- RS485 NPK sensor
- TSL2591 (Light/PAR)
- Water level float switch

**Data Flow:**
1. Read sensors every 60 seconds
2. Package data as JSON
3. Transmit via LoRa to gateway
4. Enter light sleep for power saving

**Phase 1 Changes:** None (already working)

---

### 2. Gateway (ESP32 + LoRa + WiFi)
**Technology:** ESP32-DevKit, LoRa SX1276, WiFi  
**Power:** AC powered  
**Communication:** 
- Downstream: LoRa 433MHz (receive from nodes)
- Upstream: MQTT over WiFi (send to cloud)

**Responsibilities:**
- Receive LoRa packets from field nodes
- Parse and validate sensor data
- Forward to cloud via MQTT
- Store locally as backup (LittleFS)
- Serve local web dashboard (fallback)
- Receive commands from cloud

**Phase 1 Changes:**
- Add MQTT client library
- Implement cloud bridge
- Add retry logic for failed transmissions
- Buffer messages during internet outage

---

### 3. Cloud Infrastructure

#### HiveMQ Cloud (MQTT Broker)
**Purpose:** Real-time message broker  
**Protocol:** MQTT 3.1.1 over TLS  
**Port:** 8883 (encrypted)

**Topic Structure:**
```
data/{gateway_id}              → Sensor data from gateway
commands/{gateway_id}          → Commands to gateway
status/{gateway_id}            → Gateway status/heartbeat
alerts/{farm_id}               → System alerts
```
```

**Message Format:** JSON  
**QoS Level:** 1 (at least once delivery)

#### Supabase (Database & Auth)
**Purpose:** Data storage and user authentication  
**Database:** PostgreSQL 14  
**Features Used:**
- Postgres database
- Row Level Security (RLS)
- Real-time subscriptions
- Authentication (JWT)
- Auto-generated REST API

**Tables:**
- `sensor_readings` - Time-series sensor data
- `gateways` - Gateway registration
- `field_nodes` - Node configuration
- `users` - User accounts
- `farms` - Farm metadata
- `alerts` - System alerts

#### Vercel (Dashboard Hosting)
**Purpose:** Host web dashboard  
**Features:**
- Automatic HTTPS
- Global CDN
- Serverless functions (future)
- Git-based deployment

---

### 4. Web Dashboard
**Framework:** HTML/CSS/JS (Phase 1) → React (Phase 2)  
**Hosting:** Vercel  
**Authentication:** Supabase Auth

**Features (Phase 1):**
- User login/logout
- List of gateways and nodes
- Real-time sensor data display
- CSV data export
- Basic charts (future)

**Features (Phase 2+):**
- World map with markers
- Advanced analytics
- Disease predictions
- Camera image viewer
- Mobile responsive

---

## Data Flow (Detailed)

### Normal Operation
```
1. Field Node collects sensor data
   ↓
2. Transmits via LoRa to Gateway
   ↓
3. Gateway receives and parses
   ↓
4. Gateway publishes to MQTT (HiveMQ)
   ↓ (simultaneously)
   ├→ 5a. Cloud stores in Supabase
   └→ 5b. Gateway stores locally (backup)
   ↓
6. Dashboard subscribes to real-time updates
   ↓
7. User sees data within seconds
```

### Internet Outage Scenario
```
1. Field Node sends data (continues normally)
   ↓
2. Gateway receives data
   ↓
3. MQTT publish fails (no internet)
   ↓
4. Gateway stores in local buffer
   ↓
5. Gateway continues collecting data
   ↓
6. Internet restored
   ↓
7. Gateway replays buffered messages
   ↓
8. Cloud syncs all missed data
```

### Command Flow (Remote Control)
```
1. User clicks "Activate Pump" in dashboard
   ↓
2. Dashboard sends API request to Supabase
   ↓
3. Supabase triggers serverless function
   ↓
4. Function publishes MQTT command to HiveMQ
   ↓
5. Gateway receives command
   ↓
6. Gateway validates (field_id, zone_id)
   ↓
7. Gateway forwards via LoRa to field node
   ↓
8. Field node activates relay
   ↓
9. Acknowledgment flows back to user
```

---

## Security

### Network Security
- ✅ MQTT over TLS 1.2 (encrypted)
- ✅ HTTPS only for dashboard
- ✅ LoRa messages have sync word (0x34)

### Authentication
- ✅ JWT tokens (Supabase)
- ✅ MQTT username/password
- ✅ Row Level Security (RLS) in database

### Data Privacy
- ✅ Multi-tenancy (users see only their data)
- ✅ No sensitive data in LoRa messages
- ✅ Credentials never in code (environment variables)

---

## Scalability

### Current Capacity (Free Tiers)
- Gateways: 50 (HiveMQ 100 connections ÷ 2)
- Field Nodes: 400 (8 nodes × 50 gateways)
- Messages: ~10,000/day before paid tier
- Database: 500MB (thousands of readings)

### Scaling Path
**10 gateways** → All free tiers sufficient  
**50 gateways** → Need HiveMQ paid ($99/mo)  
**100 gateways** → Need Supabase Pro ($25/mo)  
**500 gateways** → Dedicated infrastructure

---

## Monitoring & Alerts

### System Health Monitoring
- Gateway online/offline status
- MQTT connection status
- Database storage usage
- API response times

### Alert Triggers
- Gateway offline > 5 minutes
- Sensor reading out of range
- Battery low (<20%)
- Database 80% full

---

## Disaster Recovery

### Backup Strategy
1. **Local backup:** Gateway stores 7 days on LittleFS
2. **Cloud backup:** Supabase daily automatic backups
3. **Export:** Manual CSV exports available

### Recovery Procedures
- **Gateway failure:** Replace hardware, restore config from cloud
- **Internet outage:** System continues locally, syncs when restored
- **Cloud outage:** Local dashboard remains accessible
- **Database corruption:** Restore from Supabase backup

---

## Technology Stack Summary

| Layer | Component | Technology | Cost |
|-------|-----------|------------|------|
| Field | Nodes | ESP32 + LoRa | Hardware only |
| Gateway | Bridge | ESP32 + LoRa + WiFi | Hardware only |
| Transport | MQTT | HiveMQ Cloud | Free (100 conn) |
| Storage | Database | Supabase PostgreSQL | Free (500MB) |
| Auth | Users | Supabase Auth | Free (50K users) |
| Frontend | Dashboard | HTML/JS on Vercel | Free |
| Future | ML | TensorFlow Lite | TBD |

---

## Future Enhancements

### Phase 2
- Mapbox integration for map view
- ML disease prediction models
- ESP32-CAM integration
- Advanced analytics

### Phase 3
- Mobile app (React Native)
- SMS alerts via Twilio
- Voice notifications
- Multi-crop support

---

**Document Owner:** DZE-KUM SHALOM CHOW  
**Last Review:** 2025-10-21  
**Next Review:** [3 weeks from today]
