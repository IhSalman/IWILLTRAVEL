-- pipeline_evals: one row per benchmark trip per evaluation run (see /api/admin/evals/run).
-- Compare runs over time to catch quality or cost regressions after prompt/model changes.

CREATE TABLE IF NOT EXISTS public.pipeline_evals (
    id            BIGSERIAL PRIMARY KEY,
    run_id        UUID NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    trip_key      TEXT NOT NULL,
    destination   TEXT NOT NULL,
    days          INT NOT NULL,
    success       BOOLEAN NOT NULL,
    error         TEXT,
    total_ms      INT,
    input_tokens  INT,
    output_tokens INT,
    model         TEXT,
    metrics       JSONB,
    agent_logs    JSONB
);

CREATE INDEX IF NOT EXISTS pipeline_evals_run_idx ON public.pipeline_evals (run_id);
CREATE INDEX IF NOT EXISTS pipeline_evals_trip_time_idx ON public.pipeline_evals (trip_key, created_at DESC);

-- Server-only.
ALTER TABLE public.pipeline_evals ENABLE ROW LEVEL SECURITY;

-- Handy view: one line per run with averages.
-- security_invoker so the view obeys the table's RLS (not readable via the public API).
CREATE OR REPLACE VIEW public.pipeline_eval_runs WITH (security_invoker = true) AS
SELECT
    run_id,
    min(created_at)                                         AS started_at,
    max(model)                                              AS model,
    count(*)                                                AS trips,
    count(*) FILTER (WHERE success)                         AS succeeded,
    round(avg((metrics->>'groundingRate')::numeric), 3)       AS grounding_rate,
    round(avg((metrics->>'verifiedDetailsRate')::numeric), 3) AS verified_details_rate,
    sum((metrics->>'closedConflicts')::int)                 AS closed_conflicts,
    round(avg((metrics->>'avgDaySpreadKm')::numeric), 2)      AS avg_day_spread_km,
    round(avg(total_ms) / 1000.0, 1)                        AS avg_seconds,
    sum(coalesce(input_tokens, 0) + coalesce(output_tokens, 0)) AS total_tokens
FROM public.pipeline_evals
GROUP BY run_id
ORDER BY started_at DESC;
