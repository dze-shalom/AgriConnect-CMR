-- Migration: Create Telegram Alerts Log Table
-- Description: Stores Telegram alert delivery logs
-- Created: 2025-01-27

-- Telegram Alerts Log Table
CREATE TABLE IF NOT EXISTS telegram_alerts_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'warning', 'info')),
    message TEXT NOT NULL,
    chat_id VARCHAR(50) NOT NULL,
    farm_id VARCHAR(50),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
    telegram_message_id INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_telegram_alerts_log_user_id ON telegram_alerts_log(user_id);
CREATE INDEX idx_telegram_alerts_log_sent_at ON telegram_alerts_log(sent_at);
CREATE INDEX idx_telegram_alerts_log_severity ON telegram_alerts_log(severity);
CREATE INDEX idx_telegram_alerts_log_status ON telegram_alerts_log(delivery_status);

-- Row Level Security
ALTER TABLE telegram_alerts_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own telegram alerts"
    ON telegram_alerts_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own telegram alerts"
    ON telegram_alerts_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE telegram_alerts_log IS 'Logs all Telegram alert messages sent to users';
COMMENT ON COLUMN telegram_alerts_log.chat_id IS 'Telegram chat ID where message was sent';
COMMENT ON COLUMN telegram_alerts_log.telegram_message_id IS 'Telegram message ID returned by API';
COMMENT ON COLUMN telegram_alerts_log.delivery_status IS 'Message delivery status: pending, sent, or failed';
