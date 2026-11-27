/**
 * Refreshes one tracked flight: fetch status → free ADS-B cross-check → detect changes →
 * record events (deduplicated by the database) → email → schedule the next check.
 * Called by /api/cron/flight-watch and right after a user starts tracking a flight.
 */
import { createAdminClient } from '@/utils/supabase/admin';
import { searchAircraft } from '@/lib/flights';
import { airlineEuUkCountry } from '@/lib/airlines';
import { checkCompensation } from '@/lib/eu261';
import { distanceNm } from '@/components/flights/geo';
import { runDisruptionSentinel } from '@/app/api/agents/disruption-sentinel';
import { fetchFlightStatus } from './provider';
import { diffSnapshots, nextCheckDelayMs, reminderEvents, resolvePrefs, type FlightEvent, type NotifiedState } from './diff';
import { sendFlightEmail } from './notify-flight';
import { PRE_DEPARTURE, arrivalDelay, departureDelay, type FlightSnapshot } from './types';

export interface TrackedFlightRow {
    id: string;
    user_id: string;
    itinerary_id: string | null;
    flight_number: string;
    flight_date: string;
    dep_iata: string | null;
    snapshot: FlightSnapshot | null;
    notified: NotifiedState | null;
    checks_count: number;
    active: boolean;
}

/** Choose the leg the user tracks (multi-leg flight numbers share one number). */
export function pickLeg(legs: FlightSnapshot[], depIata: string | null): FlightSnapshot | null {
    if (legs.length === 0) return null;
    if (depIata) return legs.find(l => l.departure.iata === depIata) ?? legs[0];
    return legs[0];
}

/**
 * The provider can lag a few minutes behind reality. If the schedule says the flight should be
 * leaving and the aircraft is already airborne on ADS-B (free), record that.
 */
async function adsbCrossCheck(s: FlightSnapshot): Promise<FlightSnapshot> {
    if (!PRE_DEPARTURE.includes(s.status) || s.departure.runwayUtc) return s;
    const dep = Date.parse(s.departure.revisedUtc ?? s.departure.scheduledUtc ?? '');
    if (!Number.isFinite(dep) || Date.now() < dep - 15 * 60_000) return s;
    const query = s.callsign ?? s.flightNumber;
    try {
        const found = (await searchAircraft(query)).find(a => !a.ground && (a.alt ?? 0) > 1500);
        if (!found) return s;
        // Make sure it's this flight: it should be within 300 nm of the departure airport or on the way.
        if (s.departure.lat !== null && s.departure.lon !== null && s.arrival.lat !== null && s.arrival.lon !== null) {
            const total = distanceNm(s.departure.lat, s.departure.lon, s.arrival.lat, s.arrival.lon);
            const via = distanceNm(s.departure.lat, s.departure.lon, found.lat, found.lon) + distanceNm(found.lat, found.lon, s.arrival.lat, s.arrival.lon);
            if (via > total * 1.4 + 50) return s;
        }
        return { ...s, adsb: { airborne: true, lat: found.lat, lon: found.lon, alt: found.alt, seenAt: new Date().toISOString() } };
    } catch {
        return s;
    }
}

function compensationNote(s: FlightSnapshot, events: FlightEvent[]): string[] {
    const relevant = events.some(e => e.kind === 'landed' || (e.kind === 'cancelled' && e.newValue === 'cancelled'));
    if (!relevant || s.departure.lat === null || s.departure.lon === null || s.arrival.lat === null || s.arrival.lon === null) return [];
    const result = checkCompensation({
        depCountry: s.departure.countryCode,
        arrCountry: s.arrival.countryCode,
        carrierCountry: airlineEuUkCountry(s.airline?.icao ?? s.airline?.iata),
        distanceKm: distanceNm(s.departure.lat, s.departure.lon, s.arrival.lat, s.arrival.lon) * 1.852,
        arrivalDelayMinutes: s.status === 'cancelled' ? null : arrivalDelay(s),
        cancelled: s.status === 'cancelled',
    });
    if (result.eligible === 'no') return [];
    return [`Compensation: ${result.reason} Claim directly with ${s.airline?.name ?? 'the airline'}; you don't need a paid claims company.`];
}

export interface RefreshResult {
    id: string;
    status: string;
    events: number;
    emailed: boolean;
    stopped: boolean;
    error?: string;
}

export async function refreshTrackedFlight(row: TrackedFlightRow, opts: { now?: Date; prefs?: unknown } = {}): Promise<RefreshResult> {
    const supabase = createAdminClient();
    const now = opts.now ?? new Date();

    let prefsRaw = opts.prefs;
    if (prefsRaw === undefined) {
        const { data } = await supabase.from('profiles').select('alert_prefs').eq('id', row.user_id).maybeSingle();
        prefsRaw = data?.alert_prefs;
    }
    const prefs = resolvePrefs(prefsRaw);

    let snapshot: FlightSnapshot | null = null;
    let error: string | undefined;
    try {
        // Close to departure we want a fresh read; days ahead, a shared copy up to 30 min old is fine.
        const prevDep = Date.parse(row.snapshot?.departure.scheduledUtc ?? '');
        const farOut = Number.isFinite(prevDep) && prevDep - now.getTime() > 24 * 3600_000;
        snapshot = pickLeg(await fetchFlightStatus(row.flight_number, row.flight_date, farOut ? 30 * 60_000 : 4 * 60_000), row.dep_iata);
        if (snapshot) snapshot = await adsbCrossCheck(snapshot);
    } catch (e) {
        error = e instanceof Error ? e.message : 'status lookup failed';
    }

    if (!snapshot) {
        const delay = error ? 15 * 60_000 : nextCheckDelayMs(null, now, row.checks_count);
        await supabase.from('tracked_flights').update({
            last_checked_at: now.toISOString(),
            checks_count: row.checks_count + 1,
            next_check_at: new Date(now.getTime() + (delay ?? 0)).toISOString(),
            active: delay !== null,
            status: delay === null ? 'not_found' : row.snapshot?.status ?? 'scheduled',
            updated_at: now.toISOString(),
        }).eq('id', row.id);
        return { id: row.id, status: 'no_data', events: 0, emailed: false, stopped: delay === null, error };
    }

    const isFirst = !row.snapshot;
    const changes = diffSnapshots(snapshot, row.notified ?? {}, prefs, isFirst);
    const reminders = reminderEvents(snapshot, changes.notified, prefs, now);
    const events = [...changes.events, ...reminders.events];
    const notified = reminders.notified;

    // Record events; the unique (flight, kind, new_value) key drops anything already recorded,
    // so overlapping cron runs can never email the same change twice.
    let fresh: FlightEvent[] = [];
    let insertedIds: string[] = [];
    if (events.length > 0) {
        const { data: inserted, error: insErr } = await supabase
            .from('flight_events')
            .upsert(
                events.map(e => ({
                    tracked_flight_id: row.id,
                    user_id: row.user_id,
                    kind: e.kind,
                    old_value: e.oldValue,
                    new_value: e.newValue,
                    message: `${e.title}. ${e.detail}`,
                })),
                { onConflict: 'tracked_flight_id,kind,new_value', ignoreDuplicates: true },
            )
            .select('id, kind, new_value');
        if (insErr) console.error('[flight-watch] event insert failed:', insErr.message);
        const keys = new Set((inserted ?? []).map((r: { kind: string; new_value: string }) => `${r.kind}|${r.new_value}`));
        fresh = events.filter(e => keys.has(`${e.kind}|${e.newValue}`));
        insertedIds = (inserted ?? []).map((r: { id: string }) => r.id);
    }

    let emailed = false;
    if (fresh.length > 0) {
        const result = await sendFlightEmail(row.user_id, fresh, snapshot, compensationNote(snapshot, fresh));
        emailed = result.email || result.telegram;
        if (insertedIds.length) {
            await supabase.from('flight_events').update({ notified_at: now.toISOString(), notify_result: result }).in('id', insertedIds);
        }

        // Severe news on a flight linked to a trip: let the disruption sentinel propose a Day 1 change.
        const severe = fresh.find(e => e.severe);
        if (severe && row.itinerary_id) {
            await runDisruptionSentinel({
                flight_iata: snapshot.flightNumber,
                airline_name: snapshot.airline?.name ?? 'Airline',
                departure_airport: snapshot.departure.iata ?? snapshot.departure.name,
                arrival_airport: snapshot.arrival.iata ?? snapshot.arrival.name,
                status: severe.kind === 'cancelled' ? 'cancelled' : severe.kind === 'diverted' ? 'diverted' : 'delayed',
                delay_minutes: departureDelay(snapshot) ?? 0,
                scheduled_departure: snapshot.departure.scheduledUtc ?? now.toISOString(),
                estimated_departure: snapshot.departure.revisedUtc ?? undefined,
                itinerary_id: row.itinerary_id,
            }).catch(err => console.error('[flight-watch] sentinel failed:', err));
        }
    }

    const delay = nextCheckDelayMs(snapshot, now);
    await supabase.from('tracked_flights').update({
        snapshot,
        notified,
        status: snapshot.status,
        dep_iata: snapshot.departure.iata,
        arr_iata: snapshot.arrival.iata,
        sched_dep_utc: snapshot.departure.scheduledUtc,
        sched_arr_utc: snapshot.arrival.scheduledUtc,
        last_checked_at: now.toISOString(),
        checks_count: row.checks_count + 1,
        next_check_at: new Date(now.getTime() + (delay ?? 0)).toISOString(),
        active: delay !== null,
        updated_at: now.toISOString(),
    }).eq('id', row.id);

    return { id: row.id, status: snapshot.status, events: fresh.length, emailed, stopped: delay === null };
}
