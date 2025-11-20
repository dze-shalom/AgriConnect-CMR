-- Create sensor_readings table
CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identification
    gateway_id TEXT NOT NULL,
    field_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    
    -- Timestamp
    reading_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Environmental sensors
    air_temperature DECIMAL(5, 2),
    air_humidity DECIMAL(5, 2),
    light_intensity INTEGER,
    par_value DECIMAL(8, 2),
    co2_ppm INTEGER,
    
    -- Soil sensors
    soil_moisture INTEGER,
    soil_temperature DECIMAL(5, 2),
    ph_value DECIMAL(4, 2),
    ec_value DECIMAL(6, 2),
    
    -- NPK values
    nitrogen_ppm INTEGER,
    phosphorus_ppm INTEGER,
    potassium_ppm INTEGER,
    
    -- System status
    water_level INTEGER,
    battery_level INTEGER,
    pump_status BOOLEAN DEFAULT FALSE,
    rssi INTEGER,
    
    -- Data quality
    data_valid BOOLEAN DEFAULT TRUE
);

-- Create indexes for fast queries
CREATE INDEX idx_gateway_time ON sensor_readings(gateway_id, reading_time DESC);
CREATE INDEX idx_field_zone_time ON sensor_readings(field_id, zone_id, reading_time DESC);
CREATE INDEX idx_reading_time ON sensor_readings(reading_time DESC);
-- =============================================
-- Table 2: gateways
-- =============================================

-- Create gateways table
CREATE TABLE gateways (
    gateway_id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    
    -- Gateway info
    name TEXT,
    hardware_version TEXT DEFAULT 'ESP32-v1',
    firmware_version TEXT,
    
    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    installation_location TEXT,
    
    -- Status
    status TEXT DEFAULT 'offline',
    last_seen TIMESTAMPTZ,
    
    -- Features
    satellite_enabled BOOLEAN DEFAULT FALSE,
    local_storage_enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_farm_gateways ON gateways(farm_id);
-- =============================================
-- Table 3: field_nodes
-- =============================================

-- Create field_nodes table
CREATE TABLE field_nodes (
    node_id TEXT PRIMARY KEY,
    gateway_id TEXT NOT NULL REFERENCES gateways(gateway_id),
    
    -- Node identification
    field_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    
    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Configuration
    sensor_config JSONB,
    sample_interval INTEGER DEFAULT 60,
    
    -- Status
    status TEXT DEFAULT 'active',
    last_reading TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(gateway_id, field_id, zone_id)
);

-- Create index
CREATE INDEX idx_gateway_nodes ON field_nodes(gateway_id);
-- =============================================
-- Table 4: farms
-- =============================================

-- Create farms table
CREATE TABLE farms (
    farm_id TEXT PRIMARY KEY,
    
    -- Organization
    name TEXT NOT NULL,
    owner_id UUID,
    
    -- Location
    country TEXT DEFAULT 'Cameroon',
    region TEXT,
    city TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Farm details
    crop_type TEXT DEFAULT 'tomato',
    area_hectares DECIMAL(10, 2),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- Table 5: alerts
-- =============================================

-- Create alerts table
CREATE TABLE alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target
    farm_id TEXT REFERENCES farms(farm_id),
    gateway_id TEXT REFERENCES gateways(gateway_id),
    field_id INTEGER,
    zone_id INTEGER,
    
    -- Alert details
    alert_type TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    
    -- Status
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_farm_alerts ON alerts(farm_id, created_at DESC);
CREATE INDEX idx_unacknowledged ON alerts(acknowledged, created_at DESC) WHERE NOT acknowledged;