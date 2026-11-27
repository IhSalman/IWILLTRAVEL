/**
 * GET /api/cron/flight-watch — checks tracked flights that are due, then aircraft watches.
 * Run every 5 minutes (Supabase pg_cron, see supabase/migrations/20261201_flight_alerts.sql,
 * or a Vercel Pro cron). Requires `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Each flight decides when it next needs a check (6h far out → 10 min near departure), so a
 * 5-minute schedule costs provider calls only for flights that are actually due.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { flightStatusEnabled } from '@/lib/flight-status/provider';
import { refreshTrackedFlight, type RefreshResult, type TrackedFlightRow } from '@/lib/flight-status/watch';
import { runAircraftWatches } from '@/lib/flight-status/aircraft-watch';

export const maxDuration = 300;

const BATCH = 40;
const CONCURRENCY = 4;
const TIME_BUDGET_MS = 200_000;

export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const started = Date.now();
    const supabase = createAdminClient();
    const results: RefreshResult[] = [];

    if (flightStatusEnabled()) {
        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabase
            .from('tracked_flights')
            .select('id')
            .eq('active', true)
            .lte('next_check_at', nowIso)
            .order('next_check_at', { ascending: true })
            .limit(BATCH);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Claim rows (push next_check_at forward) so an overlapping run skips them.
        const ids = (due ?? []).map((r: { id: string }) => r.id);
        let claimed: TrackedFlightRow[] = [];
        if (ids.length) {
            const { data } = await supabase
                .from('tracked_flights')
                .update({ next_check_at: new Date(Date.now() + 10 * 60_000).toISOString() })
                .in('id', ids)
                .lte('next_check_at', nowIso)
                .select('id, user_id, itinerary_id, flight_number, flight_date, dep_iata, snapshot, notified, checks_count, active');
            claimed = (data ?? []) as TrackedFlightRow[];
        }

        let i = 0;
        const worker = async () => {
            while (i < claimed.length && Date.now() - started < TIME_BUDGET_MS) {
                const row = claimed[i++];
                try {
                    results.push(await refreshTrackedFlight(row));
                } catch (err) {
                    results.push({ id: row.id, status: 'error', events: 0, emailed: false, stopped: false, error: err instanceof Error ? err.message : String(err) });
                }
            }
        };
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    }

    let watches = { watches: 0, hits: 0, emails: 0 };
    if (Date.now() - started < TIME_BUDGET_MS) {
        watches = await runAircraftWatches().catch(err => {
            console.error('[flight-watch] aircraft watches failed:', err);
            return watches;
        });
    }

    return NextResponse.json({
        checked: results.length,
        emailed: results.filter(r => r.emailed).length,
        events: results.reduce((n, r) => n + r.events, 0),
        errors: results.filter(r => r.error).map(r => ({ id: r.id, error: r.error })),
        watches,
        ms: Date.now() - started,
    });
}
