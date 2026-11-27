/**
 * Provider-neutral flight status shapes. AeroDataBox is the first provider
 * (src/lib/flight-status/aerodatabox.ts); others can map into the same types.
 */

export type FlightStatusCode =
    | 'scheduled'
    | 'delayed'
    | 'check_in'
    | 'boarding'
    | 'gate_closed'
    | 'departed'
    | 'en_route'
    | 'approaching'
    | 'landed'
    | 'cancelled'
    | 'cancelled_uncertain'
    | 'diverted'
    | 'unknown';

export interface FlightMovement {
    iata: string | null;
    icao: string | null;
    name: string;
    city: string | null;
    countryCode: string | null;
    lat: number | null;
    lon: number | null;
    timeZone: string | null;
    /** ISO UTC times. "revised" is the airline's estimate/actual; "runway" is actual take-off/landing. */
    scheduledUtc: string | null;
    revisedUtc: string | null;
    predictedUtc: string | null;
    runwayUtc: string | null;
    /** Local wall-clock times as the provider gives them ("2026-11-27 08:05+00:00"). */
    scheduledLocal: string | null;
    revisedLocal: string | null;
    terminal: string | null;
    gate: string | null;
    checkInDesk: string | null;
    baggageBelt: string | null;
    /** Provider has live (not just schedule) data for this movement. */
    live: boolean;
}

export interface FlightSnapshot {
    flightNumber: string;
    callsign: string | null;
    airline: { name: string; iata: string | null; icao: string | null } | null;
    status: FlightStatusCode;
    departure: FlightMovement;
    arrival: FlightMovement;
    aircraft: { model: string | null; reg: string | null; modeS: string | null } | null;
    isCargo: boolean;
    lastUpdatedUtc: string | null;
    fetchedAt: string;
    source: string;
    /** Set when a free ADS-B check saw the aircraft airborne before the provider updated. */
    adsb?: { airborne: boolean; lat: number; lon: number; alt: number | null; seenAt: string } | null;
}

export interface BoardFlight {
    number: string;
    callsign: string | null;
    airline: string | null;
    status: FlightStatusCode;
    /** The other end of the flight (destination for departures, origin for arrivals). */
    otherAirport: { iata: string | null; name: string; city: string | null };
    scheduledLocal: string | null;
    revisedLocal: string | null;
    scheduledUtc: string | null;
    revisedUtc: string | null;
    terminal: string | null;
    gate: string | null;
    baggageBelt: string | null;
    aircraftModel: string | null;
    aircraftReg: string | null;
    isCargo: boolean;
}

export interface AirportBoard {
    departures: BoardFlight[];
    arrivals: BoardFlight[];
    fetchedAt: string;
}

export interface FlightStatusProvider {
    readonly name: string;
    /** All legs of a flight number on a local departure date ("BA123", "2026-11-27"). */
    getFlight(flightNumber: string, dateLocal: string): Promise<FlightSnapshot[]>;
    /** Departures and arrivals from `offsetMinutes` relative to now, for `durationMinutes` (max 720). */
    getAirportBoard(iata: string, offsetMinutes: number, durationMinutes: number): Promise<AirportBoard>;
}

// ── Small pure helpers shared by diff, emails and UI ─────────────────────────

export const PRE_DEPARTURE: FlightStatusCode[] = ['scheduled', 'delayed', 'check_in', 'boarding', 'gate_closed', 'unknown'];
export const AIRBORNE: FlightStatusCode[] = ['departed', 'en_route', 'approaching'];

export function minutesBetween(fromIso: string | null, toIso: string | null): number | null {
    if (!fromIso || !toIso) return null;
    const a = Date.parse(fromIso), b = Date.parse(toIso);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.round((b - a) / 60000);
}

/** Departure delay in minutes (estimate or actual vs schedule); null when unknown. */
export function departureDelay(s: FlightSnapshot): number | null {
    const d = s.departure;
    return minutesBetween(d.scheduledUtc, d.runwayUtc ?? d.revisedUtc ?? d.predictedUtc);
}

export function arrivalDelay(s: FlightSnapshot): number | null {
    const a = s.arrival;
    return minutesBetween(a.scheduledUtc, a.runwayUtc ?? a.revisedUtc ?? a.predictedUtc);
}

/** Best-known departure time (actual > revised > predicted > scheduled), ISO UTC. */
export function bestDepartureUtc(s: FlightSnapshot): string | null {
    const d = s.departure;
    return d.runwayUtc ?? d.revisedUtc ?? d.predictedUtc ?? d.scheduledUtc;
}

export function bestArrivalUtc(s: FlightSnapshot): string | null {
    const a = s.arrival;
    return a.runwayUtc ?? a.revisedUtc ?? a.predictedUtc ?? a.scheduledUtc;
}

/** "2026-11-27 08:05+01:00" → "08:05" (airport local time, no timezone maths needed). */
export function localClock(local: string | null | undefined): string | null {
    const m = local?.match(/[ T](\d{2}:\d{2})/);
    return m ? m[1] : null;
}

/** Local clock for a UTC instant, using the airport's offset from its scheduled local time. */
export function localClockForUtc(utc: string | null, ref: { scheduledUtc: string | null; scheduledLocal: string | null }): string | null {
    if (!utc) return null;
    const off = ref.scheduledLocal?.match(/([+-])(\d{2}):(\d{2})$/);
    const t = Date.parse(utc);
    if (!Number.isFinite(t)) return null;
    const offsetMin = off ? (off[1] === '-' ? -1 : 1) * (Number(off[2]) * 60 + Number(off[3])) : 0;
    const d = new Date(t + offsetMin * 60000);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** "BA 0123" / "ba123" → "BA123". */
export function normalizeFlightNumber(input: string): string {
    const q = input.toUpperCase().replace(/[\s-]+/g, '');
    const m = q.match(/^([A-Z0-9]{2,3}?)(\d{1,4})([A-Z]?)$/);
    if (!m) return q;
    return `${m[1]}${String(Number(m[2]))}${m[3]}`;
}

/** Short status words for badges (pure, safe for client components). */
export function statusLabel(s: FlightSnapshot | null): string {
    if (!s) return 'Waiting for data';
    const delay = departureDelay(s);
    switch (s.status) {
        case 'cancelled': return 'Cancelled';
        case 'cancelled_uncertain': return 'May be cancelled';
        case 'diverted': return 'Diverted';
        case 'landed': return 'Landed';
        default:
            if (AIRBORNE.includes(s.status) || s.adsb?.airborne) return 'In the air';
            if (delay !== null && delay >= 15) return `Delayed ${delay} min`;
            return s.status === 'boarding' ? 'Boarding' : s.status === 'gate_closed' ? 'Gate closed' : 'On time';
    }
}
