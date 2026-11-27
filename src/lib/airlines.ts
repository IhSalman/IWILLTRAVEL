/**
 * Airline code helpers: the flight number on a ticket (BA123, IATA) vs the callsign
 * aircraft broadcast over ADS-B (BAW123, ICAO).
 *
 * Note: many airlines fly "alphanumeric" callsigns that don't match the ticket number
 * (Ryanair FR1234 may fly as RYR4QX). Those can only be resolved with a flight-status
 * provider (see src/lib/flight-status), so these helpers return best-effort candidates.
 *
 * Data: src/data/airlines.json (OpenFlights, ODbL; rebuild with `npm run build:airlines`),
 * with adsbdb as a runtime fallback for codes missing there.
 */
import table from '@/data/airlines.json';
import { cached } from '@/utils/cache';

type Entry = [icao: string, name: string, country: string];
const byIata = table as unknown as Record<string, Entry[]>;

let byIcao: Map<string, { iata: string; name: string; country: string }> | null = null;
function icaoIndex() {
    if (!byIcao) {
        byIcao = new Map();
        for (const [iata, list] of Object.entries(byIata)) {
            for (const [icao, name, country] of list) {
                if (!byIcao.has(icao)) byIcao.set(icao, { iata, name, country });
            }
        }
    }
    return byIcao;
}

export interface ParsedFlightNumber {
    /** Airline code as typed: 2-char IATA (BA) or 3-letter ICAO (BAW). */
    airline: string;
    kind: 'iata' | 'icao';
    /** Number part without leading zeros, plus optional suffix letter(s): "123", "45A". */
    number: string;
}

/** Parse "BA 0123", "ba123", "BAW123", "U21234". Returns null when it isn't a flight number. */
export function parseFlightNumber(input: string): ParsedFlightNumber | null {
    const q = input.toUpperCase().replace(/[\s-]+/g, '');
    let m = q.match(/^([A-Z]{3})(\d{1,4}[A-Z]{0,2})$/);
    if (m && icaoIndex().has(m[1])) return { airline: m[1], kind: 'icao', number: m[2].replace(/^0+(?=\d)/, '') };
    m = q.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/);
    if (m && /[A-Z]/.test(m[1])) return { airline: m[1], kind: 'iata', number: m[2].replace(/^0+(?=\d)/, '') };
    return null;
}

/** ICAO airline codes for an IATA code (several when the code is shared, e.g. LH → DLH, GEC). */
export async function icaoCodesForIata(iata: string): Promise<string[]> {
    const local = byIata[iata]?.map(e => e[0]);
    if (local?.length) return local;
    if (!/^[A-Z0-9]{2}$/.test(iata)) return [];
    const remote = await cached(`airline-iata:${iata}`, 30 * 24 * 3600 * 1000, async () => {
        try {
            const res = await fetch(`https://api.adsbdb.com/v0/airline/${iata}`, {
                headers: { 'User-Agent': 'iWillTravel-LiveFlights/1.0' },
                signal: AbortSignal.timeout(6000),
            });
            if (!res.ok) return null;
            const json = await res.json();
            const list = Array.isArray(json.response) ? json.response : [];
            const codes = list.map((a: { icao?: string }) => a.icao).filter((c: unknown): c is string => typeof c === 'string' && /^[A-Z]{3}$/.test(c));
            return codes.length ? codes : null;
        } catch {
            return null;
        }
    });
    return remote ?? [];
}

/** Possible ADS-B callsigns for a ticket flight number: "BA123" → ["BAW123"]. */
export async function callsignsForFlightNumber(input: string): Promise<string[]> {
    const p = parseFlightNumber(input);
    if (!p) return [];
    if (p.kind === 'icao') return [`${p.airline}${p.number}`];
    const icaos = await icaoCodesForIata(p.airline);
    return icaos.map(icao => `${icao}${p.number}`);
}

/**
 * Ticket-style flight number for a callsign: "BAW123" → "BA123". Null for alphanumeric
 * callsigns ("UAE5V", "EZY45TB"): their letters don't map to the number on the ticket.
 */
export function flightNumberForCallsign(callsign: string | null | undefined): string | null {
    if (!callsign) return null;
    const m = callsign.trim().toUpperCase().match(/^([A-Z]{3})(\d{1,4})$/);
    if (!m) return null;
    const airline = icaoIndex().get(m[1]);
    if (!airline) return null;
    return `${airline.iata}${m[2].replace(/^0+(?=\d)/, '')}`;
}

// Countries whose airlines matter for EU261/UK261 (OpenFlights stores country names).
const EU_UK_COUNTRY_ISO: Record<string, string> = {
    Austria: 'AT', Belgium: 'BE', Bulgaria: 'BG', Croatia: 'HR', Cyprus: 'CY', 'Czech Republic': 'CZ', Czechia: 'CZ',
    Denmark: 'DK', Estonia: 'EE', Finland: 'FI', France: 'FR', Germany: 'DE', Greece: 'GR', Hungary: 'HU', Ireland: 'IE',
    Italy: 'IT', Latvia: 'LV', Lithuania: 'LT', Luxembourg: 'LU', Malta: 'MT', Netherlands: 'NL', Poland: 'PL',
    Portugal: 'PT', Romania: 'RO', Slovakia: 'SK', Slovenia: 'SI', Spain: 'ES', Sweden: 'SE', Iceland: 'IS',
    Liechtenstein: 'LI', Norway: 'NO', Switzerland: 'CH', 'United Kingdom': 'GB',
};

/**
 * ISO country of an airline's licence, for EU/EEA/CH/UK airlines only (null otherwise,
 * which is all EU261/UK261 need to know).
 */
export function airlineEuUkCountry(code: string | null | undefined): string | null {
    if (!code) return null;
    const c = code.toUpperCase();
    const country = c.length === 3 ? icaoIndex().get(c)?.country : byIata[c]?.[0]?.[2];
    return country ? EU_UK_COUNTRY_ISO[country] ?? null : null;
}

/** Airline name for an ICAO or IATA code, when known locally. */
export function airlineName(code: string): string | null {
    const c = code.toUpperCase();
    if (c.length === 3) return icaoIndex().get(c)?.name ?? null;
    return byIata[c]?.[0]?.[1] ?? null;
}
