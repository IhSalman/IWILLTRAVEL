/**
 * GET /api/flights/search?q=BAW123
 *
 * Finds airborne aircraft anywhere in the world by callsign, registration (G-XLEA) or ICAO hex.
 */
import { NextResponse } from 'next/server';
import { searchAircraft } from '@/lib/flights';

export async function GET(req: Request) {
    const q = (new URL(req.url).searchParams.get('q') || '').slice(0, 16);
    if (q.trim().length < 2) return NextResponse.json({ aircraft: [] });

    try {
        const aircraft = await searchAircraft(q);
        return NextResponse.json(
            { aircraft: aircraft.slice(0, 10) },
            { headers: { 'Cache-Control': 'public, max-age=5, s-maxage=10' } },
        );
    } catch (err) {
        console.warn('[flights/search] failed:', err);
        return NextResponse.json({ error: 'Search is temporarily unavailable' }, { status: 502 });
    }
}
