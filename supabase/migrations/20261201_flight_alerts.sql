-- Flight alerts (paid): tracked flights, alert events, alert preferences, aircraft-model watches.
-- Written by the server with the service role; users may read their own rows.

-- ── Tracked flights ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tracked_flights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    itinerary_id    UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,
    flight_number   TEXT NOT NULL,               -- normalised ticket number, e.g. "BA123"
    flight_date     DATE NOT NULL,               -- local departure date
    dep_iata        TEXT,
    arr_iata        TEXT,
    sched_dep_utc   TIMESTAMPTZ,
    sched_arr_utc   TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'scheduled',
    snapshot        JSONB,                       -- latest normalised provider snapshot (src/lib/flight-status/types.ts)
    notified        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- last values the user was told about, per alert kind
    active          BOOLEAN NOT NULL DEFAULT true,
    next_check_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_checked_at TIMESTAMPTZ,
    checks_count    INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, flight_number, flight_date)
);

CREATE INDEX IF NOT EXISTS tracked_flights_due_idx ON public.tracked_flights (next_check_at) WHERE active;
CREATE INDEX IF NOT EXISTS tracked_flights_user_idx ON public.tracked_flights (user_id, flight_date DESC);
CREATE INDEX IF NOT EXISTS tracked_flights_itinerary_idx ON public.tracked_flights (itinerary_id) WHERE itinerary_id IS NOT NULL;

ALTER TABLE public.tracked_flights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own tracked flights" ON public.tracked_flights;
CREATE POLICY "Users read own tracked flights" ON public.tracked_flights
    FOR SELECT USING (auth.uid() = user_id);

-- ── Alert events (one row per change we told, or decided not to tell, the user) ──
CREATE TABLE IF NOT EXISTS public.flight_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracked_flight_id UUID NOT NULL REFERENCES public.tracked_flights(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind              TEXT NOT NULL,             -- delay | gate | terminal | cancelled | diverted | departed | landed | aircraft_swap | belt | checkin_reminder | day_of_travel
    old_value         TEXT,
    new_value         TEXT NOT NULL,
    message           TEXT,
    notified_at       TIMESTAMPTZ,
    notify_result     JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- The same change is never recorded (or emailed) twice, even if two checks overlap.
    UNIQUE (tracked_flight_id, kind, new_value)
);

CREATE INDEX IF NOT EXISTS flight_events_user_idx ON public.flight_events (user_id, created_at DESC);

ALTER TABLE public.flight_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own flight events" ON public.flight_events;
CREATE POLICY "Users read own flight events" ON public.flight_events
    FOR SELECT USING (auth.uid() = user_id);

-- ── Alert preferences ────────────────────────────────────────────────────────
-- { "kinds": { "delay": true, "gate": true, ... }, "minDelayMinutes": 15 }
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS alert_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Aircraft-model watches ("tell me when an A380 lands at LHR") ────────────
CREATE TABLE IF NOT EXISTS public.aircraft_watches (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label        TEXT NOT NULL,                  -- e.g. "Airbus A380 at LHR"
    type_codes   TEXT[] NOT NULL,                -- ICAO designators, e.g. {A388}
    airport_iata TEXT,                           -- watch an airport's schedule and approaches…
    lat          DOUBLE PRECISION,               -- …or a point (e.g. "near my home")
    lon          DOUBLE PRECISION,
    radius_nm    INTEGER NOT NULL DEFAULT 30 CHECK (radius_nm BETWEEN 5 AND 100),
    mode         TEXT NOT NULL DEFAULT 'scheduled' CHECK (mode IN ('scheduled', 'live')),
    active       BOOLEAN NOT NULL DEFAULT true,
    last_run_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (airport_iata IS NOT NULL OR (lat IS NOT NULL AND lon IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS aircraft_watches_active_idx ON public.aircraft_watches (active, mode);

ALTER TABLE public.aircraft_watches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own aircraft watches" ON public.aircraft_watches;
CREATE POLICY "Users read own aircraft watches" ON public.aircraft_watches
    FOR SELECT USING (auth.uid() = user_id);

-- One alert per watch per aircraft/flight (keys include a time bucket for live mode).
CREATE TABLE IF NOT EXISTS public.aircraft_watch_hits (
    watch_id   UUID NOT NULL REFERENCES public.aircraft_watches(id) ON DELETE CASCADE,
    hit_key    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (watch_id, hit_key)
);

ALTER TABLE public.aircraft_watch_hits ENABLE ROW LEVEL SECURITY;

-- ── Scheduling ───────────────────────────────────────────────────────────────
-- Vercel's Hobby plan only runs cron jobs once a day, but flight alerts need a check every
-- few minutes. Supabase can call the endpoint instead (Dashboard → Integrations → Cron,
-- or run the statements below once in the SQL editor after replacing the two placeholders):
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   CREATE EXTENSION IF NOT EXISTS pg_net;
--   SELECT vault.create_secret('<CRON_SECRET value>', 'cron_secret');
--   SELECT cron.schedule(
--       'flight-watch', '*/5 * * * *',
--       $$ SELECT net.http_get(
--              url := 'https://<your-domain>/api/cron/flight-watch',
--              headers := jsonb_build_object('Authorization', 'Bearer ' ||
--                  (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
--              timeout_milliseconds := 60000
--          ) $$
--   );
--
-- On Vercel Pro you can instead add {"path": "/api/cron/flight-watch", "schedule": "*/5 * * * *"} to vercel.json.
