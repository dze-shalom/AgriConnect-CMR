-- =============================================
-- AgriConnect Test/Seed Data
-- Use this to populate database for testing
-- =============================================

-- Test Farm
INSERT INTO farms (farm_id, name, region, city, crop_type, area_hectares, latitude, longitude)
VALUES 
('FARM-CM-001', 'AgriConnect Test Farm', 'South-West', 'Buea', 'tomato', 2.5, 4.1560, 9.2571);

-- Test Gateway
INSERT INTO gateways (gateway_id, farm_id, name, hardware_version, firmware_version, status, latitude, longitude)
VALUES 
('GW-CM-BUE-001', 'FARM-CM-001', 'Buea Gateway 1', 'ESP32-v1', '2.0.0', 'online', 4.1560, 9.2571);

-- Test Field Node
INSERT INTO field_nodes (node_id, gateway_id, field_id, zone_id, latitude, longitude, sensor_config)
VALUES 
('NODE-001', 'GW-CM-BUE-001', 1, 0, 4.1560, 9.2571, '{"dht22": true, "soil_moisture": true, "ph": false}');

-- Test Sensor Reading
INSERT INTO sensor_readings (
    gateway_id, field_id, zone_id,
    air_temperature, air_humidity, soil_moisture,
    battery_level, rssi
)
VALUES 
('GW-CM-BUE-001', 1, 0, 25.5, 65.2, 450, 85, -65);

-- Test Alert
INSERT INTO alerts (farm_id, gateway_id, field_id, zone_id, alert_type, severity, message)
VALUES 
('FARM-CM-001', 'GW-CM-BUE-001', 1, 0, 'test_alert', 'info', 'Database test successful!');