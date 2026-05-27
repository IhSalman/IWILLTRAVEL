-- ============================================================
-- IWILLTRAVEL 2026 — Disruption Alerts Schema
-- Run this migration in your Supabase SQL Editor
-- ============================================================

-- Table: disruption_alerts
-- Stores AI-generated mitigation proposals from the Disruption Sentinel
CREATE TABLE IF NOT EXISTS public.disruption_alerts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
    itinerary_id    UUID NOT NULL,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flight_iata     TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('active', 'landed', 'cancelled', 'delayed', 'diverted')),
    delay_minutes   INTEGER DEFAULT 0,
    severity        TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    ai_proposal     TEXT NOT NULL,
    alternative_options JSONB DEFAULT '[]',
    resolved        BOOLEAN DEFAULT false NOT NULL,
    resolved_at     TIMESTAMPTZ,
    user_action     TEXT CHECK (user_action IN ('approved', 'declined', 'ignored', NULL))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_disruption_alerts_user_id ON public.disruption_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_disruption_alerts_itinerary_id ON public.disruption_alerts(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_disruption_alerts_resolved ON public.disruption_alerts(resolved) WHERE resolved = false;

-- Row Level Security: users only see their own alerts
ALTER TABLE public.disruption_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
    ON public.disruption_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts (resolve)"
    ON public.disruption_alerts FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow service role to insert (from Sentinel agent)
CREATE POLICY "Service role can insert"
    ON public.disruption_alerts FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- Enable Realtime for instant dashboard push
-- (Run this separately if not already enabled)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.disruption_alerts;
-- ============================================================
