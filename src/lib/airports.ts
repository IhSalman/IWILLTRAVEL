/**
 * Server-side airport lookups over the bundled OurAirports dataset
 * (public/data/airports.json, built by `npm run build:airports`).
 *
 * Replaces the Amadeus self-service location API, which was shut down on 17 July 2026.
 * Do not import this from client components: the browser fetches /data/airports.json instead.
 */
import rows from '../../public/data/airports.json';

export interface Airport {
    iata: string;
    icao: string;
    name: string;
    city: string;
    country: string; // ISO 3166-1 alpha-2
    lat: number;
    lon: number;
    size: 1 | 2; // 1 = large, 2 = medium
}

type Row = [string, string, string, string, string, number, number, number];

let list: Airport[] | null = null;
let byIata: Map<string, Airport> | null = null;
let byIcao: Map<string, Airport> | null = null;

function load() {
    if (list) return;
    list = (rows as unknown as Row[]).map(([iata, icao, name, city, country, lat, lon, size]) => ({
        iata, icao, name, city, country, lat, lon, size: size === 1 ? 1 : 2,
    }));
    byIata = new Map(list.map(a => [a.iata, a]));
    byIcao = new Map(list.filter(a => a.icao).map(a => [a.icao, a]));
}

export function allAirports(): Airport[] {
    load();
    return list!;
}

/** Look up by IATA (3 letters) or ICAO (4 letters) code. */
export function getAirport(code: string): Airport | null {
    load();
    const c = code.trim().toUpperCase();
    return (c.length === 3 ? byIata!.get(c) : byIcao!.get(c)) ?? null;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Airports serving a city, biggest first ("Paris" → CDG, ORY, BVA). */
export function airportsForCity(city: string): Airport[] {
    load();
    const q = normalize(city.split(',')[0]);
    if (!q) return [];
    const exact = list!.filter(a => normalize(a.city.replace(/\s*\(.*\)/, '')) === q);
    const matches = exact.length > 0 ? exact : list!.filter(a => normalize(a.city).startsWith(q));
    return matches.sort((a, b) => a.size - b.size);
}

/** Best single IATA airport code for a free-text city or code. */
export function cityToIata(input: string): string | null {
    const trimmed = input.trim();
    if (/^[A-Za-z]{3}$/.test(trimmed) && getAirport(trimmed)) return trimmed.toUpperCase();
    return airportsForCity(trimmed)[0]?.iata ?? null;
}

/** Simple text search over code, city and name (for search boxes and AI tools). */
export function searchAirports(query: string, limit = 8): Airport[] {
    load();
    const q = normalize(query);
    if (q.length < 2) return [];
    const exact = list!.filter(a => a.iata.toLowerCase() === q || a.icao.toLowerCase() === q);
    const rest = list!.filter(a => !exact.includes(a) && (normalize(a.city).startsWith(q) || normalize(a.name).includes(q)));
    return [...exact, ...rest.sort((a, b) => a.size - b.size)].slice(0, limit);
}
