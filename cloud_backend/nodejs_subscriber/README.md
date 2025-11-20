# AgriConnect Cloud Backend - Intelligent MQTT Subscriber

## Overview
Intelligent cloud backend that receives sensor data from field gateways, analyzes for disease risks, irrigation needs, and anomalies, and generates actionable alerts.

## Features

### Intelligence Modules
- **Disease Analyzer**: Monitors 6 major tomato diseases with risk prediction
- **Irrigation Optimizer**: Smart watering recommendations based on VPD and soil conditions
- **Anomaly Detector**: Identifies sensor malfunctions and environmental issues
- **Alert Manager**: Prioritized alert system with deduplication

### Supported Diseases
1. Early Blight (Alternaria solani)
2. Late Blight (Phytophthora infestans)
3. Septoria Leaf Spot
4. Powdery Mildew
5. Bacterial Spot
6. Blossom End Rot (physiological)

## Installation

### Prerequisites
- Node.js 16.x or higher
- npm 8.x or higher
- Active Supabase account
- Active HiveMQ Cloud account

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Copy `.env.example` to `.env` and fill in your credentials:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
MQTT_BROKER=your_cluster.s2.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=gateway_client
MQTT_PASSWORD=your_mqtt_password
FARM_ID=FARM-CM-001
```

3. Start the subscriber:
```bash
npm start
```

## Testing

### Test with Simulated Data
Run the test simulator to send sample sensor data:
```bash
npm test
```

This will send 7 test scenarios:
1. Normal optimal conditions
2. Late Blight risk (critical)
3. Urgent irrigation needed
4. Sensor malfunction
5. Nutrient deficiency
6. Low battery warning
7. Early Blight risk

### Expected Output
The main subscriber will:
- Receive and parse MQTT messages
- Store data in Supabase database
- Run intelligence analysis
- Generate and store alerts
- Display analysis results in console

## Architecture
```
MQTT Broker (HiveMQ)
        ↓
    index.js (Main Subscriber)
        ↓
    ├─→ Store in Database (Supabase)
    ├─→ Disease Analyzer
    ├─→ Irrigation Optimizer
    ├─→ Anomaly Detector
    └─→ Alert Manager
```

## Project Structure
```
nodejs_subscriber/
├── index.js                        # Main subscriber
├── intelligence/
│   ├── disease-analyzer.js        # Disease risk models
│   ├── irrigation-optimizer.js    # Smart irrigation logic
│   ├── anomaly-detector.js        # Sensor validation
│   └── alert-manager.js           # Alert generation
├── tests/
│   └── simulate-sensor-data.js    # Test simulator
├── .env                           # Configuration (do not commit)
├── package.json                   # Dependencies
└── README.md                      # This file
```

## Intelligence Details

### Disease Risk Calculation
Each disease model evaluates:
- Temperature range (optimal for pathogen)
- Humidity threshold
- Leaf wetness duration
- Additional factors (soil moisture, calcium, etc.)

Risk probability calculated based on conditions met.
Alerts generated when probability exceeds action threshold.

### Irrigation Optimization
Considers:
- Current soil moisture level
- Vapor Pressure Deficit (VPD)
- Air temperature and humidity
- Time of day
- Historical patterns (future enhancement)

Calculates precise irrigation duration based on soil deficit.

### Anomaly Detection
Validates:
- Sensor readings within physical limits
- Cross-sensor correlations
- Battery levels
- Unusual NPK combinations

Differentiates between sensor errors and real environmental issues.

## Alert Severity Levels

- **CRITICAL**: Immediate action required (disease outbreak, urgent irrigation)
- **WARNING**: Action needed within 24 hours (nutrient deficiency, suboptimal conditions)
- **INFO**: Monitor situation (normal variations, FYI alerts)

## Database Schema

### Tables Used
- `sensor_readings`: Time-series sensor data
- `alerts`: Generated alerts and notifications
- `gateways`: Gateway status updates

## Troubleshooting

### Connection Issues
```
[ERROR] MQTT connection failed
```
- Verify MQTT credentials in .env
- Check HiveMQ cluster is running
- Verify firewall allows port 8883

### Database Errors
```
[ERROR] Database insert failed
```
- Verify Supabase credentials
- Check table schema matches code
- Verify internet connection

### No Data Received
- Verify gateway is publishing to correct topics
- Check MQTT subscription in console logs
- Test with simulator: `npm test`

## Production Deployment

### Recommended Hosting
- Heroku (Node.js dyno)
- AWS EC2 (t2.micro sufficient)
- DigitalOcean Droplet ($6/month)
- Railway.app (free tier available)

### Environment Variables
Ensure all .env variables are set in production environment.

### Process Management
Use PM2 for production:
```bash
npm install -g pm2
pm2 start index.js --name agriconnect-backend
pm2 save
pm2 startup
```

### Monitoring
- Check logs: `pm2 logs`
- Monitor CPU/memory: `pm2 monit`
- Restart if needed: `pm2 restart agriconnect-backend`

## Future Enhancements

### Phase 2 (Planned)
- Weather API integration
- Historical trend analysis
- Predictive analytics (6-hour forecasts)
- Growth stage tracking
- Yield estimation
- Cost tracking
- SMS/WhatsApp alerts
- Email notifications
- Dashboard real-time updates via WebSocket

### Phase 3 (Future)
- Machine learning disease models
- Camera image analysis integration
- Multi-crop support
- Advanced analytics dashboard
- Mobile push notifications

## Support

For issues or questions:
- Check logs: `pm2 logs` or console output
- Review test output: `npm test`
- Verify database in Supabase dashboard
- Check MQTT activity in HiveMQ console

## License
Proprietary - AgriConnect Ltd

## Version History

### v1.0.0 (Current)
- Initial release
- 4 intelligence modules
- 6 disease models
- MQTT subscriber with TLS
- Supabase integration
- Alert system with deduplication