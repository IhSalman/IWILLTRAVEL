/**
 * Decides what a traveller should be told when a tracked flight changes.
 * Pure functions (no I/O) so the rules are unit-tested: src/lib/flight-status/diff.test.ts.
 *
 * `notified` remembers what the user was last told (per kind), so we alert on meaningful
 * changes only: e.g. a delay that moves by 15+ minutes, not every 2-minute wobble.
 */
import {
    AIRBORNE, PRE_DEPARTURE, departureDelay, arrivalDelay, bestDepartureUtc, localClock, localClockForUtc, minutesBetween,
    type FlightSnapshot,
} from './types';

export type AlertKind =
    | 'delay' | 'gate' | 'terminal' | 'cancelled' | 'diverted' | 'departed' | 'landed' | 'aircraft_swap' | 'belt'
    | 'checkin_reminder' | 'day_of_travel';

export interface AlertPrefs {
    kinds: Record<AlertKind, boolean>;
    /** Only alert for departure delays of at least this many minutes. */
    minDelayMinutes: number;
}

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
    kinds: {
        delay: true, gate: true, terminal: true, cancelled: true, diverted: true,
        departed: false, landed: true, aircraft_swap: true, belt: true,
        checkin_reminder: true, day_of_travel: true,
    },
    minDelayMinutes: 15,
};

export function resolvePrefs(raw: unknown): AlertPrefs {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AlertPrefs>;
    const kinds = { ...DEFAULT_ALERT_PREFS.kinds };
    if (r.kinds && typeof r.kinds === 'object') {
        for (const k of Object.keys(kinds) as AlertKind[]) {
            if (typeof (r.kinds as Record<string, unknown>)[k] === 'boolean') kinds[k] = (r.kinds as Record<AlertKind, boolean>)[k];
        }
    }
    const min = Number(r.minDelayMinutes);
    return { kinds, minDelayMinutes: Number.isFinite(min) && min >= 5 && min <= 240 ? Math.round(min) : DEFAULT_ALERT_PREFS.minDelayMinutes };
}

/** What the user has already been told. Stored in tracked_flights.notified. */
export interface NotifiedState {
    delayMin?: number;
    gate?: string;
    terminal?: string;
    status?: string;
    aircraft?: string;
    belt?: string;
    departed?: boolean;
    landed?: boolean;
    checkin?: boolean;
    dayOf?: boolean;
}

export interface FlightEvent {
    kind: AlertKind;
    oldValue: string | null;
    /** Distinct per real change; (flight, kind, newValue) is unique in the database. */
    newValue: string;
    title: string;
    detail: string;
    /** Worth replanning the trip (feeds the disruption sentinel). */
    severe?: boolean;
}

/** Changes smaller than this (after the first delay alert) are not worth another email. */
export const DELAY_STEP_MINUTES = 15;

const normModel = (m: string | null | undefined) => (m ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function depClock(s: FlightSnapshot): string | null {
    const d = s.departure;
    return localClock(d.revisedLocal) ?? localClockForUtc(d.revisedUtc ?? d.predictedUtc, d) ?? localClock(d.scheduledLocal);
}

function where(s: FlightSnapshot): string {
    const d = s.departure.iata ?? s.departure.name;
    const a = s.arrival.iata ?? s.arrival.name;
    return `${d} → ${a}`;
}

/**
 * Compare the latest snapshot with what the user knows.
 * `isFirst`: the first snapshot after the user started tracking. Only urgent news
 * (cancellation, diversion, an existing delay) is sent then; the rest becomes the baseline.
 */
export function diffSnapshots(
    next: FlightSnapshot,
    notified: NotifiedState,
    prefs: AlertPrefs,
    isFirst: boolean,
): { events: FlightEvent[]; notified: NotifiedState } {
    const events: FlightEvent[] = [];
    const n: NotifiedState = { ...notified };
    const fn = next.flightNumber;
    const route = where(next);
    const want = (k: AlertKind) => prefs.kinds[k];

    // ── Cancellation / diversion ────────────────────────────────────────────
    if ((next.status === 'cancelled' || next.status === 'cancelled_uncertain') && n.status !== next.status && n.status !== 'cancelled') {
        const certain = next.status === 'cancelled';
        if (want('cancelled')) {
            events.push({
                kind: 'cancelled',
                oldValue: n.status ?? null,
                newValue: next.status,
                title: certain ? `${fn} has been cancelled` : `${fn} may be cancelled`,
                detail: certain
                    ? `Your flight ${fn} (${route}) is shown as cancelled. Contact ${next.airline?.name ?? 'the airline'} about rebooking or a refund.`
                    : `${next.airline?.name ?? 'The airline'} hasn't confirmed it yet, but ${fn} (${route}) may be cancelled. Check with the airline before going to the airport.`,
                severe: certain,
            });
        }
        n.status = next.status;
        return { events, notified: n };
    }

    if (next.status === 'diverted' && n.status !== 'diverted') {
        if (want('diverted')) {
            events.push({
                kind: 'diverted',
                oldValue: n.status ?? null,
                newValue: `diverted:${next.arrival.iata ?? next.arrival.name}`,
                title: `${fn} has been diverted`,
                detail: `Flight ${fn} has been diverted${next.arrival.name ? ` and is now expected at ${next.arrival.name}` : ''}. Follow the crew's instructions and check with ${next.airline?.name ?? 'the airline'} about onward travel.`,
                severe: true,
            });
        }
        n.status = 'diverted';
    }

    // ── Departure delay (before take-off only) ─────────────────────────────
    const preDeparture = PRE_DEPARTURE.includes(next.status) && !next.departure.runwayUtc && !next.adsb?.airborne;
    const delay = departureDelay(next);
    if (preDeparture && delay !== null) {
        const last = n.delayMin ?? 0;
        const wasDelayed = last >= prefs.minDelayMinutes;
        const isDelayed = delay >= prefs.minDelayMinutes;
        const newTime = depClock(next) ?? 'a later time';
        const estIso = bestDepartureUtc(next) ?? String(delay);
        if (isDelayed && (!wasDelayed || Math.abs(delay - last) >= DELAY_STEP_MINUTES)) {
            if (want('delay')) {
                const better = wasDelayed && delay < last;
                events.push({
                    kind: 'delay',
                    oldValue: wasDelayed ? String(last) : null,
                    newValue: `${delay}@${estIso}`,
                    title: better
                        ? `${fn} delay reduced to ${formatMinutes(delay)} — now departs ${newTime}`
                        : `${fn} delayed ${formatMinutes(delay)} — now departs ${newTime}`,
                    detail: `${route}: new estimated departure ${newTime} (local time)${next.departure.gate ? `, gate ${next.departure.gate}` : ''}. Times can still change; we'll email you if it moves again.`,
                    severe: delay >= 60,
                });
            }
            n.delayMin = delay;
        } else if (!isDelayed && wasDelayed && delay <= 5) {
            if (want('delay')) {
                events.push({
                    kind: 'delay',
                    oldValue: String(last),
                    newValue: `ontime@${estIso}`,
                    title: `${fn} is back on time`,
                    detail: `${route} is now expected to leave on time at ${newTime} (local time).`,
                });
            }
            n.delayMin = delay;
        } else if (isFirst) {
            n.delayMin = delay;
        }
    }

    // ── Gate / terminal ─────────────────────────────────────────────────────
    const gate = next.departure.gate;
    if (gate && gate !== n.gate && preDeparture) {
        if (!isFirst && want('gate')) {
            events.push({
                kind: 'gate',
                oldValue: n.gate ?? null,
                newValue: gate,
                title: n.gate ? `${fn} gate changed to ${gate}` : `${fn} departs from gate ${gate}`,
                detail: n.gate
                    ? `Your gate moved from ${n.gate} to ${gate}${next.departure.terminal ? ` (terminal ${next.departure.terminal})` : ''}.`
                    : `Gate ${gate}${next.departure.terminal ? `, terminal ${next.departure.terminal}` : ''}. Departure ${depClock(next) ?? ''} local time.`,
            });
        }
        n.gate = gate;
    }
    const terminal = next.departure.terminal;
    if (terminal && terminal !== n.terminal && preDeparture) {
        if (!isFirst && n.terminal && want('terminal')) {
            events.push({
                kind: 'terminal',
                oldValue: n.terminal,
                newValue: terminal,
                title: `${fn} now leaves from terminal ${terminal}`,
                detail: `Your departure terminal changed from ${n.terminal} to ${terminal}. Allow extra time to get there.`,
            });
        }
        n.terminal = terminal;
    }

    // ── Aircraft swap ───────────────────────────────────────────────────────
    const model = next.aircraft?.model ?? null;
    if (model) {
        if (n.aircraft && normModel(n.aircraft) !== normModel(model) && !isFirst && preDeparture && want('aircraft_swap')) {
            events.push({
                kind: 'aircraft_swap',
                oldValue: n.aircraft,
                newValue: model,
                title: `${fn} will now fly on a ${model}`,
                detail: `The aircraft for ${fn} changed from ${n.aircraft} to ${model}. Seat maps and seat numbers can change after a swap, so check your seat in the airline's app.`,
            });
        }
        n.aircraft = model;
    }

    // ── Departed / landed / baggage belt ────────────────────────────────────
    const airborne = AIRBORNE.includes(next.status) || !!next.departure.runwayUtc || !!next.adsb?.airborne;
    if (airborne && !n.departed && next.status !== 'landed') {
        if (!isFirst && want('departed')) {
            const late = departureDelay(next);
            events.push({
                kind: 'departed',
                oldValue: null,
                newValue: 'departed',
                title: `${fn} has taken off`,
                detail: `${route} departed${late !== null && late > 5 ? ` ${formatMinutes(late)} late` : ''}. Expected arrival ${localClock(next.arrival.revisedLocal) ?? localClock(next.arrival.scheduledLocal) ?? 'on schedule'} local time.`,
            });
        }
        n.departed = true;
    }

    if (next.status === 'landed' && !n.landed) {
        n.departed = true;
        const belt = next.arrival.baggageBelt;
        if (!isFirst && want('landed')) {
            const late = arrivalDelay(next);
            events.push({
                kind: 'landed',
                oldValue: null,
                newValue: 'landed',
                title: `${fn} has landed in ${next.arrival.city ?? next.arrival.iata ?? 'your destination'}`,
                detail: `Arrived ${localClock(next.arrival.revisedLocal) ?? ''} local time${late !== null && late > 5 ? `, ${formatMinutes(late)} late` : late !== null && late < -5 ? `, ${formatMinutes(-late)} early` : ''}.${belt ? ` Bags on belt ${belt}.` : ''}`,
            });
        }
        n.landed = true;
        if (belt) n.belt = belt;
    }

    const belt = next.arrival.baggageBelt;
    if (belt && belt !== n.belt && (next.status === 'landed' || next.status === 'approaching')) {
        if (!isFirst && want('belt')) {
            events.push({
                kind: 'belt',
                oldValue: n.belt ?? null,
                newValue: belt,
                title: `${fn} bags: belt ${belt}`,
                detail: `Baggage for ${fn} will be on belt ${belt} at ${next.arrival.name}.`,
            });
        }
        n.belt = belt;
    }

    if (!n.status || (next.status !== n.status && next.status !== 'unknown')) n.status = next.status;
    return { events, notified: n };
}

/**
 * Time-based reminders: online check-in ~24h before departure and a day-of-travel summary ~3h before.
 */
export function reminderEvents(s: FlightSnapshot, notified: NotifiedState, prefs: AlertPrefs, now: Date): { events: FlightEvent[]; notified: NotifiedState } {
    const events: FlightEvent[] = [];
    const n = { ...notified };
    if (!PRE_DEPARTURE.includes(s.status)) return { events, notified: n };
    const dep = bestDepartureUtc(s);
    const minsToDep = minutesBetween(now.toISOString(), dep);
    if (minsToDep === null || minsToDep <= 0) return { events, notified: n };
    const fn = s.flightNumber;

    if (!n.checkin && minsToDep <= 24 * 60 && minsToDep > 3 * 60) {
        if (prefs.kinds.checkin_reminder) {
            events.push({
                kind: 'checkin_reminder',
                oldValue: null,
                newValue: s.departure.scheduledUtc ?? 'checkin',
                title: `Check in for ${fn}`,
                detail: `${where(s)} leaves tomorrow at ${localClock(s.departure.scheduledLocal) ?? ''} local time. Most airlines open online check-in 24 hours before departure.`,
            });
        }
        n.checkin = true;
    }

    if (!n.dayOf && minsToDep <= 3 * 60) {
        if (prefs.kinds.day_of_travel) {
            const d = s.departure;
            const bits = [
                `Departs ${depClock(s) ?? localClock(d.scheduledLocal) ?? ''} local time`,
                d.terminal ? `terminal ${d.terminal}` : null,
                d.gate ? `gate ${d.gate}` : null,
                d.checkInDesk ? `check-in desk ${d.checkInDesk}` : null,
            ].filter(Boolean);
            const delay = departureDelay(s);
            events.push({
                kind: 'day_of_travel',
                oldValue: null,
                newValue: s.departure.scheduledUtc ?? 'dayof',
                title: `Today: ${fn} to ${s.arrival.city ?? s.arrival.iata ?? 'your destination'}`,
                detail: `${bits.join(', ')}.${delay !== null && delay >= prefs.minDelayMinutes ? ` Currently ${formatMinutes(delay)} late.` : ' Currently on time.'}`,
            });
        }
        n.dayOf = true;
        n.checkin = true;
    }
    return { events, notified: n };
}

export function formatMinutes(min: number): string {
    const m = Math.abs(Math.round(min));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
}

/**
 * When to check a tracked flight again. Tightens as departure approaches; null = stop tracking.
 *   > 24h before departure → every 6h · 3–24h → hourly · < 3h until landing → every 10 min
 */
export function nextCheckDelayMs(s: FlightSnapshot | null, now: Date, checksWithoutData = 0): number | null {
    const MIN = 60_000;
    if (!s) return checksWithoutData >= 6 ? null : 60 * MIN;
    if (s.status === 'cancelled') return null;

    const arrival = s.arrival.runwayUtc ?? s.arrival.revisedUtc ?? s.arrival.scheduledUtc;
    if (s.status === 'landed') {
        // One more look for the baggage belt, then stop.
        const sinceLanding = minutesBetween(arrival, now.toISOString());
        if (s.arrival.baggageBelt || (sinceLanding !== null && sinceLanding > 45)) return null;
        return 10 * MIN;
    }
    if (arrival && minutesBetween(arrival, now.toISOString())! > 12 * 60) return null; // long past

    const minsToDep = minutesBetween(now.toISOString(), bestDepartureUtc(s));
    if (minsToDep === null) return 60 * MIN;
    if (minsToDep > 24 * 60) return Math.min(6 * 60, minsToDep - 24 * 60 + 1) * MIN;
    if (minsToDep > 3 * 60) return Math.min(60, minsToDep - 3 * 60 + 1) * MIN;
    if (AIRBORNE.includes(s.status) || s.departure.runwayUtc) {
        // In the air: arrival-time changes matter; 10 min close to landing, else 20.
        const minsToArr = minutesBetween(now.toISOString(), arrival);
        return (minsToArr !== null && minsToArr < 45 ? 10 : 20) * MIN;
    }
    return 10 * MIN;
}
