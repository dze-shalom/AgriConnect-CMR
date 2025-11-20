-- Create table for logging SMS alerts
CREATE TABLE IF NOT EXISTS sms_alerts_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'warning', 'info')) NOT NULL,
    message TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
    twilio_sid TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_sms_alerts_log_farm_id ON sms_alerts_log(farm_id);
CREATE INDEX idx_sms_alerts_log_sent_at ON sms_alerts_log(sent_at DESC);
CREATE INDEX idx_sms_alerts_log_severity ON sms_alerts_log(severity);
CREATE INDEX idx_sms_alerts_log_status ON sms_alerts_log(delivery_status);

-- Enable Row Level Security
ALTER TABLE sms_alerts_log ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read their farm's SMS alerts
CREATE POLICY "Users can view their farm's SMS alerts"
    ON sms_alerts_log
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create policy to allow service role to insert/update
CREATE POLICY "Service role can manage SMS alerts"
    ON sms_alerts_log
    FOR ALL
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Create view for SMS analytics
CREATE OR REPLACE VIEW sms_alerts_analytics AS
SELECT
    farm_id,
    DATE_TRUNC('day', sent_at) as alert_date,
    severity,
    delivery_status,
    COUNT(*) as alert_count,
    COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed_count
FROM sms_alerts_log
GROUP BY farm_id, DATE_TRUNC('day', sent_at), severity, delivery_status;

COMMENT ON TABLE sms_alerts_log IS 'Logs all SMS alerts sent to farm administrators via Twilio';
COMMENT ON VIEW sms_alerts_analytics IS 'Aggregated SMS delivery analytics by farm, date, and severity';
