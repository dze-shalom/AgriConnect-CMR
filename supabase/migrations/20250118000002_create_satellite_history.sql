-- Create table for storing historical NDVI satellite analysis
CREATE TABLE IF NOT EXISTS satellite_ndvi_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    field_polygon JSONB NOT NULL,
    field_area_hectares DECIMAL(10, 4) NOT NULL,
    mean_ndvi DECIMAL(5, 3) NOT NULL,
    min_ndvi DECIMAL(5, 3),
    max_ndvi DECIMAL(5, 3),
    std_ndvi DECIMAL(5, 3),
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    health_class TEXT,
    stressed_area_hectares DECIMAL(10, 4),
    stressed_percentage DECIMAL(5, 2),
    estimated_biomass DECIMAL(10, 2),
    satellite_source TEXT DEFAULT 'mock',
    farm_id TEXT NOT NULL,
    field_name TEXT,
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_ndvi_history_farm_id ON satellite_ndvi_history(farm_id);
CREATE INDEX idx_ndvi_history_analysis_date ON satellite_ndvi_history(analysis_date DESC);
CREATE INDEX idx_ndvi_history_field_name ON satellite_ndvi_history(field_name);
CREATE INDEX idx_ndvi_history_health_score ON satellite_ndvi_history(health_score);

-- Create index for spatial queries on field polygon
CREATE INDEX idx_ndvi_history_polygon ON satellite_ndvi_history USING GIN (field_polygon);

-- Enable Row Level Security
ALTER TABLE satellite_ndvi_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read their farm's data
CREATE POLICY "Users can view their farm's NDVI history"
    ON satellite_ndvi_history
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert
CREATE POLICY "Users can insert NDVI history"
    ON satellite_ndvi_history
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update their farm's NDVI history"
    ON satellite_ndvi_history
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Create view for monthly NDVI trends
CREATE OR REPLACE VIEW ndvi_monthly_trends AS
SELECT
    farm_id,
    field_name,
    DATE_TRUNC('month', analysis_date) as month,
    AVG(mean_ndvi) as avg_ndvi,
    AVG(health_score) as avg_health_score,
    AVG(stressed_percentage) as avg_stressed_pct,
    COUNT(*) as analysis_count
FROM satellite_ndvi_history
GROUP BY farm_id, field_name, DATE_TRUNC('month', analysis_date)
ORDER BY month DESC;

COMMENT ON TABLE satellite_ndvi_history IS 'Historical NDVI analysis data for trend tracking and comparison';
COMMENT ON VIEW ndvi_monthly_trends IS 'Monthly aggregated NDVI trends for reporting';
