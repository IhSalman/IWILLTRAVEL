/**
 * Pipeline regression evaluation.
 *
 *   GET  /api/admin/evals/run           — Vercel Cron (Authorization: Bearer CRON_SECRET)
 *   POST /api/admin/evals/run           — signed-in admin; body { trips?: string[] }
 *
 * Runs fixed benchmark trips through the real 8-agent pipeline, computes quality
 * metrics (grounding, verified details, closed-venue conflicts, day spread, speed,
 * tokens) and stores one row per trip in `pipeline_evals`, grouped by run_id.
 *
 * Cost note: each trip makes real LLM + Google calls. Caching (Phase 2) makes
 * repeat runs much cheaper; the cron runs weekly and evaluates a rotating subset.
 */
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/require-admin';
import { createAdminClient } from '@/utils/supabase/admin';
import { executeItineraryPipeline } from '@/lib/agents/pipeline';
import { computeItineraryMetrics } from '@/lib/agents/pipeline-metrics';
import { EVAL_TRIPS, evalStartDate, type EvalTrip } from '@/lib/agents/eval-trips';
import { getActiveModel } from '@/utils/ai-config';

export const maxDuration = 300;

const CONCURRENCY = 2;
const STOP_STARTING_AFTER_MS = 170_000; // leave headroom inside the 300 s limit

async function runOne(trip: EvalTrip, runId: string, startDate: string, model: string) {
    const t0 = Date.now();
    const supabase = createAdminClient();
    try {
        const result = await executeItineraryPipeline({ ...trip.input, startDate }, undefined, { userId: null });
        const metrics = computeItineraryMetrics(result.itinerary, trip.input.days);
        const row = {
            run_id: runId,
            trip_key: trip.key,
            destination: trip.input.destination,
            days: trip.input.days,
            success: true,
            total_ms: result.totalMs,
            input_tokens: result.itinerary._tokens?.inputTokens ?? 0,
            output_tokens: result.itinerary._tokens?.outputTokens ?? 0,
            model,
            metrics,
            agent_logs: result.agentLogs,
        };
        await supabase.from('pipeline_evals').insert(row);
        return row;
    } catch (err: any) {
        const row = {
            run_id: runId,
            trip_key: trip.key,
            destination: trip.input.destination,
            days: trip.input.days,
            success: false,
            total_ms: Date.now() - t0,
            model,
            error: String(err?.message || err).slice(0, 500),
        };
        await supabase.from('pipeline_evals').insert(row);
        return row;
    }
}

async function runEvals(trips: EvalTrip[]) {
    const runId = crypto.randomUUID();
    const startDate = evalStartDate();
    const model = await getActiveModel().catch(() => 'unknown');
    const started = Date.now();
    const queue = [...trips];
    const results: any[] = [];
    const skipped: string[] = [];

    const worker = async () => {
        while (queue.length) {
            if (Date.now() - started > STOP_STARTING_AFTER_MS) {
                skipped.push(...queue.splice(0).map((t) => t.key));
                return;
            }
            const trip = queue.shift()!;
            results.push(await runOne(trip, runId, startDate, model));
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const ok = results.filter((r) => r.success);
    const avg = (f: (m: any) => number) =>
        ok.length ? Math.round((ok.reduce((s, r) => s + f(r.metrics), 0) / ok.length) * 1000) / 1000 : null;

    return {
        runId,
        model,
        startDate,
        trips: results.length,
        succeeded: ok.length,
        skipped,
        summary: {
            groundingRate: avg((m) => m.groundingRate),
            verifiedDetailsRate: avg((m) => m.verifiedDetailsRate),
            closedConflicts: ok.reduce((s, r) => s + r.metrics.closedConflicts, 0),
            avgDaySpreadKm: avg((m) => m.avgDaySpreadKm),
            avgSeconds: ok.length ? Math.round(ok.reduce((s, r) => s + r.total_ms, 0) / ok.length / 1000) : null,
            totalTokens: ok.reduce((s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0),
        },
        results: results.map(({ agent_logs: _logs, ...r }) => r),
    };
}

/** Weekly cron: rotate through the benchmark, three trips per run. */
export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
    const perRun = 3;
    const start = (week * perRun) % EVAL_TRIPS.length;
    const trips = Array.from({ length: perRun }, (_, i) => EVAL_TRIPS[(start + i) % EVAL_TRIPS.length]);
    return NextResponse.json(await runEvals(trips));
}

/** Manual run by an admin, optionally choosing trips by key. */
export async function POST(req: Request) {
    const guard = await requireAdmin();
    if ('error' in guard) return guard.error;

    const body = await req.json().catch(() => ({}));
    const keys: string[] | undefined = Array.isArray(body?.trips) ? body.trips : undefined;
    const trips = keys ? EVAL_TRIPS.filter((t) => keys.includes(t.key)) : EVAL_TRIPS.slice(0, 3);
    if (!trips.length) {
        return NextResponse.json(
            { error: 'No matching trips', available: EVAL_TRIPS.map((t) => t.key) },
            { status: 400 }
        );
    }
    return NextResponse.json(await runEvals(trips));
}
