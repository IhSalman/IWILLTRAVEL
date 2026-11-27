/**
 * Free, open flight data used by the Live Flights map.
 *
 * - Live aircraft positions: adsb.lol (community ADS-B network, ODbL licence, no key).
 * - Flight route + aircraft details: adsbdb.com (free, no key).
 * - Airport weather (METAR): aviationweather.gov (US NOAA, public domain).
 * - Airport list: OurAirports (public domain), pre-built into public/data/airports.json.
 *
 * All calls run on the server so browsers never hit these services directly,
 * and responses can be shared through the CDN cache.
 */
import { cached } from '@/utils/cache';
import { callsignsForFlightNumber, flightNumberForCallsign, parseFlightNumber } from '@/lib/airlines';
import { getSiteUrl } from '@/utils/site-url';

const ADSB_LOL = 'https://api.adsb.lol';
const ADSBDB = 'https://api.adsbdb.com/v0';
const AVWX = 'https://aviationweather.gov/api/data';
const UA = 'iWillTravel-LiveFlights/1.0';

export const CALLSIGN_RE = /^[A-Z0-9]{2,8}$/;
export const HEX_RE = /^[0-9A-F]{6}$/;
export const ICAO_RE = /^[A-Z0-9]{3,4}$/;
export const MAX_RADIUS_NM = 250;

export interface LiveAircraft {
    hex: string;
    callsign: string | null;
    /** Ticket-style flight number derived from the callsign (BAW123 → BA123), when possible. */
    flightNo: string | null;
    reg: string | null;
    type: string | null;
    lat: number;
    lon: number;
    /** Barometric altitude in feet; null when on the ground. */
    alt: number | null;
    ground: boolean;
    /** Ground speed, knots. */
    speed: number | null;
    /** Track over ground, degrees. */
    track: number | null;
    /** Vertical rate, ft/min. */
    vrate: number | null;
    squawk: string | null;
    military: boolean;
    emergency: string | null;
    /** Position comes from multilateration (ground stations), not the aircraft's own GPS. */
    mlat: boolean;
    /** Seconds since the position was received, at fetch time. */
    seenPos: number;
}

async function getJson<T>(url: string, timeoutMs = 8000): Promise<T> {
    const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
    return res.json() as Promise<T>;
}

/** adsb.lol asked us to slow down (HTTP 429); callers fall back to recent cached data. */
export class UpstreamBusyError extends Error {}

// adsb.lol is a free community service with a burst rate limit (429 + Retry-After).
// Keep at most a few requests in flight per instance and honour Retry-After globally.
const ADSB_CONCURRENCY = 4;
let adsbActive = 0;
const adsbQueue: (() => void)[] = [];
let adsbBackoffUntil = 0;

async function adsbJson<T>(path: string, timeoutMs = 7000): Promise<T> {
    if (Date.now() < adsbBackoffUntil) throw new UpstreamBusyError('adsb.lol rate limit');
    if (adsbActive >= ADSB_CONCURRENCY) await new Promise<void>(resolve => adsbQueue.push(resolve));
    adsbActive++;
    try {
        if (Date.now() < adsbBackoffUntil) throw new UpstreamBusyError('adsb.lol rate limit');
        const res = await fetch(`${ADSB_LOL}${path}`, {
            headers: { 'User-Agent': UA, Accept: 'application/json' },
            signal: AbortSignal.timeout(timeoutMs),
            cache: 'no-store',
        });
        if (res.status === 429) {
            const retryAfter = Number(res.headers.get('retry-after'));
            adsbBackoffUntil = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) : 10) * 1000;
            throw new UpstreamBusyError('adsb.lol rate limit');
        }
        if (!res.ok) throw new Error(`adsb.lol responded ${res.status}`);
        return (await res.json()) as T;
    } finally {
        adsbActive--;
        adsbQueue.shift()?.();
    }
}

/** Cached aircraft served late: age their position so clients don't treat them as fresh. */
function aged(data: LiveAircraft[], fetchedAt: number): LiveAircraft[] {
    const extra = Math.round((Date.now() - fetchedAt) / 1000);
    return extra <= 0 ? data : data.map(ac => ({ ...ac, seenPos: ac.seenPos + extra }));
}

function num(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function normalize(ac: Record<string, unknown>): LiveAircraft | null {
    const lat = num(ac.lat);
    const lon = num(ac.lon);
    const hex = typeof ac.hex === 'string' ? ac.hex.toUpperCase() : '';
    // Skip stale positions (older than 60s) and anonymised "~" addresses without position.
    if (lat === null || lon === null || !hex) return null;
    if ((num(ac.seen_pos) ?? 0) > 60) return null;

    const ground = ac.alt_baro === 'ground';
    const callsign = typeof ac.flight === 'string' ? ac.flight.trim() || null : null;
    const emergency = typeof ac.emergency === 'string' && ac.emergency !== 'none' ? ac.emergency : null;
    const mlat = Array.isArray(ac.mlat) && ac.mlat.length > 0 || ac.type === 'mlat';
    return {
        hex: hex.replace(/^~/, ''),
        callsign,
        flightNo: flightNumberForCallsign(callsign),
        reg: typeof ac.r === 'string' ? ac.r : null,
        type: typeof ac.t === 'string' ? ac.t : null,
        lat,
        lon,
        alt: ground ? null : num(ac.alt_baro) ?? num(ac.alt_geom),
        ground,
        speed: num(ac.gs),
        track: num(ac.track) ?? num(ac.true_heading),
        vrate: num(ac.baro_rate) ?? num(ac.geom_rate),
        squawk: typeof ac.squawk === 'string' ? ac.squawk : null,
        military: ((num(ac.dbFlags) ?? 0) & 1) === 1,
        emergency,
        mlat,
        seenPos: Math.round(num(ac.seen_pos) ?? 0),
    };
}

function normalizeAll(list: unknown): LiveAircraft[] {
    if (!Array.isArray(list)) return [];
    const out: LiveAircraft[] = [];
    for (const ac of list) {
        const n = normalize(ac as Record<string, unknown>);
        if (n) out.push(n);
    }
    return out;
}

// Short in-process cache so many viewers of the same area share one upstream call.
const liveCache = new Map<string, { at: number; data: LiveAircraft[] }>();
const LIVE_TTL_MS = 8_000;
/** How old cached data may be when served because the upstream is busy or down. */
const LIVE_STALE_MS = 60_000;

/** All aircraft within `radiusNm` (max 250) of a point. */
export async function getAircraftNear(lat: number, lon: number, radiusNm: number): Promise<LiveAircraft[]> {
    const r = Math.max(5, Math.min(MAX_RADIUS_NM, Math.round(radiusNm)));
    const key = `${lat.toFixed(2)},${lon.toFixed(2)},${r}`;
    const hit = liveCache.get(key);
    if (hit && Date.now() - hit.at < LIVE_TTL_MS) return aged(hit.data, hit.at);

    const path = `/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${r}`;
    let json: { ac?: unknown[] };
    try {
        // One quick retry for dropped requests (not for rate limits).
        json = await adsbJson<{ ac?: unknown[] }>(path, 6000).catch(err => {
            if (err instanceof UpstreamBusyError) throw err;
            return adsbJson<{ ac?: unknown[] }>(path, 6000);
        });
    } catch (err) {
        if (hit && Date.now() - hit.at < LIVE_STALE_MS) return aged(hit.data, hit.at);
        throw err;
    }
    const data = normalizeAll(json.ac);
    liveCache.set(key, { at: Date.now(), data });
    if (liveCache.size > 500) {
        const cutoff = Date.now() - LIVE_STALE_MS;
        liveCache.forEach((v, k) => { if (v.at < cutoff) liveCache.delete(k); });
    }
    return data;
}

/**
 * Find live aircraft by ticket flight number (BA123), callsign (BAW123),
 * registration (G-XLEA) or ICAO hex (400A0F).
 */
export async function searchAircraft(query: string): Promise<LiveAircraft[]> {
    const q = query.trim().toUpperCase().replace(/\s+/g, '');
    const callsigns = new Set<string>();
    if (CALLSIGN_RE.test(q)) callsigns.add(q);
    if (parseFlightNumber(q)) {
        for (const cs of (await callsignsForFlightNumber(q)).slice(0, 3)) callsigns.add(cs);
    }
    const lookups: string[] = Array.from(callsigns).map(cs => `/v2/callsign/${cs}`);
    if (HEX_RE.test(q)) lookups.push(`/v2/hex/${q}`);
    if (/^[A-Z0-9-]{3,10}$/.test(q) && q.includes('-')) lookups.push(`/v2/reg/${q}`);
    if (lookups.length === 0) return [];

    const results = await Promise.allSettled(lookups.map(p => adsbJson<{ ac?: unknown[] }>(p)));
    if (results.every(r => r.status === 'rejected' && r.reason instanceof UpstreamBusyError)) {
        throw new UpstreamBusyError('adsb.lol rate limit');
    }
    const seen = new Set<string>();
    const out: LiveAircraft[] = [];
    for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const ac of normalizeAll(r.value.ac)) {
            if (seen.has(ac.hex)) continue;
            seen.add(ac.hex);
            out.push(ac);
        }
    }
    return out;
}

/** ICAO aircraft type designator, e.g. A388, B789, B74F. */
export const TYPE_CODE_RE = /^[A-Z0-9]{2,4}$/;
const typeCache = new Map<string, { at: number; data: LiveAircraft[] }>();
const TYPE_TTL_MS = 45_000;
const TYPE_STALE_MS = 3 * 60_000;

/** Every aircraft of the given ICAO types currently flying anywhere in the world (adsb.lol). */
export async function getAircraftByType(types: string[]): Promise<LiveAircraft[]> {
    const codes = Array.from(new Set(types.map(t => t.trim().toUpperCase()).filter(t => TYPE_CODE_RE.test(t)))).slice(0, 16);
    const results = await Promise.allSettled(codes.map(async code => {
        const hit = typeCache.get(code);
        if (hit && Date.now() - hit.at < TYPE_TTL_MS) return aged(hit.data, hit.at);
        try {
            const json = await adsbJson<{ ac?: unknown[] }>(`/v2/type/${code}`);
            const data = normalizeAll(json.ac);
            typeCache.set(code, { at: Date.now(), data });
            return data;
        } catch (err) {
            if (hit && Date.now() - hit.at < TYPE_STALE_MS) return aged(hit.data, hit.at);
            throw err;
        }
    }));
    const out: LiveAircraft[] = [];
    const seen = new Set<string>();
    for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const ac of r.value) {
            if (seen.has(ac.hex)) continue;
            seen.add(ac.hex);
            out.push(ac);
        }
    }
    if (out.length === 0 && results.every(r => r.status === 'rejected') && codes.length > 0) {
        throw new Error('Aircraft type search unavailable');
    }
    return out;
}

export interface RouteAirport {
    iata: string | null;
    icao: string | null;
    name: string;
    city: string | null;
    country: string | null;
    lat: number;
    lon: number;
}

export interface FlightDetails {
    route: {
        callsign: string;
        flightNumber: string | null;
        airline: { name: string; iata: string | null; icao: string | null; country: string | null } | null;
        origin: RouteAirport;
        destination: RouteAirport;
    } | null;
    aircraft: {
        type: string | null;
        icaoType: string | null;
        manufacturer: string | null;
        registration: string | null;
        owner: string | null;
        ownerCountry: string | null;
        photo: string | null;
        /** Page to credit/link the photo (Planespotters requires attribution). */
        photoLink: string | null;
        photographer: string | null;
        photoSource: 'planespotters' | 'airport-data' | null;
    } | null;
}

function toAirport(a: Record<string, any> | undefined): RouteAirport | null {
    if (!a || typeof a.latitude !== 'number' || typeof a.longitude !== 'number') return null;
    return {
        iata: a.iata_code || null,
        icao: a.icao_code || null,
        name: a.name || a.icao_code || 'Unknown airport',
        city: a.municipality || null,
        country: a.country_name || null,
        lat: a.latitude,
        lon: a.longitude,
    };
}

async function fetchRoute(callsign: string): Promise<FlightDetails['route']> {
    try {
        const json = await getJson<{ response?: any }>(`${ADSBDB}/callsign/${callsign}`);
        const fr = json.response?.flightroute;
        const origin = toAirport(fr?.origin);
        const destination = toAirport(fr?.destination);
        if (!fr || !origin || !destination) return null;
        return {
            callsign,
            flightNumber: fr.callsign_iata || null,
            airline: fr.airline
                ? { name: fr.airline.name, iata: fr.airline.iata || null, icao: fr.airline.icao || null, country: fr.airline.country || null }
                : null,
            origin,
            destination,
        };
    } catch {
        return null; // adsbdb returns 404 for unknown callsigns (private flights, cargo, etc.)
    }
}

interface PlanespottersPhoto { src: string; link: string; photographer: string | null }

/**
 * Aircraft photo from Planespotters (free API; requires a descriptive User-Agent with a
 * contact URL, and photos must credit the photographer and link back).
 */
async function fetchPlanespottersPhoto(hex: string, reg: string | null): Promise<PlanespottersPhoto | null> {
    const contact = process.env.PLANESPOTTERS_CONTACT_URL || getSiteUrl();
    const paths = [`hex/${hex}`, ...(reg && /^[A-Z0-9-]{3,10}$/i.test(reg) ? [`reg/${encodeURIComponent(reg)}`] : [])];
    for (const path of paths) {
        try {
            const res = await fetch(`https://api.planespotters.net/pub/photos/${path}`, {
                headers: { 'User-Agent': `iWillTravel-LiveFlights/1.0 (+${contact})`, Accept: 'application/json' },
                signal: AbortSignal.timeout(6000),
            });
            if (!res.ok) continue;
            const json = await res.json();
            const p = json?.photos?.[0];
            const src = p?.thumbnail_large?.src || p?.thumbnail?.src;
            if (typeof src === 'string' && src.startsWith('https://') && typeof p.link === 'string') {
                return { src, link: p.link, photographer: typeof p.photographer === 'string' ? p.photographer : null };
            }
        } catch { /* try next */ }
    }
    return null;
}

async function fetchAircraft(hex: string): Promise<FlightDetails['aircraft']> {
    let a: any = null;
    try {
        const json = await getJson<{ response?: any }>(`${ADSBDB}/aircraft/${hex}`);
        a = json.response?.aircraft ?? null;
    } catch { /* unknown airframe: still try for a photo */ }

    const registration: string | null = a?.registration || null;
    const ps = await fetchPlanespottersPhoto(hex, registration);
    const fallbackPhoto = typeof a?.url_photo === 'string' && a.url_photo.startsWith('https://') ? a.url_photo : null;
    if (!a && !ps) return null;

    return {
        type: a?.type || null,
        icaoType: a?.icao_type || null,
        manufacturer: a?.manufacturer || null,
        registration,
        owner: a?.registered_owner || null,
        ownerCountry: a?.registered_owner_country_name || null,
        photo: ps?.src ?? fallbackPhoto,
        photoLink: ps?.link ?? null,
        photographer: ps?.photographer ?? null,
        photoSource: ps ? 'planespotters' : fallbackPhoto ? 'airport-data' : null,
    };
}

const HALF_DAY = 12 * 60 * 60 * 1000;
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Route (origin → destination, airline) and airframe details. Cached: routes 12h, airframes 7d. */
export async function getFlightDetails(callsign: string | null, hex: string | null): Promise<FlightDetails> {
    const [route, aircraft] = await Promise.all([
        callsign ? cached(`flight-route:${callsign}`, HALF_DAY, () => fetchRoute(callsign)) : Promise.resolve(null),
        hex ? cached(`aircraft:v2:${hex}`, WEEK, () => fetchAircraft(hex)) : Promise.resolve(null),
    ]);
    return { route, aircraft };
}

export interface AirportWeather {
    raw: string;
    observedAt: string | null;
    tempC: number | null;
    dewpointC: number | null;
    windDir: number | string | null;
    windKt: number | null;
    gustKt: number | null;
    visibility: string | number | null;
    pressureHpa: number | null;
    category: string | null;
    clouds: { cover: string; base: number | null }[];
}

/** Latest METAR for an airport (ICAO code). Cached 10 minutes. */
export async function getAirportWeather(icao: string): Promise<AirportWeather | null> {
    return cached(`metar:${icao}`, 10 * 60 * 1000, async () => {
        try {
            const list = await getJson<any[]>(`${AVWX}/metar?ids=${icao}&format=json`);
            const m = Array.isArray(list) ? list[0] : null;
            if (!m) return null;
            return {
                raw: m.rawOb ?? '',
                observedAt: m.reportTime ?? null,
                tempC: num(m.temp),
                dewpointC: num(m.dewp),
                windDir: m.wdir ?? null,
                windKt: num(m.wspd),
                gustKt: num(m.wgst),
                visibility: m.visib ?? null,
                pressureHpa: num(m.altim),
                category: m.fltCat ?? null,
                clouds: Array.isArray(m.clouds) ? m.clouds.map((c: any) => ({ cover: String(c.cover), base: num(c.base) })) : [],
            };
        } catch {
            return null;
        }
    });
}
