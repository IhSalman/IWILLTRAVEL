-- api_cache: shared key/value cache used by src/utils/cache.ts
-- (Places searches, place details, travel times, itinerary results, guest quotas).
-- The table already exists in production; this documents it and is safe to re-run.

CREATE TABLE IF NOT EXISTS public.api_cache (
    cache_key  TEXT PRIMARY KEY,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up periodic cleanup of old rows.
CREATE INDEX IF NOT EXISTS api_cache_created_at_idx ON public.api_cache (created_at);

-- Server-only (service role); no client access.
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Optional housekeeping, e.g. weekly:
-- DELETE FROM public.api_cache WHERE created_at < now() - interval '45 days';
