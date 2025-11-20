#!/usr/bin/env python3
"""
AgriConnect Project Structure Generator
Creates the complete folder structure and template files for Phase 1
Run this once in your desired project directory
"""

import os
from datetime import datetime

# Project configuration
PROJECT_NAME = "AgriConnect"
AUTHOR_NAME = "DZE-KUM SHALOM CHOW"  # Change this
COMPANY_NAME = "AgriConnect "  # Change this

def create_directory(path):
    """Create directory if it doesn't exist"""
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"✓ Created: {path}")
    else:
        print(f"⚠ Already exists: {path}")

def create_file(path, content):
    """Create file with content if it doesn't exist"""
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Created: {path}")
    else:
        print(f"⚠ Already exists: {path}")

def main():
    """Main function to generate project structure"""
    
    print(f"\n{'='*60}")
    print(f"  {PROJECT_NAME} Project Structure Generator")
    print(f"{'='*60}\n")
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    # ============================================
    # DIRECTORY STRUCTURE
    # ============================================
    
    directories = [
        # Hardware
        "hardware/field_node",
        "hardware/gateway",
        "hardware/docs/wiring_diagrams",
        
        # Cloud Backend
        "cloud_backend/database/migrations",
        "cloud_backend/mqtt",
        "cloud_backend/docs",
        
        # Dashboard
        "dashboard/public",
        "dashboard/src/components",
        "dashboard/src/pages",
        "dashboard/src/services",
        
        # Gateway Firmware V2
        "gateway_firmware_v2",
        
        # Testing
        "testing/test_plans",
        "testing/test_data",
        "testing/results",
        
        # Documentation
        "docs",
        
        # Scripts
        "scripts",
    ]
    
    print("Creating directories...")
    for directory in directories:
        create_directory(directory)
    
    print("\n" + "="*60 + "\n")
    
    # ============================================
    # ROOT FILES
    # ============================================
    
    print("Creating root files...")
    
    # Main README
    readme_content = f"""# {PROJECT_NAME} - Cloud-Connected Precision Agriculture Platform

**Version:** 1.0.0  
**Status:** Phase 1 - In Development  
**Last Updated:** {today}

## Overview
{PROJECT_NAME} is a cloud-connected precision agriculture monitoring system using LoRa wireless sensor networks and ESP32 gateways for remote farm monitoring and control.

## System Components

### Hardware
- **Field Nodes**: ESP32 + LoRa with multiple sensors (DHT22, soil moisture, pH, EC, NPK, etc.)
- **Gateway**: ESP32 + LoRa + WiFi bridge to cloud
- **Camera Nodes**: ESP32-CAM for disease detection (Future)

### Cloud Infrastructure
- **MQTT Broker**: HiveMQ Cloud
- **Database**: Supabase (PostgreSQL)
- **Dashboard**: Web-based interface
- **Hosting**: Vercel

## Project Structure
```
AgriConnect/
├── hardware/              # Embedded firmware
├── cloud_backend/         # Cloud infrastructure
├── dashboard/             # Web dashboard
├── gateway_firmware_v2/   # Updated gateway code
├── testing/              # Test plans and results
├── docs/                 # Project documentation
└── scripts/              # Utility scripts
```

## Quick Start

### For Hardware Development
1. Navigate to `hardware/field_node/` or `hardware/gateway/`
2. Open `.ino` files in Arduino IDE
3. See individual README files for setup

### For Cloud Development
1. Set up accounts (see `docs/account_setup.md`)
2. Configure database (see `cloud_backend/database/`)
3. Deploy dashboard (see `dashboard/README.md`)

## Documentation
- [Project Plan](docs/project_plan.md)
- [Architecture](cloud_backend/docs/architecture.md)
- [Account Setup Guide](docs/account_setup.md)
- [Testing Plan](testing/test_plans/phase1_test_plan.md)

## Current Phase: Phase 1
**Goal**: Cloud migration with remote access and permanent storage

**Status**:
- [ ] Cloud accounts setup
- [ ] Database schema designed
- [ ] Gateway firmware updated
- [ ] Dashboard deployed
- [ ] Testing completed

## License
Proprietary - {COMPANY_NAME}

## Contact
**Author**: {AUTHOR_NAME}  
**Company**: {COMPANY_NAME}  
**Date**: {today}
"""
    create_file("README.md", readme_content)
    
    # .gitignore
    gitignore_content = """# AgriConnect .gitignore

# Credentials and secrets
credentials.md
.env
.env.local
*.key
*.pem
config.ini

# Arduino
*.hex
*.elf
*.bin
*.map

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Testing
testing/results/*.log
testing/results/*.csv

# Build outputs
build/
dist/
*.egg-info/

# Logs
*.log
logs/

# Temporary files
tmp/
temp/
*.tmp

# OS
Thumbs.db
.DS_Store
"""
    create_file(".gitignore", gitignore_content)
    
    # Credentials template
    credentials_template = f"""# {PROJECT_NAME} Cloud Credentials
**DO NOT COMMIT THIS FILE TO GIT**
**KEEP THIS FILE SECURE**

Created: {today}
Last Updated: {today}

## Supabase
- Project Name: agriconnect-production
- Project URL: https://[your-id].supabase.co
- Anon Key: [paste here]
- Service Role Key: [paste here]
- Database Password: [paste here]

## HiveMQ Cloud
- Cluster Name: agriconnect-mqtt
- Cluster URL: [cluster-id].s2.eu.hivemq.cloud
- Port: 8883
- Username: gateway_client
- Password: [paste here]

## Vercel
- Team: [your-team-name]
- Connected to GitHub: [ ] Yes [ ] No

## Mapbox (Optional - Phase 2)
- Public Token: [paste here]

## GitHub
- Repository: https://github.com/[username]/agriconnect-platform
- Access: [ ] Public [ ] Private

## Notes
- All passwords should be strong (16+ characters)
- Store backup in password manager: [which one?]
- Share credentials only via secure channel (never email)
- Rotate passwords every 6 months

## Emergency Contacts
- Account Owner: {AUTHOR_NAME}
- Email: [your-email]
- Phone: [your-phone]
"""
    create_file("credentials.md", credentials_template)
    
    # .env.example
    env_example = """# Environment Variables Template
# Copy this to .env and fill in real values

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# HiveMQ MQTT Broker
MQTT_BROKER=your-cluster.s2.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=gateway_client
MQTT_PASSWORD=your_password_here

# Mapbox (Optional)
MAPBOX_TOKEN=your_token_here

# Application Settings
NODE_ENV=development
PORT=3000
"""
    create_file(".env.example", env_example)
    
    # ============================================
    # DOCUMENTATION FILES
    # ============================================
    
    print("\nCreating documentation files...")
    
    # Account Setup Guide
    account_setup = f"""# Cloud Account Setup Guide

**Date:** {today}  
**Phase:** 1  
**Time Required:** ~1 hour

## Overview
This guide walks through setting up all free cloud services needed for {PROJECT_NAME}.

## Prerequisites
- Valid email address (professional recommended)
- Strong password manager
- GitHub account
- Stable internet connection

## Account Setup Checklist

### 1. Supabase (Database & Auth)

**Purpose:** PostgreSQL database + authentication  
**Free Tier:** 500MB database, 50MB file storage, 2GB bandwidth

**Steps:**
1. Go to: https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended)
4. Create organization: "{COMPANY_NAME}"
5. Create project:
   - Name: `agriconnect-production`
   - Password: [Generate strong password]
   - Region: `Europe (Frankfurt)` or nearest
6. Wait 2-3 minutes for provisioning
7. Save credentials:
   - Project URL
   - Anon key
   - Service role key
8. ✅ Done - verify you can access dashboard

**Verification:**
- [ ] Can log into Supabase dashboard
- [ ] Project shows as "Active"
- [ ] Credentials saved in credentials.md

---

### 2. HiveMQ Cloud (MQTT Broker)

**Purpose:** Cloud MQTT broker for real-time messaging  
**Free Tier:** 100 concurrent connections

**Steps:**
1. Go to: https://console.hivemq.cloud
2. Sign up with business email
3. Verify email
4. Create cluster:
   - Name: `agriconnect-mqtt`
   - Plan: `Free`
   - Region: `EU-Central (Frankfurt)`
5. Wait 2-3 minutes
6. Access Management → Create credentials:
   - Username: `gateway_client`
   - Password: [Generate strong password]
   - Permissions: All topics (#)
7. Save credentials:
   - Cluster URL
   - Port (8883)
   - Username
   - Password
8. ✅ Done

**Verification:**
- [ ] Cluster status is "Running"
- [ ] Can see cluster URL
- [ ] Credentials created and saved

---

### 3. Vercel (Dashboard Hosting)

**Purpose:** Host web dashboard  
**Free Tier:** Unlimited personal projects

**Steps:**
1. Go to: https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel
4. Skip project import for now
5. ✅ Done - account ready for deployment

**Verification:**
- [ ] Account created
- [ ] GitHub connected
- [ ] Ready to deploy projects

---

### 4. GitHub (Version Control)

**Purpose:** Code repository and collaboration

**Steps:**
1. Go to: https://github.com
2. Sign up if needed
3. Create new repository:
   - Name: `agriconnect-platform`
   - Visibility: `Private`
   - Initialize with README: ✓
   - .gitignore: `Arduino`
4. Clone locally:
```bash
   git clone https://github.com/[username]/agriconnect-platform.git
```
5. ✅ Done

**Verification:**
- [ ] Repository created
- [ ] Cloned to local computer
- [ ] Can commit and push

---

### 5. Mapbox (Maps - Optional for Phase 1)

**Purpose:** Interactive maps  
**Free Tier:** 50,000 map views/month

**Steps:**
1. Go to: https://mapbox.com
2. Sign up with email
3. Verify email
4. Go to Account → Access Tokens
5. Copy default public token
6. Save token
7. ✅ Done (will use in Phase 2)

---

## Post-Setup Tasks

**Immediate:**
1. Fill in `credentials.md` with all saved information
2. Store backup in password manager
3. Test login to each service
4. Take screenshot of each dashboard

**Within 24 hours:**
5. Enable 2FA on all accounts (security)
6. Add backup email addresses
7. Review free tier limits
8. Set up usage alerts

## Troubleshooting

**Issue: Supabase project won't create**
- Solution: Check internet connection, try different browser, wait 5 minutes

**Issue: HiveMQ cluster stuck "Creating"**
- Solution: Wait up to 5 minutes, refresh page, contact support if >10 minutes

**Issue: Vercel won't connect to GitHub**
- Solution: Revoke and re-authorize in GitHub settings

## Next Steps
After all accounts are set up:
1. ✅ Review credentials.md - all fields filled
2. → Proceed to database schema design
3. → Configure MQTT topics
4. → Update gateway firmware

## Support
- Supabase: https://supabase.com/docs
- HiveMQ: https://console.hivemq.cloud/support
- Vercel: https://vercel.com/docs
"""
    create_file("docs/account_setup.md", account_setup)
    
    # Project Plan
    project_plan = f"""# {PROJECT_NAME} Cloud Migration - Phase 1

**Version:** 1.0  
**Date:** {today}  
**Status:** Planning  
**Author:** {AUTHOR_NAME}

## Executive Summary
Migrate {PROJECT_NAME} from local ESP32-based system to cloud-enabled platform with remote access, permanent data storage, and multi-user support.

## Objectives

### Primary Goals
1. Enable remote access from anywhere in the world
2. Store sensor data permanently (no 7-day limit)
3. Support multiple users with authentication
4. Maintain system during internet outages (local backup)

### Success Metrics
- Gateway → Cloud latency < 5 seconds
- 99% data delivery success rate
- Dashboard loads in < 3 seconds
- System runs 7 days without intervention

## Scope

### Phase 1 - In Scope
- ✓ Cloud MQTT connection from gateway
- ✓ PostgreSQL database for sensor data
- ✓ User authentication system
- ✓ Basic web dashboard (list view)
- ✓ Real-time data display
- ✓ CSV export functionality
- ✓ Local backup system (gateway)

### Phase 1 - Out of Scope
- ✗ World map visualization (Phase 2)
- ✗ ML disease prediction (Phase 2)
- ✗ Camera integration (Phase 2)
- ✗ Mobile app (Phase 3)
- ✗ Advanced analytics (Phase 2)
- ✗ SMS/WhatsApp alerts (Phase 2)

## Timeline

### Week 1: Foundation (5 days)
**Goal:** All cloud infrastructure ready

- Day 1: Account setup, credential management
- Day 2-3: Database schema design and creation
- Day 4: MQTT topic structure definition
- Day 5: Gateway code structure planning

**Deliverable:** All accounts active, database schema documented

### Week 2: Implementation (5 days)
**Goal:** Data flowing from gateway to cloud

- Day 1-2: Gateway firmware modifications
- Day 3: MQTT connection testing
- Day 4: Database storage verification
- Day 5: Authentication system setup

**Deliverable:** Gateway successfully sending data to cloud

### Week 3: Dashboard (5 days)
**Goal:** Functional web dashboard

- Day 1-2: Dashboard framework setup
- Day 3: Data display implementation
- Day 4: CSV export feature
- Day 5: UI polish and testing

**Deliverable:** Working dashboard accessible remotely

### Week 4: Testing & Documentation (5 days)
**Goal:** Production-ready system

- Day 1-2: Integration testing
- Day 3: Load testing
- Day 4: Documentation completion
- Day 5: User acceptance testing

**Deliverable:** System ready for pilot customers

## Resources

### Team
- **Hardware/Firmware:** {AUTHOR_NAME} (Lead)
- **Backend Developer:** TBD (hire if needed)
- **Frontend Developer:** TBD (hire if needed)
- **Advisor/Consultant:** Available

### Tools & Services
- **Hardware:** Existing field nodes and gateway
- **Cloud Services:** Free tiers (Supabase, HiveMQ, Vercel)
- **Development:** Arduino IDE, VS Code, Git
- **Testing:** Physical hardware, test data generator

### Budget
- Phase 1: $0 (all free tier services)
- Phase 2 estimate: $50-100/month
- Phase 3 estimate: $200-500/month

## Technical Architecture

### Current System
```
Field Node → LoRa → Gateway → Local WiFi → ESP32 Web Server
                        ↓
                   LittleFS Storage (7 days)
```

### Target System (Phase 1)
```
Field Node → LoRa → Gateway → MQTT → HiveMQ Cloud
                        ↓              ↓
                Local Backup    Supabase Database
                                       ↓
                                Web Dashboard (Vercel)
```

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Free tier limits exceeded | Low | Medium | Monitor usage daily, plan upgrade |
| MQTT connection instability | Medium | High | Retry logic + local buffering |
| Gateway internet failures | High | Medium | Local dashboard backup |
| Database schema changes | Medium | Low | Use migrations, version control |
| Learning curve (new tech) | Medium | Medium | Allocate extra time, use docs |
| Field testing delays | Low | Medium | Start with lab testing |

## Dependencies

### External
- Reliable internet at gateway location
- Cloud service uptime (>99.9%)
- LoRa network stability (existing)

### Internal
- Time availability for development
- Access to test hardware
- Ability to deploy updates to field

## Quality Assurance

### Testing Strategy
1. Unit tests (each component)
2. Integration tests (end-to-end)
3. Load tests (performance)
4. User acceptance tests (real usage)

### Documentation Standards
- All code commented
- README in every folder
- API documentation
- User manuals

## Go/No-Go Decision Points

### End of Week 1
**Go Criteria:**
- All accounts created
- Database schema approved
- MQTT topics defined

### End of Week 2
**Go Criteria:**
- Gateway sends data to cloud
- Data stored in database
- No critical bugs

### End of Week 3
**Go Criteria:**
- Dashboard loads successfully
- User can view data
- CSV export works

### End of Week 4
**Go Criteria:**
- All tests pass
- 48-hour stability test passed
- Documentation complete

## Next Steps After Phase 1

### Phase 2 Goals (Month 2-3)
- World map visualization
- Disease prediction models
- Camera integration
- Advanced analytics

### Phase 3 Goals (Month 4-6)
- Mobile app
- SMS alerts
- Multi-crop support
- Customer onboarding automation

## Approval

**Project Manager:** {AUTHOR_NAME}  
**Date:** {today}  
**Status:** ✅ Approved to proceed

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| {today} | 1.0 | Initial project plan | {AUTHOR_NAME} |
"""
    create_file("docs/project_plan.md", project_plan)
    
    # Milestones
    milestones = f"""# {PROJECT_NAME} Phase 1 - Milestones

**Last Updated:** {today}

## Week 1: Foundation
- [ ] All cloud accounts created and verified
- [ ] Credentials saved securely
- [ ] Database schema designed and documented
- [ ] MQTT topic structure defined
- [ ] Gateway firmware code structure planned
- [ ] GitHub repository organized
- [ ] Project documentation complete

**Status:** Not Started  
**Blocker:** None  
**Notes:** 

---

## Week 2: Implementation
- [ ] Supabase database tables created
- [ ] Row Level Security (RLS) policies configured
- [ ] Gateway firmware updated with MQTT client
- [ ] First successful cloud message sent
- [ ] Data visible in Supabase dashboard
- [ ] Basic authentication working
- [ ] Local backup system verified

**Status:** Not Started  
**Blocker:** Week 1 must complete  
**Notes:** 

---

## Week 3: Dashboard & Testing
- [ ] Web dashboard framework set up
- [ ] User login implemented
- [ ] Data display page created
- [ ] Real-time updates working
- [ ] CSV export functional
- [ ] All unit tests passing
- [ ] Dashboard deployed to Vercel

**Status:** Not Started  
**Blocker:** Week 2 must complete  
**Notes:** 

---

## Week 4: Polish & Documentation
- [ ] Integration tests passing
- [ ] 48-hour stability test completed
- [ ] Load test (100 messages) passed
- [ ] User manual written
- [ ] Deployment guide complete
- [ ] Video demo recorded
- [ ] System ready for pilot customer

**Status:** Not Started  
**Blocker:** Week 3 must complete  
**Notes:** 

---

## Celebration Checkpoints 🎉

- 🎉 First MQTT message to cloud
- 🎉 First data point in database
- 🎉 Dashboard loads for first time
- 🎉 User successfully logs in
- 🎉 CSV downloaded with real data
- 🎉 7 days uptime without issues
- 🎉 Phase 1 COMPLETE!

---

## Weekly Review Template

**Week Starting:** [Date]

**Goals for this week:**
1. 
2. 
3. 

**What got done:**
- 
- 

**What didn't get done (and why):**
- 
- 

**Blockers:**
- 

**Next week priorities:**
1. 
2. 
3. 

**Team morale:** 😊 / 😐 / 😞

---

## Notes
- Update this document every Friday
- Mark completed items with [x]
- Add notes for important decisions
- Celebrate small wins!
"""
    create_file("docs/milestones.md", milestones)
    
    # ============================================
    # CLOUD BACKEND FILES
    # ============================================
    
    print("\nCreating cloud backend files...")
    
    # Architecture doc
    architecture = f"""# {PROJECT_NAME} System Architecture

**Version:** 1.0  
**Date:** {today}  
**Phase:** 1

## System Overview

{PROJECT_NAME} is a distributed IoT system with edge computing at the gateway level and cloud-based data processing and storage.

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
data/{{gateway_id}}              → Sensor data from gateway
commands/{{gateway_id}}          → Commands to gateway
status/{{gateway_id}}            → Gateway status/heartbeat
alerts/{{farm_id}}               → System alerts
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

**Document Owner:** {AUTHOR_NAME}  
**Last Review:** {today}  
**Next Review:** [3 weeks from today]
"""
    create_file("cloud_backend/docs/architecture.md", architecture)
    
    # Database schema (will be detailed later)
    schema_readme = """# Database Schema

This directory contains the database schema for AgriConnect.

## Files
- `schema.sql` - Main database schema (tables, indexes, etc.)
- `seed_data.sql` - Sample data for testing
- `migrations/` - Database migration scripts

## Usage
See `docs/database_setup.md` for detailed setup instructions.

## Status
- [ ] Schema designed
- [ ] Tables created in Supabase
- [ ] Indexes optimized
- [ ] RLS policies configured
- [ ] Seed data loaded
"""
    create_file("cloud_backend/database/README.md", schema_readme)
    
    # MQTT structure (will be detailed later)
    mqtt_readme = """# MQTT Configuration

This directory contains MQTT topic structure and configuration.

## Files
- `mqtt_config.md` - Connection details and settings
- `topic_structure.md` - Topic hierarchy and message formats

## Status
- [ ] Topics defined
- [ ] Message formats documented
- [ ] Gateway configured
- [ ] Cloud subscriber working
"""
    create_file("cloud_backend/mqtt/README.md", mqtt_readme)
    
    # ============================================
    # GATEWAY FIRMWARE V2
    # ============================================
    
    print("\nCreating gateway firmware files...")
    
    gateway_readme = """# Gateway Firmware V2 - Cloud-Connected

This directory contains the updated gateway firmware with cloud connectivity.

## Changes from V1
- Added MQTT client for cloud communication
- Implemented retry logic for failed transmissions
- Local buffering during internet outages
- Improved error handling

## Files
- `AgriConnect_Gateway_Cloud.ino` - Main firmware file
- `config.h` - Configuration constants
- `mqtt_handler.h` - MQTT connection logic
- `cloud_bridge.h` - Cloud forwarding functions

## Setup
1. Install required libraries (see below)
2. Copy `.env.example` to `.env`
3. Fill in MQTT credentials
4. Upload to ESP32

## Required Libraries
- LoRa by Sandeep Mistry
- ArduinoJson by Benoit Blanchon
- PubSubClient by Nick O'Leary
- WiFi (built-in)

## Status
- [ ] Code structure finalized
- [ ] MQTT connection implemented
- [ ] Testing completed
- [ ] Deployed to production gateway
"""
    create_file("gateway_firmware_v2/README.md", gateway_readme)
    
    # ============================================
    # TESTING FILES
    # ============================================
    
    print("\nCreating testing files...")
    
    test_plan = f"""# Phase 1 Testing Plan

**Version:** 1.0  
**Date:** {today}  
**Author:** {AUTHOR_NAME}

## Test Environment Setup

### Hardware
- 1× ESP32 Gateway (with LoRa + WiFi)
- 2× ESP32 Field Nodes (with sensors)
- Power supplies
- WiFi router with internet

### Software
- Arduino IDE with gateway firmware
- Browser for dashboard testing
- Supabase dashboard access
- HiveMQ Cloud console access

---

## Unit Tests

### Test 1: MQTT Connection
**Objective:** Verify gateway can connect to HiveMQ Cloud

**Prerequisites:**
- Gateway powered on
- WiFi credentials configured
- MQTT credentials configured

**Steps:**
1. Power on gateway
2. Monitor serial output
3. Observe MQTT connection attempt

**Expected Results:**
- [ ] Gateway connects to WiFi within 30 seconds
- [ ] MQTT connection established within 10 seconds
- [ ] Connection persists for 1 hour without dropout
- [ ] Auto-reconnects after manual disconnect within 30 seconds

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started | 🏃 In Progress | ✅ Passed | ❌ Failed

---

### Test 2: Data Publishing
**Objective:** Verify sensor data reaches HiveMQ

**Prerequisites:**
- Test 1 passed
- Field node powered on
- Gateway receiving LoRa packets

**Steps:**
1. Observe field node send LoRa packet
2. Check gateway serial output for parsing
3. Verify MQTT publish command
4. Check HiveMQ cloud console

**Expected Results:**
- [ ] Gateway receives LoRa packet
- [ ] JSON parsing successful
- [ ] MQTT publish returns success
- [ ] Message visible in HiveMQ console
- [ ] Message format matches specification

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 3: Database Storage
**Objective:** Verify data reaches Supabase database

**Prerequisites:**
- Test 2 passed
- Database tables created
- Database trigger/function configured

**Steps:**
1. Publish test message to MQTT
2. Wait 5 seconds
3. Query Supabase database
4. Verify data inserted

**Expected Results:**
- [ ] Data appears in database within 5 seconds
- [ ] All fields populated correctly
- [ ] Timestamp in correct format
- [ ] No duplicate entries

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 4: Dashboard Display
**Objective:** Verify dashboard shows real-time data

**Prerequisites:**
- Test 3 passed
- Dashboard deployed
- User account created

**Steps:**
1. Log into dashboard
2. Navigate to data view
3. Trigger field node reading
4. Observe dashboard update

**Expected Results:**
- [ ] Login successful
- [ ] Data displays correctly
- [ ] Real-time update within 10 seconds
- [ ] All sensor readings visible
- [ ] Timestamps correct

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 5: CSV Export
**Objective:** Verify data export functionality

**Prerequisites:**
- At least 24 hours of data in database

**Steps:**
1. Log into dashboard
2. Select date range
3. Click export CSV
4. Open downloaded file

**Expected Results:**
- [ ] CSV downloads successfully
- [ ] File contains correct data
- [ ] All columns present
- [ ] No corrupted rows
- [ ] Timestamps readable

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

## Integration Tests

### Test 6: End-to-End Flow
**Objective:** Verify complete data path

**Steps:**
1. Field node reads sensors
2. Transmits via LoRa
3. Gateway receives and forwards
4. Cloud stores data
5. Dashboard displays data
6. User exports CSV

**Expected Results:**
- [ ] Complete flow < 10 seconds
- [ ] No data loss
- [ ] All components working

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 7: Internet Outage Recovery
**Objective:** Verify local backup and resync

**Steps:**
1. System running normally
2. Disconnect gateway from internet
3. Continue field node transmissions for 10 minutes
4. Reconnect internet
5. Verify data sync

**Expected Results:**
- [ ] Gateway buffers data locally
- [ ] No crashes during outage
- [ ] Reconnects automatically
- [ ] All buffered data syncs to cloud
- [ ] No data loss

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 8: Multiple Field Nodes
**Objective:** Verify system handles multiple nodes

**Steps:**
1. Deploy 3 field nodes
2. All transmitting simultaneously
3. Monitor for 1 hour

**Expected Results:**
- [ ] Gateway receives all packets
- [ ] No packet collisions
- [ ] All data stored correctly
- [ ] Dashboard shows all nodes

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

## Load Tests

### Test 9: High Frequency Messages
**Objective:** Test system under load

**Steps:**
1. Configure field nodes for 10-second intervals
2. Run for 1 hour
3. Monitor cloud resources

**Expected Results:**
- [ ] All messages processed
- [ ] No timeouts or errors
- [ ] Database keeps up
- [ ] Dashboard remains responsive

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 10: Dashboard Concurrent Users
**Objective:** Test multiple users simultaneously

**Steps:**
1. Create 5 test user accounts
2. Log in from 5 different devices
3. Navigate and interact simultaneously
4. Monitor for 30 minutes

**Expected Results:**
- [ ] All users can log in
- [ ] Data displays correctly for each
- [ ] No cross-user data leakage
- [ ] Dashboard remains responsive

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

## Acceptance Tests

### Test 11: User Scenario - Remote Access
**Objective:** Verify real-world usage

**Steps:**
1. User at home (away from farm)
2. Opens dashboard on mobile phone
3. Views sensor data
4. Downloads CSV report

**Expected Results:**
- [ ] Dashboard loads on mobile
- [ ] Data is current (<5 min old)
- [ ] CSV downloads successfully
- [ ] User satisfied with experience

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 12: 48-Hour Stability Test
**Objective:** Verify system reliability

**Steps:**
1. Deploy system in production configuration
2. Run unattended for 48 hours
3. Monitor logs and metrics

**Expected Results:**
- [ ] No crashes or restarts required
- [ ] >99% uptime
- [ ] No memory leaks
- [ ] No data loss

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

## Test Summary

**Total Tests:** 12  
**Passed:** 0  
**Failed:** 0  
**Blocked:** 0  
**Not Started:** 12

**Overall Status:** Not Started

**Ready for Production:** ❌ No

---

## Sign-Off

**Tester:** {AUTHOR_NAME}  
**Date:** {today}  
**Approved:** ⏸️ Pending
"""
    create_file("testing/test_plans/phase1_test_plan.md", test_plan)
    
    # ============================================
    # DASHBOARD FILES
    # ============================================
    
    print("\nCreating dashboard files...")
    
    dashboard_readme = """# AgriConnect Web Dashboard

Phase 1 web dashboard for remote sensor monitoring.

## Technology
- HTML/CSS/JavaScript (Phase 1)
- Supabase JS Client
- Future: React.js (Phase 2)

## Setup
1. Install dependencies (if using Node.js build tools)
2. Configure environment variables
3. Deploy to Vercel

## Features
- User authentication
- Real-time sensor data display
- CSV export
- Responsive design

## Status
- [ ] Framework selected
- [ ] Authentication implemented
- [ ] Data display working
- [ ] CSV export functional
- [ ] Deployed to production

## Development
```bash
# If using local development server
npx serve public
```

Access at: http://localhost:3000
"""
    create_file("dashboard/README.md", dashboard_readme)
    
    # ============================================
    # HARDWARE DOCS
    # ============================================
    
    print("\nCreating hardware documentation...")
    
    hardware_readme = """# AgriConnect Hardware

This directory contains firmware for field nodes and gateways.

## Components

### Field Nodes
- ESP32 DevKit
- LoRa SX1276 module
- Multiple sensors (DHT22, soil moisture, etc.)
- See `field_node/` directory

### Gateway
- ESP32 DevKit
- LoRa SX1276 module
- WiFi connectivity
- See `gateway/` directory

## Documentation
- Bill of Materials (BOM)
- Wiring diagrams
- Hardware setup guide

## Status
- [x] Field nodes deployed and working
- [x] Gateway deployed and working
- [ ] Documentation updated for Phase 1 changes
"""
    create_file("hardware/README.md", hardware_readme)
    
    # ============================================
    # SCRIPTS
    # ============================================
    
    print("\nCreating utility scripts...")
    
    scripts_readme = """# Utility Scripts

Collection of helper scripts for development and deployment.

## Scripts

### setup_project.py
Generates the complete project structure (this ran to create everything!)

### test_mqtt.py (future)
Test MQTT connection without hardware

### generate_test_data.py (future)
Generate synthetic sensor data for testing

### backup_database.py (future)
Manual database backup script

## Usage
Each script has its own documentation in comments.
"""
    create_file("scripts/README.md", scripts_readme)
    
    # ============================================
    # COMPLETION SUMMARY
    # ============================================
    
    print("\n" + "="*60)
    print("✅ PROJECT STRUCTURE GENERATION COMPLETE!")
    print("="*60 + "\n")
    
    print("Summary:")
    print(f"  • Created {len(directories)} directories")
    print(f"  • Created 15+ documentation files")
    print(f"  • Generated credentials template")
    print(f"  • Set up Git ignore rules")
    
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("="*60)
    print("\n1. Review the generated structure:")
    print("   → Check README.md files in each directory")
    print("   → Read docs/project_plan.md")
    print("   → Review docs/account_setup.md")
    
    print("\n2. Initialize Git repository:")
    print("   → git init")
    print("   → git add .")
    print("   → git commit -m 'Initial project structure'")
    
    print("\n3. Set up cloud accounts:")
    print("   → Follow docs/account_setup.md")
    print("   → Fill in credentials.md")
    
    print("\n4. Start Phase 1 development:")
    print("   → Begin with database schema design")
    print("   → Update docs/milestones.md weekly")
    
    print("\n" + "="*60)
    print("🚀 Ready to build AgriConnect!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()