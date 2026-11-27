/**
 * GET /api/flights/airport?icao=EGLL&lat=51.47&lon=-0.46
 *
 * Live airport snapshot: current weather (METAR) plus aircraft arriving, departing
 * and on the ground nearby, derived from live ADS-B positions.
 */
import { NextResponse } from 'next/server';
import { ICAO_RE, getAircraftNear, getAirportWeather, type LiveAircraft } from '@/lib/flights';

const NM_PER_RAD = 3440.065;

function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * NM_PER_RAD * Math.asin(Math.sqrt(a));
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const icao = (url.searchParams.get('icao') || '').trim().toUpperCase();
    const lat = Number(url.searchParams.get('lat'));
    const lon = Number(url.searchParams.get('lon'));

    if (!ICAO_RE.test(icao) || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return NextResponse.json({ error: 'Invalid airport' }, { status: 400 });
    }

    const [weather, nearby] = await Promise.all([
        icao.length === 4 ? getAirportWeather(icao) : Promise.resolve(null),
        getAircraftNear(lat, lon, 30).catch(err => {
            console.warn('[flights/airport] live traffic failed:', err instanceof Error ? err.message : err);
            return null;
        }),
    ]);

    let traffic: { arriving: LiveAircraft[]; departing: LiveAircraft[]; onGround: number; total: number } | null = null;
    if (nearby) {
        const arriving: LiveAircraft[] = [];
        const departing: LiveAircraft[] = [];
        let onGround = 0;
        for (const ac of nearby) {
            const d = distanceNm(lat, lon, ac.lat, ac.lon);
            if (ac.ground) {
                if (d < 4) onGround++;
                continue;
            }
            if (ac.alt === null || ac.alt > 12000 || ac.vrate === null) continue;
            if (ac.vrate <= -300) arriving.push(ac);
            else if (ac.vrate >= 300 && d < 25) departing.push(ac);
        }
        const byAlt = (a: LiveAircraft, b: LiveAircraft) => (a.alt ?? 0) - (b.alt ?? 0);
        traffic = {
            arriving: arriving.sort(byAlt).slice(0, 12),
            departing: departing.sort(byAlt).slice(0, 12),
            onGround,
            total: nearby.length,
        };
    }

    return NextResponse.json(
        { weather, traffic },
        { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=20, stale-while-revalidate=30' } },
    );
}
