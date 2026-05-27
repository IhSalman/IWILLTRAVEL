-- ─────────────────────────────────────────────────────────────────────────────
-- Agent Pipeline Logs Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.agent_pipeline_logs (
    id              uuid primary key default gen_random_uuid(),
    created_at      timestamptz not null default now(),

    -- Request context
    user_id         text,                          -- null for guests
    destination     text not null,
    days            int  not null,
    budget          text,
    travel_style    text,

    -- Pipeline outcome
    total_ms        int  not null,                 -- end-to-end wall-clock ms
    success         boolean not null default true,
    error_message   text,

    -- Per-agent breakdown stored as JSON array
    -- Each entry: { agent, durationMs, status, details, timestamp }
    agent_logs      jsonb not null default '[]'::jsonb,

    -- Token accounting
    input_tokens    int  default 0,
    output_tokens   int  default 0,
    model_used      text
);

-- Index for time-series queries (thesis benchmarks)
create index if not exists agent_pipeline_logs_created_at_idx
    on public.agent_pipeline_logs (created_at desc);

-- Index for per-destination analysis
create index if not exists agent_pipeline_logs_destination_idx
    on public.agent_pipeline_logs (destination);

-- RLS: service role (admin client) can always write; disable public access
alter table public.agent_pipeline_logs enable row level security;

-- Service role bypasses RLS automatically, so no policy needed for writes.
-- Optional: allow authenticated users to read their own logs.
create policy "Users can read own pipeline logs"
    on public.agent_pipeline_logs
    for select
    using (user_id = auth.uid()::text);
