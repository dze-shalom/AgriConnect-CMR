-- Create table for logging email alerts
CREATE TABLE IF NOT EXISTS alert_emails_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'warning', 'info')) NOT NULL,
    message TEXT NOT NULL,
    recipient TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_alert_emails_log_farm_id ON alert_emails_log(farm_id);
CREATE INDEX idx_alert_emails_log_sent_at ON alert_emails_log(sent_at DESC);
CREATE INDEX idx_alert_emails_log_severity ON alert_emails_log(severity);

-- Enable Row Level Security
ALTER TABLE alert_emails_log ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read their farm's alerts
CREATE POLICY "Users can view their farm's email alerts"
    ON alert_emails_log
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create policy to allow service role to insert
CREATE POLICY "Service role can insert email alerts"
    ON alert_emails_log
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

COMMENT ON TABLE alert_emails_log IS 'Logs all email alerts sent to farm administrators';
