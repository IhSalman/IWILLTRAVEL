-- Phase 4: background generation jobs, trip email sequence, email opt-out.

-- ── Background itinerary jobs (src/lib/jobs/itinerary-jobs.ts) ──────────────
CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source      TEXT NOT NULL DEFAULT 'web',          -- web | telegram | api | seo
    status      TEXT NOT NULL DEFAULT 'queued'        -- queued | running | succeeded | failed
                CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    input       JSONB NOT NULL,
    meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
    logs        JSONB NOT NULL DEFAULT '[]'::jsonb,
    result      JSONB,
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generation_jobs_user_idx ON public.generation_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generation_jobs_status_idx ON public.generation_jobs (status, created_at);

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- Owners may read their own jobs directly (e.g. Supabase Realtime subscriptions).
-- All writes go through the server (service role).
DROP POLICY IF EXISTS "Users read own jobs" ON public.generation_jobs;
CREATE POLICY "Users read own jobs" ON public.generation_jobs
    FOR SELECT USING (auth.uid() = user_id);

-- ── Trip email sequence log (one row per itinerary per email kind) ──────────
CREATE TABLE IF NOT EXISTS public.trip_email_log (
    itinerary_id  UUID NOT NULL,
    kind          TEXT NOT NULL CHECK (kind IN ('pre_7', 'pre_1', 'post_1')),
    user_id       UUID,
    email_sent    BOOLEAN,
    telegram_sent BOOLEAN,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (itinerary_id, kind)
);

ALTER TABLE public.trip_email_log ENABLE ROW LEVEL SECURITY;

-- ── Email opt-out (set by /api/email/unsubscribe) ───────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT false;

-- Optional housekeeping (e.g. weekly): old finished jobs carry large results.
-- DELETE FROM public.generation_jobs WHERE finished_at < now() - interval '30 days';
