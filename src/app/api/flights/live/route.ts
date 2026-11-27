/**
 * GET /api/flights/live?lat=51.5&lon=-0.1&r=150
 *
 * Live aircraft within `r` nautical miles (max 250) of a point, from adsb.lol.
 * The client snaps lat/lon/r to a coarse grid so nearby viewers share one CDN entry.
 */
import { NextResponse } from 'next/server';
import { getAircraftNear, MAX_RADIUS_NM } from '@/lib/flights';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get('lat'));
    const lon = Number(url.searchParams.get('lon'));
    const r = Number(url.searchParams.get('r') || MAX_RADIUS_NM);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !Number.isFinite(r)) {
        return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
    }

    try {
        const aircraft = await getAircraftNear(lat, lon, r);
        return NextResponse.json(
            { aircraft, fetchedAt: Date.now() },
            { headers: { 'Cache-Control': 'public, max-age=5, s-maxage=8, stale-while-revalidate=10' } },
        );
    } catch (err) {
        console.warn('[flights/live] upstream failed:', err);
        return NextResponse.json({ error: 'Live flight data is temporarily unavailable' }, { status: 502 });
    }
}
