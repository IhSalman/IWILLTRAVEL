/**
 * Flight alerts (paid plans).
 *
 * GET  /api/flight-alerts   → the user's tracked flights, recent alerts, preferences and plan limits
 * POST /api/flight-alerts   { flightNumber: "BA123", date: "2026-12-04", itineraryId? }
 *                           → start tracking; emails on delays, gate changes, cancellations, aircraft swaps
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuth } from '@/utils/auth';
import { requireFeature } from '@/utils/require-plan';
import { getUserPlan } from '@/utils/usage';
import { flightStatusEnabled, fetchFlightStatus } from '@/lib/flight-status/provider';
import { normalizeFlightNumber } from '@/lib/flight-status/types';
import { resolvePrefs } from '@/lib/flight-status/diff';
import { pickLeg, refreshTrackedFlight } from '@/lib/flight-status/watch';

const TrackSchema = z.object({
    flightNumber: z.string().trim().min(3).max(10),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    depIata: z.string().regex(/^[A-Za-z]{3}$/).optional(),
    itineraryId: z.string().uuid().optional(),
});

export async function GET() {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const supabase = createAdminClient();
    const userId = auth.user.id;

    const [flights, events, profile, plan] = await Promise.all([
        supabase
            .from('tracked_flights')
            .select('id, itinerary_id, flight_number, flight_date, dep_iata, arr_iata, sched_dep_utc, status, snapshot, active, last_checked_at, created_at')
            .eq('user_id', userId)
            .order('flight_date', { ascending: false })
            .limit(50),
        supabase
            .from('flight_events')
            .select('id, tracked_flight_id, kind, message, created_at, notified_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
        supabase.from('profiles').select('alert_prefs').eq('id', userId).maybeSingle(),
        getUserPlan(userId),
    ]);

    if (flights.error) {
        // Table missing → migration not applied yet.
        return NextResponse.json({ error: 'Flight alerts are not set up on this server yet.' }, { status: 503 });
    }

    return NextResponse.json({
        flights: flights.data ?? [],
        events: events.data ?? [],
        prefs: resolvePrefs(profile.data?.alert_prefs),
        plan: { name: plan.plan, hasFlightAlerts: plan.limits.hasFlightAlerts, maxTrackedFlights: plan.limits.maxTrackedFlights },
        enabled: flightStatusEnabled(),
    });
}

export async function POST(req: Request) {
    const gate = await requireFeature('hasFlightAlerts', 'Flight alerts are included in the Starter and Pro plans.');
    if ('error' in gate) return gate.error;
    const { user, plan } = gate;

    if (!flightStatusEnabled()) {
        return NextResponse.json({ error: 'Flight alerts are not switched on yet. Please try again later.' }, { status: 503 });
    }

    const parsed = TrackSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Enter a flight number (e.g. BA123) and a date.' }, { status: 400 });
    const flightNumber = normalizeFlightNumber(parsed.data.flightNumber);
    const { date, itineraryId } = parsed.data;

    const today = new Date();
    const min = new Date(today.getTime() - 24 * 3600_000).toISOString().slice(0, 10);
    const max = new Date(today.getTime() + 330 * 24 * 3600_000).toISOString().slice(0, 10);
    if (date < min || date > max) {
        return NextResponse.json({ error: 'Pick a date between yesterday and the next 11 months.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Plan limit on flights tracked at the same time.
    const limit = plan.limits.maxTrackedFlights;
    if (limit >= 0) {
        const { count } = await supabase
            .from('tracked_flights')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('active', true);
        if ((count ?? 0) >= limit) {
            return NextResponse.json(
                { error: `Your plan tracks up to ${limit} flights at a time. Remove one or upgrade to Pro for unlimited.`, upgradeRequired: true },
                { status: 403 },
            );
        }
    }

    if (itineraryId) {
        const { data: trip } = await supabase.from('itineraries').select('id').eq('id', itineraryId).eq('user_id', user.id).maybeSingle();
        if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Validate the flight exists on that date before tracking it (also warms the shared cache).
    let legs;
    try {
        legs = await fetchFlightStatus(flightNumber, date);
    } catch {
        return NextResponse.json({ error: 'Flight status is temporarily unavailable. Please try again.' }, { status: 502 });
    }
    const leg = pickLeg(legs, parsed.data.depIata?.toUpperCase() ?? null);
    if (!leg) {
        return NextResponse.json({ error: `We couldn't find ${flightNumber} on ${date}. Check the number on your booking.` }, { status: 404 });
    }

    const { data: row, error } = await supabase
        .from('tracked_flights')
        .upsert({
            user_id: user.id,
            itinerary_id: itineraryId ?? null,
            flight_number: flightNumber,
            flight_date: date,
            dep_iata: leg.departure.iata,
            arr_iata: leg.arrival.iata,
            sched_dep_utc: leg.departure.scheduledUtc,
            sched_arr_utc: leg.arrival.scheduledUtc,
            active: true,
            next_check_at: new Date().toISOString(),
        }, { onConflict: 'user_id,flight_number,flight_date' })
        .select('id, user_id, itinerary_id, flight_number, flight_date, dep_iata, snapshot, notified, checks_count, active')
        .single();
    if (error || !row) {
        console.error('[flight-alerts] insert failed:', error?.message);
        return NextResponse.json({ error: 'Could not save this flight. Please try again.' }, { status: 500 });
    }

    // Take the first snapshot now: sets the baseline and sends urgent news (already delayed/cancelled).
    if (row.itinerary_id) {
        // Keep the trip's own list of monitored flights in sync for the trip page.
        const { data: trip } = await supabase.from('itineraries').select('monitored_flights').eq('id', row.itinerary_id).maybeSingle();
        const list: string[] = Array.isArray(trip?.monitored_flights) ? trip!.monitored_flights : [];
        if (!list.includes(flightNumber)) {
            await supabase.from('itineraries').update({ monitored_flights: [...list, flightNumber] }).eq('id', row.itinerary_id);
        }
    }
    const result = await refreshTrackedFlight(row);

    const { data: saved } = await supabase
        .from('tracked_flights')
        .select('id, itinerary_id, flight_number, flight_date, dep_iata, arr_iata, sched_dep_utc, status, snapshot, active, last_checked_at, created_at')
        .eq('id', row.id)
        .single();
    return NextResponse.json({ flight: saved, firstCheck: result }, { status: 201 });
}
