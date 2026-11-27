/** Shapes returned by /api/flights/* and used across the Live flights UI. */

export interface Aircraft {
    hex: string;
    callsign: string | null;
    flightNo: string | null;
    reg: string | null;
    type: string | null;
    lat: number;
    lon: number;
    alt: number | null;
    ground: boolean;
    speed: number | null;
    track: number | null;
    vrate: number | null;
    squawk: string | null;
    military: boolean;
    emergency: string | null;
    mlat: boolean;
    seenPos: number;
}

/** Aircraft plus the browser-side time its position was valid (for dead reckoning and staleness). */
export interface TrackedAircraft extends Aircraft {
    posAt: number;
}

export interface Airport {
    iata: string;
    icao: string;
    name: string;
    city: string;
    country: string;
    lat: number;
    lon: number;
    size: 1 | 2;
}

export interface RouteAirport { iata: string | null; icao: string | null; name: string; city: string | null; country: string | null; lat: number; lon: number }

export interface FlightDetails {
    route: {
        callsign: string;
        flightNumber: string | null;
        airline: { name: string; iata: string | null; icao: string | null; country: string | null } | null;
        origin: RouteAirport;
        destination: RouteAirport;
    } | null;
    aircraft: {
        type: string | null; icaoType: string | null; manufacturer: string | null; registration: string | null;
        owner: string | null; ownerCountry: string | null; photo: string | null;
        photoLink: string | null; photographer: string | null; photoSource: 'planespotters' | 'airport-data' | null;
    } | null;
}

export interface AirportLive {
    weather: {
        raw: string; observedAt: string | null; tempC: number | null; dewpointC: number | null;
        windDir: number | string | null; windKt: number | null; gustKt: number | null;
        visibility: string | number | null; pressureHpa: number | null; category: string | null;
    } | null;
    traffic: { arriving: Aircraft[]; departing: Aircraft[]; onGround: number; total: number } | null;
}

export type Selection = { kind: 'flight'; hex: string } | { kind: 'airport'; airport: Airport } | null;

/** Positions older than this are drawn faded; older than STALE_DROP_S they are removed. */
export const STALE_FADE_S = 30;
export const STALE_DROP_S = 60;
