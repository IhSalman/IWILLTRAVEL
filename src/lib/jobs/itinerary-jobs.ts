/**
 * Background itinerary generation jobs.
 *
 * A job row is created immediately and the 8-agent pipeline runs after the HTTP
 * response (Next.js `after()`), so callers never hold a connection open for 30–70 s.
 * Progress logs, the result and any error are written to `generation_jobs`;
 * clients poll GET /api/jobs/:id (or subscribe via Supabase Realtime).
 *
 * Used by the Telegram bot today; the web planner can switch to it later.
 */
import { createAdminClient } from '@/utils/supabase/admin';
import { executeItineraryPipeline, type PipelineResult } from '@/lib/agents/pipeline';
import type { AgentInput, AgentLog } from '@/app/api/agent-itinerary/types';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface CreateJobParams {
    userId: string | null;
    input: AgentInput;
    source: 'web' | 'telegram' | 'api' | 'seo';
    /** Saved on the job; used e.g. to message the Telegram chat when done. */
    meta?: Record<string, unknown>;
}

export async function createItineraryJob(params: CreateJobParams): Promise<string> {
    const { data, error } = await createAdminClient()
        .from('generation_jobs')
        .insert({
            user_id: params.userId,
            input: params.input,
            source: params.source,
            meta: params.meta ?? {},
            status: 'queued' satisfies JobStatus,
        })
        .select('id')
        .single();
    if (error || !data) throw new Error(`Could not create job: ${error?.message}`);
    return data.id as string;
}

export interface RunJobOptions {
    /** Called once with the finished result (e.g. save itinerary, notify user). */
    onSuccess?: (result: PipelineResult, jobId: string) => Promise<void>;
    onFailure?: (error: Error, jobId: string) => Promise<void>;
}

/**
 * Execute a queued job. Safe to call from `after()`; never throws.
 * Progress logs are flushed at most every ~1.5 s to keep DB writes low.
 */
export async function runItineraryJob(jobId: string, opts: RunJobOptions = {}): Promise<void> {
    const supabase = createAdminClient();

    // Claim the job (only if still queued) so a duplicate trigger can't run it twice.
    const { data: claimed } = await supabase
        .from('generation_jobs')
        .update({ status: 'running' satisfies JobStatus, started_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('status', 'queued')
        .select('id, input, user_id')
        .maybeSingle();
    if (!claimed) return;

    const logs: AgentLog[] = [];
    let lastFlush = 0;
    let flushing: Promise<unknown> = Promise.resolve();
    const flush = (force = false) => {
        if (!force && Date.now() - lastFlush < 1500) return;
        lastFlush = Date.now();
        const snapshot = [...logs];
        flushing = flushing.then(() =>
            supabase.from('generation_jobs').update({ logs: snapshot, updated_at: new Date().toISOString() }).eq('id', jobId)
        );
    };

    try {
        const result = await executeItineraryPipeline(
            claimed.input as AgentInput,
            (log) => {
                logs.push(log);
                flush();
            },
            { userId: (claimed.user_id as string | null) ?? null }
        );
        flush(true);
        await flushing;

        await supabase
            .from('generation_jobs')
            .update({
                status: 'succeeded' satisfies JobStatus,
                result: {
                    itinerary: result.itinerary,
                    flights: result.research.flights,
                    hotels: result.research.hotels,
                    flightAnalysis: result.flightAnalysis,
                    totalMs: result.totalMs,
                },
                logs: result.agentLogs,
                finished_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);

        if (opts.onSuccess) await opts.onSuccess(result, jobId).catch((e) => console.error('[Job] onSuccess failed:', e));
    } catch (err: any) {
        await flushing.catch(() => {});
        const error = err instanceof Error ? err : new Error(String(err));
        await supabase
            .from('generation_jobs')
            .update({
                status: 'failed' satisfies JobStatus,
                error: error.message.slice(0, 500),
                logs,
                finished_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);
        if (opts.onFailure) await opts.onFailure(error, jobId).catch((e) => console.error('[Job] onFailure failed:', e));
    }
}

export async function getItineraryJob(jobId: string) {
    const { data } = await createAdminClient()
        .from('generation_jobs')
        .select('id, user_id, status, logs, result, error, source, created_at, started_at, finished_at')
        .eq('id', jobId)
        .maybeSingle();
    return data;
}
