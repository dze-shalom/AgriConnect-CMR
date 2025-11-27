-- Migration: Create Irrigation Scheduler Tables
-- Description: Tables for storing irrigation schedules, decisions, and user preferences
-- Created: 2025-01-27

-- Irrigation Schedules Table
-- Stores approved and pending irrigation schedules
CREATE TABLE IF NOT EXISTS irrigation_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    zone VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0 AND duration <= 120),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled', 'failed')),
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_irrigation_schedules_user_id ON irrigation_schedules(user_id);
CREATE INDEX idx_irrigation_schedules_scheduled_time ON irrigation_schedules(scheduled_time);
CREATE INDEX idx_irrigation_schedules_status ON irrigation_schedules(status);

-- Irrigation Decisions Table
-- Logs all irrigation recommendations and user decisions (approved/declined)
CREATE TABLE IF NOT EXISTS irrigation_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'declined', 'rescheduled')),
    recommendation JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for analytics
CREATE INDEX idx_irrigation_decisions_user_id ON irrigation_decisions(user_id);
CREATE INDEX idx_irrigation_decisions_timestamp ON irrigation_decisions(timestamp);
CREATE INDEX idx_irrigation_decisions_decision ON irrigation_decisions(decision);

-- User Irrigation Preferences Table
-- Stores user-specific irrigation preferences
CREATE TABLE IF NOT EXISTS irrigation_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    preferred_morning_start INTEGER DEFAULT 5 CHECK (preferred_morning_start >= 0 AND preferred_morning_start < 24),
    preferred_morning_end INTEGER DEFAULT 8 CHECK (preferred_morning_end >= 0 AND preferred_morning_end < 24),
    preferred_evening_start INTEGER DEFAULT 17 CHECK (preferred_evening_start >= 0 AND preferred_evening_start < 24),
    preferred_evening_end INTEGER DEFAULT 19 CHECK (preferred_evening_end >= 0 AND preferred_evening_end < 24),
    avoid_noon_hours BOOLEAN DEFAULT TRUE,
    crop_type VARCHAR(50) DEFAULT 'mixed' CHECK (crop_type IN ('mixed', 'vegetables', 'fruits', 'grains', 'flowers', 'herbs')),
    max_daily_irrigations INTEGER DEFAULT 2 CHECK (max_daily_irrigations > 0 AND max_daily_irrigations <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user preferences
CREATE INDEX idx_irrigation_preferences_user_id ON irrigation_preferences(user_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at columns
CREATE TRIGGER update_irrigation_schedules_updated_at
    BEFORE UPDATE ON irrigation_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_irrigation_preferences_updated_at
    BEFORE UPDATE ON irrigation_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE irrigation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_preferences ENABLE ROW LEVEL SECURITY;

-- Irrigation Schedules Policies
CREATE POLICY "Users can view their own irrigation schedules"
    ON irrigation_schedules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own irrigation schedules"
    ON irrigation_schedules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own irrigation schedules"
    ON irrigation_schedules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own irrigation schedules"
    ON irrigation_schedules FOR DELETE
    USING (auth.uid() = user_id);

-- Irrigation Decisions Policies
CREATE POLICY "Users can view their own irrigation decisions"
    ON irrigation_decisions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own irrigation decisions"
    ON irrigation_decisions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Irrigation Preferences Policies
CREATE POLICY "Users can view their own irrigation preferences"
    ON irrigation_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own irrigation preferences"
    ON irrigation_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own irrigation preferences"
    ON irrigation_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE irrigation_schedules IS 'Stores all irrigation schedules (approved, pending, completed)';
COMMENT ON TABLE irrigation_decisions IS 'Logs all irrigation recommendations and user decisions for analytics';
COMMENT ON TABLE irrigation_preferences IS 'Stores user-specific irrigation preferences and settings';

COMMENT ON COLUMN irrigation_schedules.zone IS 'Irrigation zone identifier (e.g., "all", "zone1", "field1")';
COMMENT ON COLUMN irrigation_schedules.duration IS 'Irrigation duration in minutes';
COMMENT ON COLUMN irrigation_schedules.urgency IS 'Urgency level: low, medium, or high';
COMMENT ON COLUMN irrigation_schedules.status IS 'Schedule status: pending, approved, completed, cancelled, or failed';

COMMENT ON COLUMN irrigation_preferences.crop_type IS 'Crop type for optimized irrigation timing';
COMMENT ON COLUMN irrigation_preferences.max_daily_irrigations IS 'Maximum number of irrigation sessions per day';
