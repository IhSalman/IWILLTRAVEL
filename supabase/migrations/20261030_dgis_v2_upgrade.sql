-- ============================================================================
-- DGIS 2.0 — Thesis Future Directions Upgrade Migration
-- Covers:
--   1. Persistent Blackboard State & Itinerary Versioning (§6.6.2 & §6.6.3)
--   2. Multi-Source Live Disruption Sentinel & Schedule Patching (§6.6.2)
--   3. HITL Transactional Saga Bookings & Financial Audit Ledger (§6.6.1)
-- ============================================================================

-- 1. Extend public.itineraries for Live Active Mode & Blackboard Persistence
ALTER TABLE public.itineraries
    ADD COLUMN IF NOT EXISTS flight_data TEXT,
    ADD COLUMN IF NOT EXISTS monitored_flights JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS blackboard_state JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_itineraries_status ON public.itineraries(status);

-- 2. Itinerary Version Snapshots (1-Click Rollback for Live & Conversational Edits)
CREATE TABLE IF NOT EXISTS public.itinerary_versions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    itinerary_id    UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_num     INTEGER NOT NULL DEFAULT 1,
    change_source   TEXT NOT NULL CHECK (change_source IN ('sentinel_patch', 'copilot_chat', 'manual_edit', 'rollback')),
    change_summary  TEXT NOT NULL,
    snapshot        JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itinerary_versions_itinerary_id ON public.itinerary_versions(itinerary_id, created_at DESC);

ALTER TABLE public.itinerary_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own itinerary versions"
        ON public.itinerary_versions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own itinerary versions"
        ON public.itinerary_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Extend public.disruption_alerts for Weather, AQI, Venue Closures & Structured Patches
ALTER TABLE public.disruption_alerts
    ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'flight',
    ADD COLUMN IF NOT EXISTS proposed_patch JSONB;

-- Drop restrictive flight-only status check if present so weather/aqi/closure triggers work
ALTER TABLE public.disruption_alerts
    DROP CONSTRAINT IF EXISTS disruption_alerts_status_check;

-- 4. HITL Transactional Bookings & Append-Only Audit Ledger (Thesis §6.6.1)
CREATE TABLE IF NOT EXISTS public.bookings (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    itinerary_id            UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,
    booking_type            TEXT NOT NULL CHECK (booking_type IN ('flight', 'hotel', 'activity')),
    provider                TEXT NOT NULL, -- 'duffel' | 'amadeus' | 'sandbox_saga'
    offer_id                TEXT NOT NULL,
    item_title              TEXT NOT NULL,
    item_details            JSONB NOT NULL DEFAULT '{}'::jsonb,
    passenger_details       JSONB NOT NULL DEFAULT '{}'::jsonb,
    amount                  NUMERIC(10, 2) NOT NULL,
    currency                TEXT NOT NULL DEFAULT 'USD',
    state                   TEXT NOT NULL CHECK (state IN (
                                'quoted',
                                'awaiting_consent',
                                'payment_authorized',
                                'confirmed',
                                'failed_rolled_back',
                                'cancelled'
                            )),
    consent_token           TEXT,
    consent_confirmed_at    TIMESTAMPTZ,
    stripe_payment_intent   TEXT,
    provider_reference      TEXT, -- PNR / Hotel Confirmation Code
    expires_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at              TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_itinerary_id ON public.bookings(itinerary_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own bookings"
        ON public.bookings FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own bookings"
        ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own bookings"
        ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.booking_audit_logs (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_state      TEXT,
    to_state        TEXT NOT NULL,
    actor           TEXT NOT NULL, -- 'user_hitl' | 'saga_orchestrator' | 'provider_webhook'
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_audit_booking_id ON public.booking_audit_logs(booking_id, created_at ASC);

ALTER TABLE public.booking_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own booking audit logs"
        ON public.booking_audit_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
