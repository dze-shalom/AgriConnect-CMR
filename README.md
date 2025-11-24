# AgriConnect - Cloud-Connected Precision Agriculture Platform

**Version:** 1.0.0
**Status:** Phase 1 - In Development
**Last Updated:** 2025-10-21

## Overview
AgriConnect is a cloud-connected precision agriculture monitoring system using LoRa wireless sensor networks and ESP32 gateways for remote farm monitoring and control.

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
Proprietary - AgriConnect 

## Contact
**Author**: Dze-Kum Shalom Chow
**Company**: AgriConnect 
**Date**: 2025-11-18
