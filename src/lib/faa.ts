/**
 * US airport delays from the FAA National Airspace System status feed (free, public domain).
 * https://nasstatus.faa.gov/api/airport-status-information (XML)
 *
 * Covers ground stops, ground delay programmes and general arrival/departure delays.
 * Airport closures are skipped: that list is mostly NOTAMs for private aircraft.
 */
import { cached } from '@/utils/cache';

export interface FaaDelay {
    airport: string; // FAA identifier (same as IATA for commercial airports)
    kind: 'ground_stop' | 'ground_delay' | 'arrival_delay' | 'departure_delay';
    reason: string;
    detail: string;
}

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? '';
const all = (xml: string, name: string) => Array.from(xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'g'))).map(m => m[0]);

/** Exported for tests. */
export function parseFaaStatus(xml: string): FaaDelay[] {
    const out: FaaDelay[] = [];
    for (const p of all(xml, 'Program')) {
        out.push({ airport: tag(p, 'ARPT'), kind: 'ground_stop', reason: tag(p, 'Reason'), detail: `Ground stop${tag(p, 'End_Time') ? ` until ${tag(p, 'End_Time')}` : ''}` });
    }
    for (const g of all(xml, 'Ground_Delay')) {
        out.push({ airport: tag(g, 'ARPT'), kind: 'ground_delay', reason: tag(g, 'Reason'), detail: `Departures delayed by an average of ${tag(g, 'Avg')}${tag(g, 'Max') ? ` (up to ${tag(g, 'Max')})` : ''}` });
    }
    for (const d of all(xml, 'Delay')) {
        const airport = tag(d, 'ARPT');
        if (!airport) continue;
        for (const ad of all(d, 'Arrival_Departure')) {
            const type = ad.match(/Type="(\w+)"/)?.[1]?.toLowerCase() === 'departure' ? 'departure_delay' : 'arrival_delay';
            const trend = tag(ad, 'Trend');
            out.push({
                airport,
                kind: type,
                reason: tag(d, 'Reason'),
                detail: `${type === 'departure_delay' ? 'Departures' : 'Arrivals'} delayed ${tag(ad, 'Min')}–${tag(ad, 'Max')}${trend ? ` (${trend.toLowerCase()})` : ''}`,
            });
        }
    }
    return out.filter(d => /^[A-Z0-9]{3}$/.test(d.airport));
}

/** All current FAA delays (cached 5 minutes). Empty on any error. */
export async function getFaaDelays(): Promise<FaaDelay[]> {
    const list = await cached('faa:nas-status', 5 * 60_000, async () => {
        try {
            const res = await fetch('https://nasstatus.faa.gov/api/airport-status-information', {
                headers: { 'User-Agent': 'iWillTravel/1.0', Accept: 'application/xml' },
                signal: AbortSignal.timeout(8000),
                cache: 'no-store',
            });
            if (!res.ok) return null;
            const parsed = parseFaaStatus(await res.text());
            // Cache "no delays" too, as a non-empty marker list.
            return parsed.length ? parsed : [{ airport: '---', kind: 'arrival_delay', reason: '', detail: '' } as FaaDelay];
        } catch {
            return null;
        }
    });
    return (list ?? []).filter(d => d.airport !== '---');
}

export async function getFaaDelaysFor(iata: string): Promise<FaaDelay[]> {
    const code = iata.toUpperCase();
    return (await getFaaDelays()).filter(d => d.airport === code);
}
