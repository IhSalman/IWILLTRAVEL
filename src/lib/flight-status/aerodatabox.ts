/**
 * AeroDataBox client (flight status, airport departure/arrival boards).
 * Docs: https://doc.aerodatabox.com — API.Market spec v1.15.
 *
 * Env:
 *   AERODATABOX_API_KEY   key from API.Market (default) or RapidAPI
 *   AERODATABOX_MARKET    "api.market" (default) | "rapidapi"
 */
import type { AirportBoard, BoardFlight, FlightMovement, FlightSnapshot, FlightStatusCode, FlightStatusProvider } from './types';

const BASES = {
    'api.market': 'https://prod.api.market/api/v1/aedbx/aerodatabox',
    rapidapi: 'https://aerodatabox.p.rapidapi.com',
} as const;

const STATUS_MAP: Record<string, FlightStatusCode> = {
    Unknown: 'unknown',
    Expected: 'scheduled',
    EnRoute: 'en_route',
    CheckIn: 'check_in',
    Boarding: 'boarding',
    GateClosed: 'gate_closed',
    Departed: 'departed',
    Delayed: 'delayed',
    Approaching: 'approaching',
    Arrived: 'landed',
    Canceled: 'cancelled',
    CanceledUncertain: 'cancelled_uncertain',
    Diverted: 'diverted',
};

/** "2026-11-27 08:05Z" → "2026-11-27T08:05:00.000Z" */
function isoUtc(v: unknown): string | null {
    if (typeof v !== 'string' || !v) return null;
    const t = Date.parse(v.replace(' ', 'T'));
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function movement(m: any): FlightMovement {
    const ap = m?.airport ?? {};
    const quality: unknown[] = Array.isArray(m?.quality) ? m.quality : [];
    return {
        iata: str(ap.iata),
        icao: str(ap.icao),
        name: str(ap.name) ?? str(ap.shortName) ?? 'Unknown airport',
        city: str(ap.municipalityName),
        countryCode: str(ap.countryCode),
        lat: numOrNull(ap.location?.lat),
        lon: numOrNull(ap.location?.lon),
        timeZone: str(ap.timeZone),
        scheduledUtc: isoUtc(m?.scheduledTime?.utc),
        revisedUtc: isoUtc(m?.revisedTime?.utc),
        predictedUtc: isoUtc(m?.predictedTime?.utc),
        runwayUtc: isoUtc(m?.runwayTime?.utc),
        scheduledLocal: str(m?.scheduledTime?.local),
        revisedLocal: str(m?.revisedTime?.local),
        terminal: str(m?.terminal),
        gate: str(m?.gate),
        checkInDesk: str(m?.checkInDesk),
        baggageBelt: str(m?.baggageBelt),
        live: quality.includes('Live'),
    };
}

export function mapFlight(f: any, fetchedAt = new Date().toISOString()): FlightSnapshot {
    return {
        flightNumber: String(f?.number ?? '').replace(/\s+/g, ''),
        callsign: str(f?.callSign),
        airline: f?.airline?.name ? { name: f.airline.name, iata: str(f.airline.iata), icao: str(f.airline.icao) } : null,
        status: STATUS_MAP[f?.status] ?? 'unknown',
        departure: movement(f?.departure),
        arrival: movement(f?.arrival),
        aircraft: f?.aircraft ? { model: str(f.aircraft.model), reg: str(f.aircraft.reg), modeS: str(f.aircraft.modeS) } : null,
        isCargo: !!f?.isCargo,
        lastUpdatedUtc: isoUtc(f?.lastUpdatedUtc),
        fetchedAt,
        source: 'aerodatabox',
    };
}

function boardItem(item: any, direction: 'departure' | 'arrival'): BoardFlight {
    // withLeg=true: `departure` and `arrival` are both present; "here" is the side of the board.
    const here = movement(direction === 'departure' ? item?.departure : item?.arrival);
    const other = movement(direction === 'departure' ? item?.arrival : item?.departure);
    return {
        number: String(item?.number ?? '').replace(/\s+/g, ''),
        callsign: str(item?.callSign),
        airline: str(item?.airline?.name),
        status: STATUS_MAP[item?.status] ?? 'unknown',
        otherAirport: { iata: other.iata, name: other.name, city: other.city },
        scheduledLocal: here.scheduledLocal,
        revisedLocal: here.revisedLocal,
        scheduledUtc: here.scheduledUtc,
        revisedUtc: here.revisedUtc ?? here.runwayUtc,
        terminal: here.terminal,
        gate: here.gate,
        baggageBelt: here.baggageBelt,
        aircraftModel: str(item?.aircraft?.model),
        aircraftReg: str(item?.aircraft?.reg),
        isCargo: !!item?.isCargo,
    };
}

export class AeroDataBoxProvider implements FlightStatusProvider {
    readonly name = 'aerodatabox';
    private base: string;
    private headers: Record<string, string>;

    constructor(apiKey: string, market: string = 'api.market') {
        if (market === 'rapidapi') {
            this.base = BASES.rapidapi;
            this.headers = { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' };
        } else {
            this.base = BASES['api.market'];
            this.headers = { 'x-api-market-key': apiKey };
        }
    }

    private async get(path: string): Promise<any | null> {
        const res = await fetch(`${this.base}${path}`, {
            headers: { ...this.headers, Accept: 'application/json' },
            signal: AbortSignal.timeout(12_000),
            cache: 'no-store',
        });
        // One line per billable call, so spend can be counted from the logs.
        console.info(`[aerodatabox] ${res.status} ${path.split('?')[0]}`);
        if (res.status === 204 || res.status === 404) return null;
        if (!res.ok) throw new Error(`AeroDataBox responded ${res.status}`);
        return res.json();
    }

    async getFlight(flightNumber: string, dateLocal: string): Promise<FlightSnapshot[]> {
        if (!/^[A-Z0-9]{3,8}$/.test(flightNumber) || !/^\d{4}-\d{2}-\d{2}$/.test(dateLocal)) return [];
        const json = await this.get(
            `/flights/number/${flightNumber}/${dateLocal}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false`,
        );
        if (!Array.isArray(json)) return [];
        const fetchedAt = new Date().toISOString();
        return json.map(f => mapFlight(f, fetchedAt));
    }

    async getAirportBoard(iata: string, offsetMinutes: number, durationMinutes: number): Promise<AirportBoard> {
        const empty: AirportBoard = { departures: [], arrivals: [], fetchedAt: new Date().toISOString() };
        if (!/^[A-Z0-9]{3}$/.test(iata)) return empty;
        const offset = Math.round(Math.max(-1440, Math.min(1440, offsetMinutes)));
        const duration = Math.round(Math.max(30, Math.min(720, durationMinutes)));
        // Relative window (no airport timezone maths needed); the API allows up to 12h.
        const json = await this.get(
            `/flights/airports/iata/${iata}?offsetMinutes=${offset}&durationMinutes=${duration}&direction=Both&withLeg=true&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false&withLocation=false`,
        );
        if (!json) return empty;
        return {
            departures: Array.isArray(json.departures) ? json.departures.map((d: any) => boardItem(d, 'departure')) : [],
            arrivals: Array.isArray(json.arrivals) ? json.arrivals.map((a: any) => boardItem(a, 'arrival')) : [],
            fetchedAt: empty.fetchedAt,
        };
    }
}
